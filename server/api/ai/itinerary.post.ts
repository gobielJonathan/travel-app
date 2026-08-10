import { isGeneratedItinerary, type GeneratedItinerary } from "~/types/itinerary";

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
    .map((message) => `${message.role}: ${message.content.slice(0, 800)}`)
    .join("\n");
  if (!discussion) throw createError({ statusCode: 400, statusMessage: "Discussion is required" });

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
          model: "deepseek-v4-flash",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Create itinerary JSON only. Require destination and dates. If missing, return {"needs":"destination or dates"}. Schema: ${itinerarySchema}. Generate practical events with recommendations, nearby food, and preparation/group todos.`,
            },
            { role: "user", content: discussion },
          ],
          temperature: 0.4,
          max_tokens: 1200,
        },
      },
    );
    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty itinerary response");
    const parsed = JSON.parse(content) as GeneratedItinerary & { needs?: string };
    if (parsed.needs) return { needs: parsed.needs };
    if (!isGeneratedItinerary(parsed)) throw new Error("Invalid itinerary response");
    return parsed;
  } catch (error) {
    console.error("Itinerary generation failed", error);
    throw createError({ statusCode: 502, statusMessage: "Itinerary generation unavailable" });
  }
});
