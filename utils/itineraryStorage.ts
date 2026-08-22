import type { GeneratedItinerary } from "~/types/itinerary";
import type { TripSnapshot } from "~/types/trip";

const DB_NAME = "roam-planner";
const STORE_NAME = "plans";
const PLAN_KEY = "current";

export function getTripStorageKeys(workspaceCode: string) {
  const key = workspaceCode.replace(/[^A-Z0-9-]/gi, "").toUpperCase();
  return {
    state: `roam-trip-state:${key}`,
    title: `roam-trip-title:${key}`,
    deletedEventIds: `roam-deleted-event-ids:${key}`,
    snapshot: `current-trip:${key}`,
  };
}

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

export async function saveTripSnapshot(snapshot: TripSnapshot, workspaceCode: string) {
  const database = await openDatabase();
  const key = getTripStorageKeys(workspaceCode).snapshot;
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(snapshot, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function loadTripSnapshot(workspaceCode: string) {
  const database = await openDatabase();
  const key = getTripStorageKeys(workspaceCode).snapshot;
  const snapshot = await new Promise<TripSnapshot | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return snapshot;
}

export async function clearTripSnapshot(workspaceCode: string) {
  const database = await openDatabase();
  const key = getTripStorageKeys(workspaceCode).snapshot;
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}
