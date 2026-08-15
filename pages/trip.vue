<script setup lang="ts">
import type { TripEvent } from "~/types/trip";
import type { GeneratedItinerary } from "~/types/itinerary";
import { useTripAssistant } from "~/composables/useTripAssistant";
import { useItineraryPreview } from "~/composables/useItineraryPreview";
import { clearItinerary, loadItinerary } from "~/utils/itineraryStorage";
import { useTripSync } from "~/composables/useTripSync";
import readReceipt from "~/utils/receipt-reader";
import { useTripModals } from "~/composables/useTripModals";
import { useTripEventEditor } from "~/composables/useTripEventEditor";
import AssistantSheet from "~/components/sheets/AssistantSheet.vue";
import AddEventSheet from "~/components/sheets/AddEventSheet.vue";
import InviteSheet from "~/components/sheets/InviteSheet.vue";
import DiscussionPreviewSheet from "~/components/sheets/DiscussionPreviewSheet.vue";
import EventDetailSheet from "~/components/sheets/EventDetailSheet.vue";

definePageMeta({ middleware: "trip-plan" });
useHead({ title: "My Trip — Roam" });

const {
  title,
  activeDay,
  days,
  selectedEvents,
  events,
  budget,
  dayTitle,
  crew: baseCrew,
  synced,
  completed,
  addDay,
  addEvent,
  updateEvent: updateTripEvent,
  deleteEvent,
  replaceItinerary,
  implementEvents,
  syncWorkspace,
} = useTrip();
const route = useRoute();
const { inviteCode } = useInvite();
const tripSync = useTripSync(inviteCode);
const crew = computed(() => [
  ...baseCrew,
  ...tripSync.members.value.map((id, index) => ({
    initials: id.slice(0, 2).toUpperCase(),
    name: `Traveler ${index + 1}`,
    role: "Joined traveler",
    tone: ["coral", "blue", "gold", "mint"][index % 4],
  })),
]);
const syncSnapshot = computed(() => ({
  title: title.value,
  events: events.value.map(({ id: _id, tone: _tone, bill: _bill, ...event }) => event),
  days: days.value,
  budget: budget.value,
  completed: completed.value,
}));

function updateEvent(id: string, changes: Pick<TripEvent, "day" | "time" | "notes">) {
  const updated = updateTripEvent(id, changes);
  if (updated) tripSync.publish(syncSnapshot.value);
  return updated;
}

onMounted(() => {
  void tripSync.connect(applySyncSnapshot, applySyncSnapshot, () => syncSnapshot.value);
  void Promise.all([syncWorkspace(), loadItinerary()]).then(([, saved]) => {
    if (!saved || localStorage.getItem("roam-trip-state")) return;
    replaceItinerary(saved);
    if (route.query.preview === "1" && sessionStorage.getItem("roam-discussion:used") !== "1") {
      generatedPreview.value = saved;
      discussionPreview.value = true;
    }
  });
});

function applySyncSnapshot(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("title" in payload) || !("events" in payload))
    return;
  replaceItinerary(payload as GeneratedItinerary);
}
const { assistantOpen, discussionPreview, showAddEvent, showInvite } = useTripModals();
const discussionMessages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
const preview = useItineraryPreview(replaceItinerary, implementEvents, discussionMessages);
const {
  generatedPreview,
  implementationPreview,
  itineraryLoading,
  itineraryError,
  generateItinerary,
  useDiscussionPlan,
  applyImplementationPlan,
} = preview;

if (route.query.preview === "1") {
  discussionMessages.value = JSON.parse(sessionStorage.getItem("roam-discussion:default") ?? "[]");
  discussionPreview.value = discussionMessages.value.some((message) => message.role === "user");
}
function closeDiscussionPreview() {
  discussionPreview.value = false;
  sessionStorage.removeItem("roam-discussion:default");
}
const assistant = useTripAssistant(
  () =>
    `${title.value}; ${dayTitle.value}; ${selectedEvents.value.map((event) => `${event.time} ${event.title} at ${event.place}`).join("; ")}`,
  () => ({ title: title.value, days: days.value, events: events.value }),
  (plan) => {
    preview.implementationPreview.value = {
      ...plan,
      events: plan.events.map((event) => ({
        ...event,
        conflict: events.value.some(
          (existing) => existing.day === event.day && existing.time === event.time,
        ),
      })),
    };
    assistantOpen.value = false;
    discussionPreview.value = true;
  },
);
const {
  assistantNote,
  messages: assistantMessages,
  loading: assistantLoading,
  error: assistantError,
  implementationLoading: assistantImplementationLoading,
  sendMessage: sendAssistantMessage,
  implementPlan: implementAssistantPlan,
} = assistant;
const previewDays = computed(() => preview.previewDays());
const implementationDays = computed(() => preview.implementationDays());
const {
  selectedEvent,
  draftEventDateTime,
  draftEventNotes,
  editingTitle,
  draftTitle,
  selectEvent,
  saveEventDetails,
  removeEvent,
} = useTripEventEditor(days, updateEvent, deleteEvent);
const receiptProcessing = ref(false);
const receiptMessage = ref("");
function editTitle() {
  draftTitle.value = title.value;
  editingTitle.value = true;
}
function saveTitle() {
  title.value = draftTitle.value;
  editingTitle.value = false;
}
function cancelTitle() {
  editingTitle.value = false;
}
async function finishTrip() {
  await clearItinerary();
  localStorage.removeItem("roam-trip-state");
  localStorage.removeItem("roam-trip-title");
  localStorage.removeItem("roam-deleted-event-ids");
  sessionStorage.removeItem("roam-discussion:default");
  sessionStorage.removeItem("roam-discussion:used");
  await navigateTo("/", { replace: true });
}

function scanReceipt() {
  receiptMessage.value = "";
}
async function handleReceipt(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !selectedEvent.value) return;
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
    receiptMessage.value = "Use an image smaller than 10 MB.";
    return;
  }
  receiptProcessing.value = true;
  try {
    const items = await readReceipt(file);
    if (!items.length) {
      receiptMessage.value = "No priced items found. Try a clearer receipt.";
      return;
    }
    selectedEvent.value.bill.push(...items);
    receiptMessage.value = `${items.length} item${items.length === 1 ? "" : "s"} added.`;
  } catch {
    receiptMessage.value = "Receipt scan failed. Check image format or try another image.";
  } finally {
    receiptProcessing.value = false;
  }
}
function submitEvent(input: {
  title: string;
  place: string;
  day: number;
  time: string;
  notes: string;
  tag: string;
  coords: [number, number];
}) {
  addEvent(input);
  showAddEvent.value = false;
}
</script>
<template>
  <div class="app-shell trip-page">
    <TripPageHeader
      :title="title"
      :crew="crew"
      :editing-title="editingTitle"
      :draft-title="draftTitle"
      :completed="completed"
      @update:draft-title="draftTitle = $event"
      @edit-title="editTitle"
      @save-title="saveTitle"
      @cancel-title="cancelTitle"
      @ask-assistant="assistantOpen = true"
      @complete-trip="finishTrip"
    />
    <main>
      <TripMeta
        :days="days"
        :crew-count="crew.length"
        :title="title"
        :event-count="events.length"
      />
      <TripTimeline
        :events="selectedEvents"
        :active-day="activeDay"
        :days="days"
        :day-title="dayTitle"
        :synced="synced"
        @day="activeDay = $event"
        @select="selectEvent"
        @delete="removeEvent"
        @add="showAddEvent = true"
        @add-day="addDay"
      />
      <section class="lower-grid">
        <BudgetPanel :budget="budget" />
        <CrewList :members="crew" @invite="showInvite = true" />
      </section>
    </main>
    <EventDetailSheet
      :event="selectedEvent"
      :date-time="draftEventDateTime"
      :notes="draftEventNotes"
      :receipt-processing="receiptProcessing"
      :receipt-message="receiptMessage"
      @close="selectedEvent = null"
      @update:date-time="draftEventDateTime = $event"
      @update:notes="draftEventNotes = $event"
      @save="saveEventDetails"
      @scan="scanReceipt"
      @receipt="handleReceipt"
    />
    <DiscussionPreviewSheet
      v-model="discussionPreview"
      :generated-preview="generatedPreview"
      :implementation-preview="implementationPreview"
      :preview-days="previewDays"
      :implementation-days="implementationDays"
      :messages="discussionMessages"
      :loading="itineraryLoading"
      :error="itineraryError"
      @generate="generateItinerary"
      @use="
        useDiscussionPlan();
        closeDiscussionPreview();
      "
      @apply="applyImplementationPlan"
      @close="closeDiscussionPreview"
      @cancel="
        implementationPreview = null;
        discussionPreview = false;
      "
    />
    <AssistantSheet
      v-model="assistantOpen"
      :note="assistantNote"
      :messages="assistantMessages"
      :loading="assistantLoading"
      :error="assistantError"
      :implementation-loading="assistantImplementationLoading"
      @update:note="assistantNote = $event"
      @send="sendAssistantMessage"
      @implement="implementAssistantPlan"
      @close="assistantOpen = false"
    />
    <AddEventSheet
      v-if="showAddEvent"
      :days="days"
      :initial-day="activeDay"
      @submit="submitEvent"
      @close="showAddEvent = false"
    />
    <InviteSheet v-if="showInvite" :title="title" @close="showInvite = false" />
  </div>
</template>

<style scoped src="~/assets/styles/components/modals.css"></style>
<style scoped src="~/assets/styles/pages/trip.css"></style>
