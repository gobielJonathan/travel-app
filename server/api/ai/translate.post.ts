import { assertTravelPromptAllowed } from "~/server/utils/ai-gatekeeper";
import { logAiUsage } from "~/server/utils/ai-usage";

type TranslationBody = {
  items?: unknown;
  sourceLanguage?: unknown;
  targetLanguage?: unknown;
  workspaceCode?: unknown;
};

type TranslationResponse = {
  translations?: Record<string, string>;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<TranslationBody>(event);
  const workspaceCode = body.workspaceCode;
  const items = Array.isArray(body.items)
    ? [
        ...new Set(
          body.items
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ].slice(0, 50)
    : [];
  const sourceLanguage =
    typeof body.sourceLanguage === "string" ? body.sourceLanguage.slice(0, 40) : "auto";
  const targetLanguage =
    typeof body.targetLanguage === "string" ? body.targetLanguage.slice(0, 40) : "English";
  if (!items.length || items.some((item) => item.length > 160))
    throw createError({ statusCode: 400, statusMessage: "Invalid translation items" });

  await assertTravelPromptAllowed(
    event,
    `Travel receipt translation request:\n${JSON.stringify({
      sourceLanguage,
      targetLanguage,
      items,
    })}`,
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
            content: `Translate receipt item names from ${sourceLanguage} to ${targetLanguage}. Return JSON only with object translations mapping every original string to its translation. Preserve brands and names.`,
          },
          { role: "user", content: JSON.stringify(items) },
        ],
        temperature: 0,
        max_tokens: Math.min(1200, Math.max(200, items.length * 30)),
      },
    });
    logAiUsage(workspaceCode, "translation", response.usage);
    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty translation response");
    const parsed = JSON.parse(
      content.replace(/^```json\s*/i, "").replace(/\s*```$/, ""),
    ) as TranslationResponse;
    const translations = Object.fromEntries(
      items.map((item) => [
        item,
        typeof parsed.translations?.[item] === "string" ? parsed.translations[item].trim() : item,
      ]),
    );
    return { translations };
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Translation unavailable" });
  }
});
