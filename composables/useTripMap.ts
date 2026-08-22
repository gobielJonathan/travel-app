import type { Ref } from "vue";
import type { TripEvent } from "~/types/trip";

const fallbackCenter: [number, number] = [20, 0];

function createEventIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "timeline-map-marker",
    html: `<span class="timeline-map-marker-pin"></span>`,
    iconSize: [42, 48],
    iconAnchor: [21, 44],
    popupAnchor: [0, -38],
  });
}

function createLocationIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "current-location-marker",
    html: '<span class="current-location-marker-dot"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function useTripMap(
  mapElement: Ref<HTMLElement | null>,
  visibleEvents: Readonly<Ref<TripEvent[]>>,
) {
  let map: import("leaflet").Map | null = null;
  let resizeMap: (() => void) | null = null;
  let disposed = false;

  onMounted(async () => {
    const L = await import("leaflet");
    if (disposed || !mapElement.value) return;

    const first = visibleEvents.value[0];
    const points = visibleEvents.value.map((event) => event.coords);
    map = L.map(mapElement.value).setView(first?.coords ?? fallbackCenter, first ? 11 : 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    visibleEvents.value.forEach((event, index) => {
      L.marker(event.coords, { icon: createEventIcon(L) })
        .bindPopup(
          `<strong>${index + 1}. ${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)}`,
        )
        .addTo(map!);
    });
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!map || disposed) return;
          const location = [coords.latitude, coords.longitude] as [number, number];
          if (!points.length) map.setView(location, 18);
          L.marker(location, {
            icon: createLocationIcon(L),
            zIndexOffset: 1000,
          })
            .bindPopup("You are here")
            .addTo(map);
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    }

    resizeMap = () => map?.invalidateSize();
    window.addEventListener("resize", resizeMap);
  });

  onBeforeUnmount(() => {
    disposed = true;
    if (resizeMap) window.removeEventListener("resize", resizeMap);
    map?.remove();
    map = null;
  });
}
