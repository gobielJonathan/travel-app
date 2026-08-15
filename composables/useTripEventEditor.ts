import { ref } from "vue";
import type { TripEvent } from "~/types/trip";

export function useTripEventEditor(
  days: Readonly<{ value: { date: string; month: string }[] }>,
  updateEvent: (id: string, changes: Pick<TripEvent, "day" | "time" | "notes">) => unknown,
  deleteEvent: (id: string) => unknown,
) {
  const selectedEvent = ref<TripEvent | null>(null);
  const draftEventDateTime = ref("");
  const draftEventNotes = ref("");
  const editingTitle = ref(false);
  const draftTitle = ref("");
  const eventDateTime = (event: TripEvent) => {
    const day = days.value[event.day] ?? days.value[0];
    if (!day) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T${event.time}`;
    }
    const month = new Date(`${day.month} 1, 2024`).getMonth() + 1;
    return `2024-${String(month).padStart(2, "0")}-${day.date.padStart(2, "0")}T${event.time}`;
  };
  function selectEvent(event: TripEvent) {
    selectedEvent.value = event;
    draftEventDateTime.value = eventDateTime(event);
    draftEventNotes.value = event.notes ?? "";
  }
  function saveEventDetails() {
    if (!selectedEvent.value || !draftEventDateTime.value) return;
    const dateTime = new Date(draftEventDateTime.value);
    if (Number.isNaN(dateTime.getTime())) return;
    const day = days.value.findIndex(
      (item) =>
        item.date === String(dateTime.getDate()) &&
        item.month === dateTime.toLocaleDateString("en-US", { month: "short" }),
    );
    if (day < 0) return;
    updateEvent(selectedEvent.value.id, {
      day,
      time: draftEventDateTime.value.slice(11, 16),
      notes: draftEventNotes.value,
    });
    selectedEvent.value = null;
  }
  function removeEvent(id: string) {
    deleteEvent(id);
    if (selectedEvent.value?.id === id) selectedEvent.value = null;
  }
  return {
    selectedEvent,
    draftEventDateTime,
    draftEventNotes,
    editingTitle,
    draftTitle,
    selectEvent,
    saveEventDetails,
    removeEvent,
  };
}
