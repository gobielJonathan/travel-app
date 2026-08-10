import type { GeneratedItinerary } from "~/types/itinerary";

const DB_NAME = "roam-planner";
const STORE_NAME = "plans";
const PLAN_KEY = "current";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveItinerary(itinerary: GeneratedItinerary) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(itinerary, PLAN_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function loadItinerary() {
  const database = await openDatabase();
  const itinerary = await new Promise<GeneratedItinerary | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(PLAN_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return itinerary;
}

export async function clearItinerary() {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(PLAN_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}
