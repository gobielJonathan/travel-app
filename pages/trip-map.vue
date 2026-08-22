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
const { status, summary } = useTripRoute(visibleEvents);
useTripMap(mapElement, visibleEvents);
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
