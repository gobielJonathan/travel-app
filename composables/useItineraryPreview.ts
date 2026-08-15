import { ref } from "vue";
import type { GeneratedItinerary } from "~/types/itinerary";
import { saveItinerary } from "~/utils/itineraryStorage";

export function useItineraryPreview(
  replaceItinerary: (itinerary: GeneratedItinerary) => unknown,
  implementEvents: (events: GeneratedItinerary["events"]) => unknown,
  discussionMessages: Readonly<{ value: { role: "user" | "assistant"; content: string }[] }>,
) {
  const generatedPreview = ref<GeneratedItinerary | null>(null);
  const implementationPreview = ref<GeneratedItinerary | null>(null);
  const implementationLoading = ref(false);
  const itineraryLoading = ref(false);
  const itineraryError = ref("");
  const grouped = (itinerary: GeneratedItinerary | null) =>
    itinerary?.events.reduce<Array<{ day: number; events: GeneratedItinerary["events"] }>>(
      (groups, event) => {
        const group = groups.find((item) => item.day === event.day);
        if (group) group.events.push(event);
        else groups.push({ day: event.day, events: [event] });
        return groups;
      },
      [],
    ) ?? [];

  async function generateItinerary() {
    itineraryLoading.value = true;
    itineraryError.value = "";
    try {
      const response = await $fetch<GeneratedItinerary | { needs: string }>("/api/ai/itinerary", {
        method: "POST",
        body: { messages: discussionMessages.value },
      });
      if ("needs" in response) {
        itineraryError.value = `Before generating, tell Roam AI your ${response.needs}.`;
        return;
      }
      generatedPreview.value = response;
      await saveItinerary(response);
    } catch (error) {
      itineraryError.value =
        error instanceof Error ? error.message : "Itinerary generation unavailable";
    } finally {
      itineraryLoading.value = false;
    }
  }
  function useDiscussionPlan() {
    if (!generatedPreview.value) return;
    replaceItinerary(generatedPreview.value);
    sessionStorage.setItem("roam-discussion:used", "1");
  }
  function applyImplementationPlan() {
    if (!implementationPreview.value) return;
    implementEvents(
      implementationPreview.value.events.map((event) => ({ ...event, day: event.day - 1 })),
    );
    implementationPreview.value = null;
  }
  return {
    generatedPreview,
    implementationPreview,
    implementationLoading,
    itineraryLoading,
    itineraryError,
    previewDays: () => grouped(generatedPreview.value),
    implementationDays: () => grouped(implementationPreview.value),
    generateItinerary,
    useDiscussionPlan,
    applyImplementationPlan,
  };
}
