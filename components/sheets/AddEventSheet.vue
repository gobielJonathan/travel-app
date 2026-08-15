<script setup lang="ts">
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";

type PlaceSuggestion = { display_name: string; lat: string; lon: string };
const emit = defineEmits<{
  submit: [
    {
      title: string;
      place: string;
      day: number;
      time: string;
      notes: string;
      tag: string;
      coords: [number, number];
    },
  ];
  close: [];
}>();
const props = defineProps<{
  days: { label: string; date: string; month: string }[];
  initialDay: number;
}>();
const title = ref("");
const place = ref("");
const day = ref(props.initialDay);
const time = ref("20:00");
const notes = ref("");
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
function closeSheet(open: boolean) {
  if (!open) emit("close");
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
    day: day.value,
    time: time.value,
    notes: notes.value.trim(),
    tag: tag.value,
    coords: selectedCoords.value,
  });
  title.value = "";
  place.value = "";
  selectedCoords.value = null;
}
</script>
<template>
  <BsSimple
    :model-value="true"
    :close-on-backdrop="true"
    :hide-close-button="true"
    height="80dvh"
    :show-backdrop="true"
    :z-index="40"
    class="add-event-sheet"
    @update:model-value="closeSheet"
  >
    <div class="add-event-dialog">
      <button
        class="close-btn"
        type="button"
        aria-label="Close add event dialog"
        @click="emit('close')"
      >
        ×
      </button>
      <div class="section-label">New stop</div>
      <h2 id="add-event-title">Add event</h2>
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
        <div class="event-form-row schedule-form-row">
          <label
            >Date<select v-model.number="day">
              <option
                v-for="(item, index) in props.days"
                :key="`${item.month}-${item.date}`"
                :value="index"
              >
                {{ item.label }} · {{ item.month }} {{ item.date }}
              </option>
            </select></label
          ><label>Time<input v-model="time" type="time" required /></label
          ><label
            >Type<select v-model="tag">
              <option>New</option>
              <option>Food</option>
              <option>Explore</option>
              <option>Transit</option>
            </select></label
          >
        </div>
        <label class="notes-field">
          <span class="notes-label"><span>Notes</span><small>Optional</small></span>
          <textarea
            v-model="notes"
            maxlength="280"
            placeholder="A detail worth remembering…"
          ></textarea>
          <span class="notes-footer"
            ><span>Keep it useful for your future self.</span>{{ notes.length }}/280</span
          >
        </label>
        <button class="primary-btn" type="submit">Add to timeline</button>
      </form>
    </div>
  </BsSimple>
</template>

<style scoped src="~/assets/styles/components/modals.css"></style>
