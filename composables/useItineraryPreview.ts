import { ref } from "vue";
import type { GeneratedItinerary } from "~/types/itinerary";
import { saveItinerary } from "~/utils/itineraryStorage";

const monthNames =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

function parseStartDate(value: string) {
  const year = Number(value.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? new Date().getFullYear());
  const isoDate = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  const monthFirst = value.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})\\b`, "i"));
  if (monthFirst) {
    const month = new Date(`${monthFirst[1]} 1, 2024`).getMonth();
    return new Date(year, month, Number(monthFirst[2]));
  }
  const dayFirst = value.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\b`, "i"));
  if (dayFirst) {
    const month = new Date(`${dayFirst[2]} 1, 2024`).getMonth();
    return new Date(year, month, Number(dayFirst[1]));
  }
  const numericDate = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  return numericDate
    ? new Date(Number(numericDate[3]), Number(numericDate[1]) - 1, Number(numericDate[2]))
    : undefined;
}

function previewDate(itinerary: GeneratedItinerary, day: number) {
  const startDate = parseStartDate(itinerary.dates);
  if (!startDate) return itinerary.dates;
  const date = new Date(startDate);
  date.setDate(startDate.getDate() + day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function useItineraryPreview(
  replaceItinerary: (itinerary: GeneratedItinerary) => unknown,
  implementEvents: (events: GeneratedItinerary["events"]) => unknown,
  discussionMessages: Readonly<{ value: { role: "user" | "assistant"; content: string }[] }>,
) {
  const { inviteCode } = useInvite();
  const generatedPreview = ref<GeneratedItinerary | null>(null);
  const implementationPreview = ref<GeneratedItinerary | null>(null);
  const implementationLoading = ref(false);
  const itineraryLoading = ref(false);
  const itineraryError = ref("");
  const grouped = (itinerary: GeneratedItinerary | null) =>
    itinerary?.events.reduce<
      Array<{ day: number; date: string; events: GeneratedItinerary["events"] }>
    >((groups, event) => {
      const group = groups.find((item) => item.day === event.day);
      if (group) group.events.push(event);
      else
        groups.push({ day: event.day, date: previewDate(itinerary, event.day), events: [event] });
      return groups;
    }, []) ?? [];

  async function generateItinerary() {
    itineraryLoading.value = true;
    itineraryError.value = "";
    try {
      const response = await $fetch<GeneratedItinerary | { needs: string }>("/api/ai/itinerary", {
        method: "POST",
        body: { messages: discussionMessages.value, workspaceCode: inviteCode.value },
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
    if (!implementationPreview.value) return false;
    implementEvents(implementationPreview.value.events);
    implementationPreview.value = null;
    return true;
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
