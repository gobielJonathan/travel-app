import { computed } from "vue";
import { crewMembers, tripDays, tripEvents } from "~/data/trip";
import type { BillItem, TripEvent } from "~/types/trip";
import { useInvite } from "~/composables/useInvite";

type SyncState = "synced" | "pending" | "conflict" | "error";

export function useTrip() {
  const state = useState("trip-state", () => ({
    title: "Los Angeles Trip",
    activeDay: 1,
    days: tripDays.map((day) => ({ ...day })),
    events: tripEvents.map((event) => ({ ...event, bill: [...event.bill] })),
    syncState: "synced" as SyncState,
    syncError: "",
    conflicts: [] as string[],
    deletedEventIds: [] as string[],
  }));
  const title = computed({
    get: () => state.value.title,
    set: (value) => {
      state.value.title = value.trim() || "Los Angeles Trip";
    },
  });
  const activeDay = computed({
    get: () => state.value.activeDay,
    set: (value) => {
      state.value.activeDay = value;
    },
  });
  const events = computed(() => state.value.events);
  const days = computed(() =>
    state.value.days.map((day, index) => ({
      ...day,
      count: events.value.filter((event) => event.day === index).length,
    })),
  );
  const selectedEvents = computed(() =>
    events.value.filter((event) => event.day === activeDay.value),
  );
  const dayTitle = computed(() => {
    const day = days.value[activeDay.value] ?? days.value[0]!;
    return `${day.label}, ${day.month} ${day.date}`;
  });

  function addDay() {
    const lastDay = state.value.days[state.value.days.length - 1];
    if (!lastDay) return;
    const monthIndex = new Date(`${lastDay.month} ${lastDay.date}, 2024`).getMonth();
    const nextDate = new Date(2024, monthIndex, Number(lastDay.date) + 1);
    state.value.days.push({
      label: nextDate.toLocaleDateString("en-US", { weekday: "short" }),
      date: String(nextDate.getDate()),
      month: nextDate.toLocaleDateString("en-US", { month: "short" }),
      count: 0,
    });
    state.value.activeDay = state.value.days.length - 1;
    state.value.syncState = "pending";
  }

  function updateDayDate(index: number, date: Pick<(typeof tripDays)[number], "label" | "date" | "month">) {
    const day = state.value.days[index];
    if (!day) return false;
    Object.assign(day, date);
    state.value.syncState = "pending";
    return true;
  }

  function deleteEvent(id: string) {
    const index = state.value.events.findIndex((event) => event.id === id);
    if (index < 0) return false;
    state.value.events.splice(index, 1);
    state.value.deletedEventIds.push(id);
    state.value.syncState = "pending";
    return true;
  }

  function resolveConflict(id: string, choice: "local" | "remote") {
    state.value.conflicts = state.value.conflicts.filter((conflict) => conflict !== id);
    if (!state.value.conflicts.length) state.value.syncState = "synced";
    return choice;
  }

  function addEvent(input: Pick<TripEvent, "title" | "place" | "time" | "tag" | "coords">) {
    state.value.events.push({
      id: `event-${Date.now()}`,
      day: state.value.activeDay,
      title: input.title,
      place: input.place,
      time: input.time,
      tag: input.tag,
      tone: "purple",
      coords: input.coords,
      bill: [],
      recommendations: [],
      food: [],
      todos: [],
    });
    state.value.syncState = "pending";
  }
  function replaceItinerary(itinerary: {
    title: string;
    events: Array<
      Pick<
        TripEvent,
        "day" | "time" | "title" | "place" | "tag" | "coords" | "recommendations" | "food" | "todos"
      >
    >;
  }) {
    state.value.title = itinerary.title;
    state.value.events = itinerary.events.map((event, index) => ({
      ...event,
      id: `generated-${Date.now()}-${index}`,
      tone: "purple",
      bill: [],
    }));
    state.value.syncState = "pending";
  }

  function addBillItem(event: TripEvent, item: BillItem) {
    event.bill.push(item);
    state.value.syncState = "pending";
  }
  function toggleSettled(item: BillItem) {
    item.settled = !item.settled;
    state.value.syncState = "pending";
  }

  async function syncWorkspace() {
    const { inviteCode } = useInvite();
    state.value.syncState = "pending";
    try {
      await $fetch("/api/workspaces/sync", {
        method: "POST",
        body: { workspaceCode: inviteCode.value },
      });
      state.value.syncState = "synced";
      state.value.syncError = "";
    } catch (error) {
      state.value.syncState = "error";
      state.value.syncError = error instanceof Error ? error.message : "Sync failed";
    }
  }

  return {
    title,
    activeDay,
    days,
    events,
    selectedEvents,
    dayTitle,
    crew: crewMembers,
    synced: computed(() => state.value.syncState === "synced"),
    syncState: computed(() => state.value.syncState),
    conflicts: computed(() => state.value.conflicts),
    syncError: computed(() => state.value.syncError),
    markSynced: () => {
      state.value.syncState = "synced";
      state.value.syncError = "";
    },
    markSyncError: (message: string) => {
      state.value.syncState = "error";
      state.value.syncError = message;
    },
    syncWorkspace,
    addDay,
    updateDayDate,
    deleteEvent,
    resolveConflict,
    addEvent,
    replaceItinerary,
    addBillItem,
    toggleSettled,
  };
}
