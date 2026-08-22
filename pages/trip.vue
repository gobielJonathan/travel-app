<script setup lang="ts">
import type { TripEvent, TripSnapshot } from "~/types/trip";
import { useTripAssistant } from "~/composables/useTripAssistant";
import { useItineraryPreview } from "~/composables/useItineraryPreview";
import {
  clearItinerary,
  clearTripSnapshot,
  getTripStorageKeys,
  loadItinerary,
  loadTripSnapshot,
} from "~/utils/itineraryStorage";
import { useTripSync } from "~/composables/useTripSync";
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
  snapshot,
  peerId,
  applySnapshot,
  subscribeToChanges,
  markSynced,
} = useTrip();
const route = useRoute();
const { inviteCode, role } = useInvite();
const tripSync = useTripSync(inviteCode, role, peerId);
let stopListening: () => void = () => undefined;
const syncStatus = computed(() => {
  if (tripSync.status.value === "waiting") return "Waiting for host";
  if (tripSync.status.value === "syncing") return "Syncing trip";
  if (tripSync.status.value === "connected") return "Online";
  if (tripSync.status.value === "error") return "Sync unavailable";
  return "Connecting";
});
const crew = computed(() => [
  ...baseCrew,
  ...tripSync.members.value.map((member, index) => ({
    initials: member.peerId.slice(0, 2).toUpperCase(),
    name: `Traveler ${index + 1}`,
    role: "Joined traveler",
    tone: ["coral", "blue", "gold", "mint"][index % 4],
    online: member.online,
  })),
]);
function updateEvent(id: string, changes: Pick<TripEvent, "day" | "time" | "notes">) {
  const updated = updateTripEvent(id, changes);
  return updated;
}

onMounted(() => {
  const storageKeys = getTripStorageKeys(inviteCode.value);
  void Promise.all([loadTripSnapshot(inviteCode.value), loadItinerary()]).then(
    ([savedSnapshot, saved]) => {
      if (!localStorage.getItem(storageKeys.state)) {
        if (savedSnapshot) applySnapshot(savedSnapshot);
        else if (saved) {
          replaceItinerary(saved);
          if (
            route.query.preview === "1" &&
            sessionStorage.getItem("roam-discussion:used") !== "1"
          ) {
            generatedPreview.value = saved;
            discussionPreview.value = true;
          }
        }
      }
      stopListening = subscribeToChanges((nextSnapshot) => {
        tripSync.publish(nextSnapshot);
        markSynced();
      });
      tripSync.connect(() => snapshot.value, applySyncSnapshot);
    },
  );
});
onBeforeUnmount(() => stopListening());

function applySyncSnapshot(nextSnapshot: TripSnapshot) {
  applySnapshot(nextSnapshot);
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
    JSON.stringify({
      title: title.value,
      events: events.value.map(({ day, time, title: eventTitle, place }) => ({
        day,
        time,
        title: eventTitle,
        place,
      })),
    }),
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
  () => tripSync.bootstrapped.value,
);
const {
  assistantNote,
  messages: assistantMessages,
  loading: assistantLoading,
  error: assistantError,
  implementationLoading: assistantImplementationLoading,
  sendMessage: sendAssistantMessage,
  implementPlan: implementAssistantPlan,
  clearHistory: clearAssistantHistory,
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
function applyAssistantPlan() {
  if (applyImplementationPlan()) clearAssistantHistory();
}
async function finishTrip() {
  await clearItinerary();
  await clearTripSnapshot(inviteCode.value);
  const storageKeys = getTripStorageKeys(inviteCode.value);
  localStorage.removeItem(storageKeys.state);
  localStorage.removeItem(storageKeys.title);
  localStorage.removeItem(storageKeys.deletedEventIds);
  sessionStorage.removeItem("roam-discussion:default");
  sessionStorage.removeItem("roam-discussion:used");
  await navigateTo("/", { replace: true });
}

function scanReceipt() {
  void navigateTo("/split-bill");
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
      :role="role"
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
        :sync-status="syncStatus"
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
      @close="selectedEvent = null"
      @update:date-time="draftEventDateTime = $event"
      @update:notes="draftEventNotes = $event"
      @save="saveEventDetails"
      @scan="scanReceipt"
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
      @apply="applyAssistantPlan"
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
      :can-implement="tripSync.bootstrapped.value"
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

<style scoped src="~/assets/styles/pages/trip.css"></style>
