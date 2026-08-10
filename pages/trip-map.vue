<script setup lang="ts">
const { title, events } = useTrip();
const mapElement = ref<HTMLElement | null>(null);
const status = ref("Demo route");
const summary = ref("");
let map: import("leaflet").Map | null = null;
let resizeMap: (() => void) | null = null;
onMounted(async () => {
  const L = await import("leaflet");
  const first = events.value[0];
  if (!mapElement.value || !first) return;
  map = L.map(mapElement.value).setView(first.coords, 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  const points = events.value.map((event) => event.coords);
  L.polyline(points, { color: "#d5cfc4", weight: 3, dashArray: "5 8" }).addTo(map);
  const escapeHtml = (value: string) =>
    value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  events.value.forEach((event, index) => {
    const icon = L.divIcon({
      className: "timeline-map-pin",
      html: `<span>${index + 1}</span>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22],
    });
    L.marker(event.coords, { icon })
      .bindPopup(
        `<strong>${index + 1}. ${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)}`,
      )
      .addTo(map!);
  });
  map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
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
    L.polyline(
      route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
      { color: "#d9644e", weight: 5 },
    ).addTo(map);
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
            {{ events.length }} stops · {{ status }}<span v-if="summary"> · {{ summary }}</span>
          </p>
        </div>
        <NuxtLink class="ghost-btn" to="/trip">← Back to trip</NuxtLink>
      </section>
      <section ref="mapElement" class="map-canvas"></section>
    </main>
  </div>
</template>

<style src="~/assets/styles/pages/trip-map.css"></style>
