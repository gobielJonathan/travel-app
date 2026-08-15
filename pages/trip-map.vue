<script setup lang="ts">
useHead({ title: "Trip Map — Roam" });

const { title, days, activeDay, events } = useTrip();
const route = useRoute();
const selectedDay = computed(() => {
  const day = Number(route.query.day);
  return Number.isInteger(day) && day >= 0 && day < days.value.length ? day : activeDay.value;
});
const visibleEvents = computed(() =>
  events.value.filter((event) => event.day === selectedDay.value),
);
const mapElement = ref<HTMLElement | null>(null);
const status = ref("Demo route");
const summary = ref("");
let map: import("leaflet").Map | null = null;
let resizeMap: (() => void) | null = null;
onMounted(async () => {
  const L = await import("leaflet");
  const first = visibleEvents.value[0];
  if (!mapElement.value || !first) return;
  map = L.map(mapElement.value).setView(first.coords, 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  const points = visibleEvents.value.map((event) => event.coords);
  const escapeHtml = (value: string) =>
    value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  visibleEvents.value.forEach((event, index) => {
    const icon = L.divIcon({
      className: "timeline-map-marker",
      html: `<span class="timeline-map-marker-pin"></span>`,
      iconSize: [42, 48],
      iconAnchor: [21, 44],
      popupAnchor: [0, -38],
    });
    L.marker(event.coords, { icon })
      .bindPopup(
        `<strong>${index + 1}. ${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)}`,
      )
      .addTo(map!);
  });
  map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!map) return;
        const location = [coords.latitude, coords.longitude] as [number, number];
        const icon = L.divIcon({
          className: "current-location-marker",
          html: '<span class="current-location-marker-dot"></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker(location, { icon, zIndexOffset: 1000 }).bindPopup("You are here").addTo(map);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }
  resizeMap = () => map?.invalidateSize();
  window.addEventListener("resize", resizeMap);
  try {
    const coordinates = points.map(([lat, lon]) => `${lon},${lat}`).join(";");
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson`,
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
    status.value = "Demo route · offline fallback";
    summary.value = "Live route unavailable";
  }
});
onBeforeUnmount(() => {
  if (resizeMap) window.removeEventListener("resize", resizeMap);
  map?.remove();
});
</script>
<template>
  <div class="app-shell map-page">
    <header class="topbar">
      <NuxtLink class="brand" to="/trip"><span class="brand-mark">✦</span> roam</NuxtLink>
      <nav>
        <NuxtLink to="/trip">My plans</NuxtLink
        ><NuxtLink class="nav-active" to="/trip-map">Map</NuxtLink>
      </nav>
    </header>
    <main>
      <section class="hero-row">
        <div>
          <div class="eyebrow">Route preview</div>
          <h1>{{ title }} <em>stops</em></h1>
          <p class="subtitle">
            {{ visibleEvents.length }} stops · {{ status
            }}<span v-if="summary"> · {{ summary }}</span>
          </p>
        </div>
        <NuxtLink class="ghost-btn" to="/trip">← Back to trip</NuxtLink>
      </section>
      <section ref="mapElement" class="map-canvas"></section>
    </main>
  </div>
</template>

<style scoped src="~/assets/styles/pages/trip.css"></style>
<style scoped src="~/assets/styles/pages/trip-map.css"></style>
