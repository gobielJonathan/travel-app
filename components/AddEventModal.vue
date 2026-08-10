<script setup lang="ts">
type PlaceSuggestion = { display_name: string; lat: string; lon: string };
const emit = defineEmits<{
  submit: [{ title: string; place: string; time: string; tag: string; coords: [number, number] }];
  close: [];
}>();
const title = ref("");
const place = ref("");
const time = ref("20:00");
const tag = ref("New");
const suggestions = ref<PlaceSuggestion[]>([]);
const searching = ref(false);
const searchError = ref(false);
const selectedCoords = ref<[number, number] | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
async function searchPlaces() {
  selectedCoords.value = null;
  const query = place.value.trim();
  if (query.length < 3) {
    suggestions.value = [];
    return;
  }
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    searching.value = true;
    searchError.value = false;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Place search failed");
      suggestions.value = (await response.json()) as PlaceSuggestion[];
    } catch {
      suggestions.value = [];
      searchError.value = true;
    } finally {
      searching.value = false;
    }
  }, 350);
}
function selectPlace(suggestion: PlaceSuggestion) {
  place.value = suggestion.display_name;
  selectedCoords.value = [Number(suggestion.lat), Number(suggestion.lon)];
  suggestions.value = [];
}
function submit() {
  if (
    !title.value.trim() ||
    !place.value.trim() ||
    !selectedCoords.value ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.value)
  )
    return;
  emit("submit", {
    title: title.value.trim(),
    place: place.value.trim(),
    time: time.value,
    tag: tag.value,
    coords: selectedCoords.value,
  });
  title.value = "";
  place.value = "";
  selectedCoords.value = null;
}
</script>
<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <section class="modal-surface invite-modal">
      <button class="close-btn" @click="emit('close')">×</button>
      <div class="section-label">New stop</div>
      <h2>Add event</h2>
      <p>Set place and schedule time for this stop.</p>
      <form class="event-form" @submit.prevent="submit">
        <label>Event title<input v-model="title" placeholder="Dinner at Bestia" required /></label>
        <label class="place-field"
          >Location<input
            v-model="place"
            placeholder="Search a place"
            autocomplete="off"
            required
            @input="searchPlaces"
          /><span v-if="searching" class="place-status">Searching places…</span
          ><span v-else-if="searchError" class="place-status">Search unavailable. Try again.</span
          ><span v-else-if="place && !selectedCoords" class="place-status"
            >Choose a suggested place.</span
          >
          <div v-if="suggestions.length" class="place-suggestions">
            <button
              v-for="suggestion in suggestions"
              :key="`${suggestion.lat}-${suggestion.lon}`"
              type="button"
              @click="selectPlace(suggestion)"
            >
              {{ suggestion.display_name }}
            </button>
          </div></label
        >
        <div class="event-form-row">
          <label>Schedule time<input v-model="time" type="time" required /></label
          ><label
            >Type<select v-model="tag">
              <option>New</option>
              <option>Food</option>
              <option>Explore</option>
              <option>Transit</option>
            </select></label
          >
        </div>
        <button class="primary-btn" type="submit">Add to timeline</button>
      </form>
    </section>
  </div>
</template>

<style src="~/assets/styles/components/modals.css"></style>
