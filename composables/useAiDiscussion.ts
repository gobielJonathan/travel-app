import { ref } from "vue";

type Message = { role: "user" | "assistant"; content: string };

type DiscussionOptions = {
  context?: () => string;
  cacheKey?: string;
};

const MAX_HISTORY_MESSAGES = 4;
const MAX_MESSAGE_LENGTH = 800;

export function useAiDiscussion(options: DiscussionOptions = {}) {
  const storageKey = `roam-discussion:${options.cacheKey ?? "default"}`;
  const messages = ref<Message[]>(
    import.meta.client ? JSON.parse(sessionStorage.getItem(storageKey) ?? "[]") : [],
  );

  watch(
    messages,
    (value) => {
      if (import.meta.client) sessionStorage.setItem(storageKey, JSON.stringify(value));
    },
    { deep: true },
  );
  const loading = ref(false);
  const error = ref("");

  async function ask(message: string) {
    const prompt = message.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!prompt || loading.value) return;
    error.value = "";
    const context = options.context?.()?.slice(0, 3000) ?? "";
    const history = messages.value.slice(-MAX_HISTORY_MESSAGES);
    const cacheKey = `roam-ai:${options.cacheKey ?? context}:${prompt}`;
    const cached = import.meta.client ? sessionStorage.getItem(cacheKey) : null;
    messages.value.push({ role: "user", content: prompt });
    if (cached) {
      messages.value.push({ role: "assistant", content: cached });
      return;
    }
    loading.value = true;
    try {
      const response = await $fetch<{ reply: string }>("/api/ai/discussion", {
        method: "POST",
        body: { message: prompt, context, history },
      });
      messages.value.push({ role: "assistant", content: response.reply });
      if (import.meta.client) sessionStorage.setItem(cacheKey, response.reply);
    } catch (requestError) {
      messages.value.pop();
      error.value =
        requestError instanceof Error ? requestError.message : "AI discussion unavailable";
    } finally {
      loading.value = false;
    }
  }

  return { messages, loading, error, ask };
}
