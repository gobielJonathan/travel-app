import { isGeneratedItinerary, type GeneratedItinerary } from "~/types/itinerary";
import { assertTravelPromptAllowed } from "~/server/utils/ai-gatekeeper";
import { logAiUsage } from "~/server/utils/ai-usage";

type DiscussionMessage = { role: "user" | "assistant"; content: string };

type ItineraryBody = { messages?: unknown; workspaceCode?: unknown };

const MAX_CONTEXT_MESSAGES = 5;
const compactItinerarySchema = `{"t":"string","d":"string","dt":"string","e":[{"d":0,"tm":"09:00","n":"string","p":"string","g":"Food|Explore|Transit|Culture","c":[0,0],"r":["string"],"f":["string"],"o":[{"x":"string","a":"optional initials","v":false}]}]}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function expandCompactItinerary(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.e)) return value;
  return {
    title: value.t,
    destination: value.d,
    dates: value.dt,
    events: value.e.map((event) => {
      if (!isRecord(event)) return event;
      return {
        day: event.d,
        time: event.tm,
        title: event.n,
        place: event.p,
        tag: event.g,
        coords: event.c,
        recommendations: event.r,
        food: event.f,
        todos: Array.isArray(event.o)
          ? event.o.map((todo) => {
              if (!isRecord(todo)) return todo;
              return {
                text: todo.x,
                assignee: todo.a,
                completed: todo.v,
              };
            })
          : event.o,
      };
    }),
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ItineraryBody>(event);
  const workspaceCode = body.workspaceCode;
  const messages = Array.isArray(body.messages)
    ? body.messages.filter(
        (message): message is DiscussionMessage =>
          ["user", "assistant"].includes(message?.role) && message?.content,
      )
    : [];
  const discussion = messages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => `${message.role}: ${message.content.slice(0, 800)}`)
    .join("\n");
  if (!discussion) throw createError({ statusCode: 400, statusMessage: "Discussion is required" });

  await assertTravelPromptAllowed(event, `Trip planning discussion:\n${discussion}`, workspaceCode);

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
            content: `Analyze the entire discussion before deciding anything is missing. Infer destination and dates from natural language, relative dates, ranges, durations, and assistant confirmations. Resolve references such as "there", "next weekend", and "four days" using prior messages. Create itinerary JSON only. Return {"needs":"destination"} or {"needs":"dates"} only when analysis cannot infer that field. Use this compact schema: ${compactItinerarySchema}. Keys are t=title, d=destination/day, dt=dates, e=events, tm=time, n=name/title, p=place, g=tag, c=coordinates, r=recommendations, f=nearby food, o=todos, x=todo text, a=assignee, v=completed. Keep recommendations, food, and todos useful but concise: prefer 1-2 actionable items per list, short phrases, and no repeated context. Output minified JSON with no markdown or extra prose.`,
          },
          { role: "user", content: discussion },
        ],
        temperature: 0.4,
      },
    });
    logAiUsage(workspaceCode, "instructions", response.usage);
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
    const parsed = expandCompactItinerary(JSON.parse(fencedContent.slice(start, end + 1))) as
      | (GeneratedItinerary & {
          needs?: string;
        })
      | { needs?: string };
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
