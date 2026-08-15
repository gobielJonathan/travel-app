import { computed } from "vue";
import type { BillItem, TripDay, TripEvent } from "~/types/trip";
import { useInvite } from "~/composables/useInvite";

type SyncState = "synced" | "pending" | "conflict" | "error";

const deletedEventIdsKey = "roam-deleted-event-ids";
const tripTitleKey = "roam-trip-title";
const tripStateKey = "roam-trip-state";

export function useTrip() {
  const storedState = JSON.parse(localStorage.getItem(tripStateKey) ?? "null") as {
    title?: string;
    days?: TripDay[];
    events?: TripEvent[];
    deletedEventIds?: string[];
    completed?: boolean;
  } | null;
  const deletedEventIds =
    storedState?.deletedEventIds ??
    (JSON.parse(localStorage.getItem(deletedEventIdsKey) ?? "[]") as string[]);
  const state = useState("trip-state", () => {
    const days = storedState?.days?.map((day) => ({ ...day })) ?? [];
    const today = new Date();
    const currentDay = days.findIndex(
      (day) =>
        day.date === String(today.getDate()) &&
        day.month === today.toLocaleDateString("en-US", { month: "short" }),
    );
    return {
      title: storedState?.title || localStorage.getItem(tripTitleKey) || "",
      activeDay: currentDay >= 0 ? currentDay : 0,
      days,
      events: storedState?.events?.map((event) => ({ ...event, bill: [...event.bill] })) ?? [],
      syncState: "synced" as SyncState,
      syncError: "",
      conflicts: [] as string[],
      deletedEventIds,
      completed: storedState?.completed ?? false,
    };
  });
  function persist() {
    localStorage.setItem(
      tripStateKey,
      JSON.stringify({
        title: state.value.title,
        days: state.value.days,
        events: state.value.events,
        deletedEventIds: state.value.deletedEventIds,
        completed: state.value.completed,
      }),
    );
  }
  const title = computed({
    get: () => state.value.title,
    set: (value) => {
      const nextTitle = value.trim();
      state.value.title = nextTitle;
      state.value.syncState = "pending";
      localStorage.setItem(tripTitleKey, nextTitle);
      persist();
    },
  });
  const activeDay = computed({
    get: () => state.value.activeDay,
    set: (value) => {
      state.value.activeDay = value;
    },
  });
  const events = computed(() => state.value.events);
  const budget = computed(() => ({
    total: 0,
    spent: 0,
    categories: [],
    remaining: 0,
    progress: 0,
  }));
  const days = computed(() =>
    state.value.days.map((day, index) => ({
      ...day,
      count: events.value.filter((event) => event.day === index).length,
    })),
  );
  const selectedEvents = computed(() =>
    events.value
      .filter((event) => event.day === activeDay.value)
      .toSorted((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id)),
  );
  const dayTitle = computed(() => {
    const day = days.value[activeDay.value] ?? days.value[0];
    return day ? `${day.label}, ${day.month} ${day.date}` : "No days planned";
  });

  function addDay() {
    const lastDay = state.value.days[state.value.days.length - 1];
    const nextDate = lastDay
      ? new Date(
          new Date().getFullYear(),
          new Date(`${lastDay.month} ${lastDay.date}, 2024`).getMonth(),
          Number(lastDay.date) + 1,
        )
      : new Date();
    state.value.days.push({
      label: nextDate.toLocaleDateString("en-US", { weekday: "short" }),
      date: String(nextDate.getDate()),
      month: nextDate.toLocaleDateString("en-US", { month: "short" }),
      count: 0,
    });
    state.value.activeDay = state.value.days.length - 1;
    state.value.syncState = "pending";
    persist();
  }

  function updateDayDate(index: number, date: Pick<TripDay, "label" | "date" | "month">) {
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
    if (!state.value.deletedEventIds.includes(id)) state.value.deletedEventIds.push(id);
    localStorage.setItem(deletedEventIdsKey, JSON.stringify(state.value.deletedEventIds));
    state.value.syncState = "pending";
    persist();
    return true;
  }

  function resolveConflict(id: string, choice: "local" | "remote") {
    state.value.conflicts = state.value.conflicts.filter((conflict) => conflict !== id);
    if (!state.value.conflicts.length) state.value.syncState = "synced";
    return choice;
  }

  function addEvent(
    input: Pick<TripEvent, "title" | "place" | "day" | "time" | "notes" | "tag" | "coords">,
  ) {
    state.value.events.push({
      id: `event-${Date.now()}`,
      day: input.day,
      title: input.title,
      place: input.place,
      time: input.time,
      notes: input.notes,
      tag: input.tag,
      tone: "purple",
      coords: input.coords,
      bill: [],
      recommendations: [],
      food: [],
      todos: [],
    });
    state.value.syncState = "pending";
    persist();
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
    const dayCount = itinerary.events.reduce(
      (highest, event) => Math.max(highest, event.day + 1),
      0,
    );
    const startDate = new Date();
    state.value.days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: String(date.getDate()),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        count: itinerary.events.filter((event) => event.day === index).length,
      };
    });
    state.value.activeDay = 0;
    state.value.events = itinerary.events.map((event, index) => ({
      ...event,
      id: `generated-${Date.now()}-${index}`,
      tone: "purple",
      bill: [],
    }));
    state.value.syncState = "pending";
    persist();
  }

  function implementEvents(
    events: Array<
      Pick<
        TripEvent,
        "day" | "time" | "title" | "place" | "tag" | "coords" | "recommendations" | "food" | "todos"
      >
    >,
  ) {
    state.value.events.push(
      ...events.map((event, index) => ({
        ...event,
        id: `implemented-${Date.now()}-${index}`,
        tone: "purple",
        bill: [],
      })),
    );
    state.value.syncState = "pending";
    persist();
  }

  function updateEvent(id: string, changes: Pick<TripEvent, "day" | "time" | "notes">) {
    const event = state.value.events.find((item) => item.id === id);
    if (!event) return false;
    event.day = changes.day;
    event.time = changes.time;
    event.notes = changes.notes?.trim();
    state.value.syncState = "pending";
    persist();
    return true;
  }

  function addBillItem(event: TripEvent, item: BillItem) {
    event.bill.push(item);
    state.value.syncState = "pending";
  }
  function toggleSettled(item: BillItem) {
    item.settled = !item.settled;
    state.value.syncState = "pending";
  }

  function completeTrip() {
    state.value.completed = true;
    state.value.syncState = "pending";
    persist();
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
    budget,
    selectedEvents,
    dayTitle,
    crew: [],
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
    updateEvent,
    replaceItinerary,
    implementEvents,
    addBillItem,
    toggleSettled,
    completed: computed(() => state.value.completed),
    completeTrip,
  };
}
