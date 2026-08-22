import { isGeneratedItinerary, type GeneratedItinerary } from "~/types/itinerary";
import { assertTravelPromptAllowed } from "~/server/utils/ai-gatekeeper";
import { logAiUsage } from "~/server/utils/ai-usage";

type DiscussionMessage = { role: "user" | "assistant"; content: string };
type PlanBody = { messages?: unknown; itinerary?: unknown; workspaceCode?: unknown };

const MAX_CONTEXT_MESSAGES = 5;
const itinerarySchema = `{"title":"string","destination":"string","dates":"string","events":[{"day":0,"time":"09:00","title":"string","place":"string","tag":"Food|Explore|Transit|Culture","coords":[0,0],"recommendations":["string"],"food":["string"],"todos":[{"text":"string","assignee":"optional initials","completed":false}]}]}`;

export default defineEventHandler(async (event) => {
  const body = await readBody<PlanBody>(event);
  const workspaceCode = body.workspaceCode;
  const messages = Array.isArray(body.messages)
    ? body.messages.filter(
        (message): message is DiscussionMessage =>
          ["user", "assistant"].includes(message?.role) && message?.content,
      )
    : [];
  const itinerary = body.itinerary && typeof body.itinerary === "object" ? body.itinerary : {};
  const discussion = messages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => `${message.role}: ${message.content.slice(0, 800)}`)
    .join("\n");
  if (!discussion) throw createError({ statusCode: 400, statusMessage: "Discussion is required" });

  await assertTravelPromptAllowed(
    event,
    `Trip planning change request:\n${discussion}\n\nExisting trip plan:\n${JSON.stringify(itinerary).slice(0, 7000)}`,
    workspaceCode,
  );

  const config = useRuntimeConfig(event);
  if (!config.deepseekApiKey)
    throw createError({ statusCode: 503, statusMessage: "AI provider is not configured" });

  try {
    const response = await $fetch<{
      choices?: Array<{ message?: { content?: string } }>;
      usage?: unknown;
    }>("https://api.deepseek.com/chat/completions", {
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
            content: `Analyze discussion and return only itinerary JSON. Implement requested changes as events. Existing itinerary days and dates are authoritative; use their numeric day indexes when matching requested dates or days. Do not move existing events. Return only new or changed events in events. Existing itinerary: ${JSON.stringify(itinerary).slice(0, 7000)}. Schema: ${itinerarySchema}`,
          },
          { role: "user", content: discussion },
        ],
        temperature: 0.3,
      },
    });
    logAiUsage(workspaceCode, "instructions", response.usage);
    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("DeepSeek returned empty implementation plan");
    const source = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("DeepSeek returned invalid JSON");
    const parsed = JSON.parse(source.slice(start, end + 1)) as GeneratedItinerary;
    if (!isGeneratedItinerary(parsed)) throw new Error("Invalid implementation plan");
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Implementation plan unavailable";
    console.error("Implementation plan failed", message);
    throw createError({ statusCode: 502, statusMessage: message });
  }
});
