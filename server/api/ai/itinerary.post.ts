import { isGeneratedItinerary, type GeneratedItinerary } from "~/types/itinerary";
import { assertTravelPromptAllowed } from "~/server/utils/ai-gatekeeper";

type DiscussionMessage = { role: "user" | "assistant"; content: string };

type ItineraryBody = { messages?: unknown };

const itinerarySchema = `{"title":"string","destination":"string","dates":"string","events":[{"day":0,"time":"09:00","title":"string","place":"string","tag":"Food|Explore|Transit|Culture","coords":[0,0],"recommendations":["string"],"food":["string"],"todos":[{"text":"string","assignee":"optional initials","completed":false}]}]}`;

export default defineEventHandler(async (event) => {
  const body = await readBody<ItineraryBody>(event);
  const messages = Array.isArray(body.messages)
    ? body.messages.filter(
        (message): message is DiscussionMessage =>
          !!message &&
          typeof message === "object" &&
          ((message as DiscussionMessage).role === "user" ||
            (message as DiscussionMessage).role === "assistant") &&
          typeof (message as DiscussionMessage).content === "string",
      )
    : [];
  const discussion = messages
    .slice(-12)
    .map((message) => `${message.role}: ${message.content.slice(0, 800)}`)
    .join("\n");
  if (!discussion) throw createError({ statusCode: 400, statusMessage: "Discussion is required" });

  await assertTravelPromptAllowed(event, `Trip planning discussion:\n${discussion}`);

  const config = useRuntimeConfig(event);
  if (!config.deepseekApiKey)
    throw createError({ statusCode: 503, statusMessage: "AI provider is not configured" });

  try {
    const response = await $fetch<{ choices?: Array<{ message?: { content?: string } }> }>(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        body: {
          model: config.deepseekModel || "deepseek-chat",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Analyze the entire discussion before deciding anything is missing. Infer destination and dates from natural language, relative dates, ranges, durations, and assistant confirmations. Resolve references such as "there", "next weekend", and "four days" using prior messages. Create itinerary JSON only. Return {"needs":"destination"} or {"needs":"dates"} only when analysis cannot infer that field. Schema: ${itinerarySchema}. Generate practical events with recommendations, nearby food, and preparation/group todos.`,
            },
            { role: "user", content: discussion },
          ],
          temperature: 0.4,
        },
      },
    );
    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("DeepSeek returned empty itinerary content");
    const source = content ?? "";
    const fencedContent = source
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const start = fencedContent.indexOf("{");
    const end = fencedContent.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("DeepSeek returned non-JSON itinerary content");
    const parsed = JSON.parse(fencedContent.slice(start, end + 1)) as GeneratedItinerary & {
      needs?: string;
    };
    if (parsed.needs) return { needs: parsed.needs };
    if (!isGeneratedItinerary(parsed)) throw new Error("Invalid itinerary response");
    return parsed;
  } catch (error) {
    const providerError = error as { status?: number; data?: { error?: { message?: string } } };
    console.error("Itinerary generation failed", {
      status: providerError.status,
      message:
        providerError.data?.error?.message ??
        (error instanceof Error ? error.message : "Unknown error"),
    });
    throw createError({
      statusCode: providerError.status === 401 ? 503 : 502,
      statusMessage:
        providerError.status === 401
          ? "AI provider rejected the API key"
          : "Itinerary generation unavailable",
    });
  }
});
