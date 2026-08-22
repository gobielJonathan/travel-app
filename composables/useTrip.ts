import { computed } from "vue";
import type { BillItem, TripDay, TripEvent, TripSnapshot, TripVersion } from "~/types/trip";
import { getTripStorageKeys, saveTripSnapshot } from "~/utils/itineraryStorage";

type SyncState = "synced" | "pending" | "conflict" | "error";

function createPeerId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cloneSnapshot(value: TripSnapshot): TripSnapshot {
  return {
    title: value.title,
    days: value.days.map((day) => ({ ...day })),
    events: value.events.map((event) => ({
      ...event,
      coords: [...event.coords] as [number, number],
      bill: event.bill.map((item) => ({ ...item })),
      recommendations: [...event.recommendations],
      food: [...event.food],
      todos: event.todos.map((todo) => ({ ...todo })),
    })),
    deletedEventIds: [...value.deletedEventIds],
    completed: value.completed,
    version: { ...value.version },
  };
}

export function useTrip() {
  const { inviteCode } = useInvite();
  const storageKeys = getTripStorageKeys(inviteCode.value);
  const storedState = JSON.parse(localStorage.getItem(storageKeys.state) ?? "null") as {
    title?: string;
    days?: TripDay[];
    events?: TripEvent[];
    deletedEventIds?: string[];
    completed?: boolean;
    version?: TripVersion;
  } | null;
  const peerId = useState("trip-peer-id", createPeerId);
  const deletedEventIds =
    storedState?.deletedEventIds ??
    (JSON.parse(localStorage.getItem(storageKeys.deletedEventIds) ?? "[]") as string[]);
  const state = useState(`trip-state:${inviteCode.value}`, () => {
    const days = storedState?.days?.map((day) => ({ ...day })) ?? [];
    const today = new Date();
    const currentDay = days.findIndex(
      (day) =>
        day.date === String(today.getDate()) &&
        day.month === today.toLocaleDateString("en-US", { month: "short" }),
    );
    return {
      title: storedState?.title || localStorage.getItem(storageKeys.title) || "",
      activeDay: currentDay >= 0 ? currentDay : 0,
      days,
      events: storedState?.events?.map((event) => ({ ...event, bill: [...event.bill] })) ?? [],
      syncState: "synced" as SyncState,
      syncError: "",
      conflicts: [] as string[],
      deletedEventIds,
      completed: storedState?.completed ?? false,
      version: storedState?.version ?? { counter: 0, peerId: peerId.value },
    };
  });
  const listeners = new Set<(snapshot: TripSnapshot) => void>();

  const snapshot = computed<TripSnapshot>(() =>
    cloneSnapshot({
      title: state.value.title,
      days: state.value.days,
      events: state.value.events,
      deletedEventIds: state.value.deletedEventIds,
      completed: state.value.completed,
      version: state.value.version,
    }),
  );

  function persist() {
    const nextSnapshot = snapshot.value;
    localStorage.setItem(storageKeys.state, JSON.stringify(nextSnapshot));
    void saveTripSnapshot(nextSnapshot, inviteCode.value).catch(() => undefined);
  }
  function commitLocalChange() {
    state.value.version = {
      counter: state.value.version.counter + 1,
      peerId: peerId.value,
    };
    persist();
    const nextSnapshot = snapshot.value;
    for (const listener of listeners) listener(nextSnapshot);
  }
  const title = computed({
    get: () => state.value.title,
    set: (value) => {
      const nextTitle = value.trim();
      state.value.title = nextTitle;
      state.value.syncState = "pending";
      localStorage.setItem(storageKeys.title, nextTitle);
      commitLocalChange();
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
    commitLocalChange();
  }

  function updateDayDate(index: number, date: Pick<TripDay, "label" | "date" | "month">) {
    const day = state.value.days[index];
    if (!day) return false;
    Object.assign(day, date);
    state.value.syncState = "pending";
    commitLocalChange();
    return true;
  }

  function deleteEvent(id: string) {
    const index = state.value.events.findIndex((event) => event.id === id);
    if (index < 0) return false;
    state.value.events.splice(index, 1);
    if (!state.value.deletedEventIds.includes(id)) state.value.deletedEventIds.push(id);
    localStorage.setItem(storageKeys.deletedEventIds, JSON.stringify(state.value.deletedEventIds));
    state.value.syncState = "pending";
    commitLocalChange();
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
    commitLocalChange();
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
    commitLocalChange();
  }

  function implementEvents(
    events: Array<
      Pick<
        TripEvent,
        "day" | "time" | "title" | "place" | "tag" | "coords" | "recommendations" | "food" | "todos"
      >
    >,
  ) {
    const lastEventDay = events.reduce((highest, event) => Math.max(highest, event.day), -1);
    while (state.value.days.length <= lastEventDay) {
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
    }
    const firstImplementedDay = events.find((event) => event.day >= 0)?.day;
    if (firstImplementedDay !== undefined)
      state.value.activeDay = Math.min(firstImplementedDay, state.value.days.length - 1);
    state.value.events.push(
      ...events.map((event, index) => ({
        ...event,
        id: `implemented-${Date.now()}-${index}`,
        tone: "purple",
        bill: [],
      })),
    );
    state.value.syncState = "pending";
    commitLocalChange();
  }

  function updateEvent(id: string, changes: Pick<TripEvent, "day" | "time" | "notes">) {
    const event = state.value.events.find((item) => item.id === id);
    if (!event) return false;
    event.day = changes.day;
    event.time = changes.time;
    event.notes = changes.notes?.trim();
    state.value.syncState = "pending";
    commitLocalChange();
    return true;
  }

  function addBillItem(event: TripEvent, item: BillItem) {
    event.bill.push(item);
    state.value.syncState = "pending";
    commitLocalChange();
  }
  function toggleSettled(item: BillItem) {
    item.settled = !item.settled;
    state.value.syncState = "pending";
    commitLocalChange();
  }

  function completeTrip() {
    state.value.completed = true;
    state.value.syncState = "pending";
    commitLocalChange();
  }

  function applySnapshot(nextSnapshot: TripSnapshot) {
    const next = cloneSnapshot(nextSnapshot);
    state.value.title = next.title;
    state.value.days = next.days;
    state.value.events = next.events;
    state.value.deletedEventIds = next.deletedEventIds;
    state.value.completed = next.completed;
    state.value.version = next.version;
    state.value.syncState = "synced";
    state.value.syncError = "";
    localStorage.setItem(storageKeys.title, next.title);
    localStorage.setItem(storageKeys.deletedEventIds, JSON.stringify(next.deletedEventIds));
    persist();
  }

  function subscribeToChanges(listener: (nextSnapshot: TripSnapshot) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    peerId,
    title,
    activeDay,
    days,
    events,
    budget,
    selectedEvents,
    dayTitle,
    snapshot,
    applySnapshot,
    subscribeToChanges,
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
