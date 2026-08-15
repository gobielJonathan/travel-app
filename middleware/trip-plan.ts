import { loadItinerary } from "~/utils/itineraryStorage";

export default defineNuxtRouteMiddleware(async () => {
  const { joined } = useInvite();
  if (joined.value) return;
  const hasTripState = Boolean(localStorage.getItem("roam-trip-state"));
  let hasItinerary = false;
  try {
    hasItinerary = Boolean(await loadItinerary());
  } catch {
    hasItinerary = false;
  }

  if (!hasTripState && !hasItinerary) return navigateTo("/");
});
