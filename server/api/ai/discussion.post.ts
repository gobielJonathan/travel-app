import { assertTravelPromptAllowed } from "~/server/utils/ai-gatekeeper";

type DiscussionMessage = { role: "user" | "assistant"; content: string };

type DiscussionBody = {
  message?: unknown;
  context?: unknown;
  history?: unknown;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<DiscussionBody>(event);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 4000) {
    throw createError({ statusCode: 400, statusMessage: "message must contain 1–4000 characters" });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter((item: DiscussionMessage | undefined): item is DiscussionMessage => {
          if (!item) return false;
          return ["user", "assistant"].includes(item.role) && !!item.content;
        })
        .slice(-4)
        .map((item) => ({ ...item, content: item.content.slice(0, 800) }))
    : [];
  const context = typeof body.context === "string" ? body.context.slice(0, 3000) : "";

  await assertTravelPromptAllowed(
    event,
    [
      `Current request:\n${message}`,
      context ? `Trip context:\n${context}` : "",
      history.length
        ? `Conversation history:\n${history.map((item) => `${item.role}: ${item.content}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  const config = useRuntimeConfig(event);
  if (!config.deepseekApiKey) {
    throw createError({ statusCode: 503, statusMessage: "AI provider is not configured" });
  }

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
          messages: [
            {
              role: "system",
              content:
                "You are Roam AI, a concise travel planning assistant. Give practical, specific suggestions. Keep replies under 120 words. Only discuss travel and trip planning.",
            },
            ...(context ? [{ role: "user" as const, content: `Trip context:\n${context}` }] : []),
            ...history.slice(-10),
            { role: "user" as const, content: message },
          ],
          temperature: 0.5,
        },
      },
    );
    const reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty AI response");
    return { reply };
  } catch (error) {
    console.error("AI discussion request failed", error);
    throw createError({ statusCode: 502, statusMessage: "AI discussion unavailable" });
  }
});
