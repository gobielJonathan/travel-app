import type { TripEvent, TripTodo } from "~/types/trip";

export type GeneratedItinerary = {
  title: string;
  destination: string;
  dates: string;
  events: Array<
    Pick<TripEvent, "day" | "time" | "title" | "place" | "tag" | "coords"> & {
      recommendations: string[];
      food: string[];
      todos: TripTodo[];
    }
  >;
};

export function isGeneratedItinerary(value: unknown): value is GeneratedItinerary {
  if (!value || typeof value !== "object") return false;
  const itinerary = value as GeneratedItinerary;
  return (
    typeof itinerary.title === "string" &&
    typeof itinerary.destination === "string" &&
    typeof itinerary.dates === "string" &&
    Array.isArray(itinerary.events) &&
    itinerary.events.every(
      (event) =>
        typeof event.day === "number" &&
        typeof event.time === "string" &&
        typeof event.title === "string" &&
        typeof event.place === "string" &&
        typeof event.tag === "string" &&
        Array.isArray(event.coords) &&
        event.coords.length === 2 &&
        event.coords.every((coordinate) => typeof coordinate === "number") &&
        Array.isArray(event.recommendations) &&
        Array.isArray(event.food) &&
        Array.isArray(event.todos) &&
        event.todos.every(
          (todo) =>
            typeof todo.text === "string" &&
            typeof todo.completed === "boolean" &&
            (todo.assignee === undefined || typeof todo.assignee === "string"),
        ),
    )
  );
}
