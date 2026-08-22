export type BillItem = { name: string; price: number; member: string; settled: boolean };
export type ReceiptAnalysis = { currency: string; items: BillItem[] };
export type TripTodo = { text: string; assignee?: string; completed: boolean };
export type TripEvent = {
  id: string;
  day: number;
  time: string;
  title: string;
  place: string;
  notes?: string;
  tag: string;
  tone: string;
  coords: [number, number];
  travelTime?: string;
  transport?: string;
  bill: BillItem[];
  recommendations: string[];
  food: string[];
  todos: TripTodo[];
};
export type TripDay = { label: string; date: string; month: string; count: number };
export type TripSyncRole = "host" | "crew";
export type TripVersion = { counter: number; peerId: string };
export type TripSnapshot = {
  title: string;
  days: TripDay[];
  events: TripEvent[];
  deletedEventIds: string[];
  completed: boolean;
  version: TripVersion;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function isTripSnapshot(value: unknown): value is TripSnapshot {
  if (!isRecord(value)) return false;
  const version = value.version;
  const days = value.days;
  const events = value.events;
  return (
    typeof value.title === "string" &&
    Array.isArray(days) &&
    days.every(
      (day) =>
        isRecord(day) &&
        typeof day.label === "string" &&
        typeof day.date === "string" &&
        typeof day.month === "string" &&
        typeof day.count === "number",
    ) &&
    Array.isArray(events) &&
    events.every((event) => {
      if (!isRecord(event) || !Array.isArray(event.coords) || event.coords.length !== 2)
        return false;
      return (
        typeof event.id === "string" &&
        typeof event.day === "number" &&
        typeof event.time === "string" &&
        typeof event.title === "string" &&
        typeof event.place === "string" &&
        typeof event.tag === "string" &&
        typeof event.tone === "string" &&
        event.coords.every((coordinate) => typeof coordinate === "number") &&
        Array.isArray(event.bill) &&
        event.bill.every(
          (item) =>
            isRecord(item) &&
            typeof item.name === "string" &&
            typeof item.price === "number" &&
            typeof item.member === "string" &&
            typeof item.settled === "boolean",
        ) &&
        Array.isArray(event.recommendations) &&
        event.recommendations.every((item) => typeof item === "string") &&
        Array.isArray(event.food) &&
        event.food.every((item) => typeof item === "string") &&
        Array.isArray(event.todos) &&
        event.todos.every(
          (todo) =>
            isRecord(todo) &&
            typeof todo.text === "string" &&
            typeof todo.completed === "boolean" &&
            (todo.assignee === undefined || typeof todo.assignee === "string"),
        ) &&
        (event.notes === undefined || typeof event.notes === "string") &&
        (event.travelTime === undefined || typeof event.travelTime === "string") &&
        (event.transport === undefined || typeof event.transport === "string")
      );
    }) &&
    Array.isArray(value.deletedEventIds) &&
    value.deletedEventIds.every((id) => typeof id === "string") &&
    typeof value.completed === "boolean" &&
    isRecord(version) &&
    typeof version.counter === "number" &&
    Number.isInteger(version.counter) &&
    version.counter >= 0 &&
    typeof version.peerId === "string"
  );
}

export type TripBudgetCategory = { name: string; spent: number };
export type TripBudget = {
  total: number;
  spent: number;
  categories: TripBudgetCategory[];
};
export type CrewMember = {
  initials: string;
  name: string;
  role: string;
  tone?: string;
  online?: boolean;
};
