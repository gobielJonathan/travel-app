import { ref } from "vue";
import type { GeneratedItinerary } from "~/types/itinerary";

export function useTripAssistant(
  context: () => string,
  itinerary: () => { title: string; days: unknown[]; events: unknown[] },
  onImplemented: (preview: GeneratedItinerary) => void,
) {
  const assistantNote = ref("");
  const implementationLoading = ref(false);
  const { messages, loading, error, ask } = useAiDiscussion({ context });
  function sendMessage() {
    const prompt = assistantNote.value.trim();
    if (!prompt) return;
    void ask(prompt);
    assistantNote.value = "";
  }
  async function implementPlan() {
    if (implementationLoading.value || !messages.value.some((message) => message.role === "user"))
      return;
    implementationLoading.value = true;
    error.value = "";
    try {
      const preview = await $fetch<GeneratedItinerary>("/api/ai/implement", {
        method: "POST",
        body: { messages: messages.value, itinerary: itinerary() },
      });
      onImplemented(preview);
    } catch (requestError) {
      error.value =
        requestError instanceof Error ? requestError.message : "Plan implementation unavailable";
    } finally {
      implementationLoading.value = false;
    }
  }
  return {
    assistantNote,
    messages,
    loading,
    error,
    implementationLoading,
    sendMessage,
    implementPlan,
  };
}
