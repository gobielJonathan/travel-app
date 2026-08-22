import { loadItinerary } from "~/utils/itineraryStorage";
import { getTripStorageKeys, loadTripSnapshot } from "~/utils/itineraryStorage";

export default defineNuxtRouteMiddleware(async () => {
  const { inviteCode, joined, role } = useInvite();
  if (joined.value || role.value === "crew") return;
  const hasTripState = Boolean(localStorage.getItem(getTripStorageKeys(inviteCode.value).state));
  let hasItinerary = false;
  try {
    hasItinerary = Boolean((await loadItinerary()) || (await loadTripSnapshot(inviteCode.value)));
  } catch {
    hasItinerary = false;
  }

  if (!hasTripState && !hasItinerary) return navigateTo("/");
});
