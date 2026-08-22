import type { Ref } from "vue";
import type { TripEvent } from "~/types/trip";

export function useTripRoute(visibleEvents: Readonly<Ref<TripEvent[]>>) {
  const status = ref("Demo route");
  const summary = ref("");
  const controller = new AbortController();

  onMounted(async () => {
    const points = visibleEvents.value.map((event) => event.coords);
    if (!points.length) {
      status.value = "No stops yet";
      summary.value = "Add events to see them here";
      return;
    }

    try {
      const coordinates = points.map(([lat, lon]) => `${lon},${lat}`).join(";");
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
        }>;
      };
      const route = data.routes?.[0];
      if (!route) throw new Error();
      status.value = "Best walking route";
      summary.value = `${(route.distance / 1000).toFixed(1)} km · ${Math.round(route.duration / 60)} min`;
    } catch {
      if (controller.signal.aborted) return;
      status.value = "Demo route · offline fallback";
      summary.value = "Live route unavailable";
    }
  });

  onBeforeUnmount(() => controller.abort());

  return { status, summary };
}
