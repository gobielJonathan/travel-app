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

  const config = useRuntimeConfig(event);
  if (!config.deepseekApiKey) {
    throw createError({ statusCode: 503, statusMessage: "AI provider is not configured" });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is DiscussionMessage =>
            !!item &&
            typeof item === "object" &&
            ((item as DiscussionMessage).role === "user" ||
              (item as DiscussionMessage).role === "assistant") &&
            typeof (item as DiscussionMessage).content === "string",
        )
        .slice(-4)
        .map((item) => ({ ...item, content: item.content.slice(0, 800) }))
    : [];
  const context = typeof body.context === "string" ? body.context.slice(0, 3000) : "";

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
