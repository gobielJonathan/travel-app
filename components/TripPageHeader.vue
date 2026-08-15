<script setup lang="ts">
const props = defineProps<{
  title: string;
  crew: { initials: string; name: string }[];
  editingTitle: boolean;
  draftTitle: string;
  completed: boolean;
}>();
const emit = defineEmits<{
  "update:draftTitle": [string];
  editTitle: [];
  saveTitle: [];
  cancelTitle: [];
  askAssistant: [];
  completeTrip: [];
}>();
</script>
<template>
  <header class="topbar">
    <NuxtLink class="brand" to="/"><span class="brand-mark">✦</span> roam</NuxtLink>
    <nav><NuxtLink class="nav-active" to="/trip">My plans</NuxtLink></nav>
    <div class="mobile-header-label">{{ props.title }}</div>
    <div class="top-actions">
      <div class="avatar">{{ props.crew[0]?.initials || "?" }}</div>
      <span class="user-name">{{ props.crew[0]?.name || "Your trip" }}</span>
    </div>
  </header>
  <section class="hero-row">
    <div>
      <div class="eyebrow"><span class="live-dot"></span> Local-first workspace</div>
      <div v-if="props.editingTitle" class="trip-title-editor">
        <input
          :value="props.draftTitle"
          autofocus
          aria-label="Trip title"
          @input="emit('update:draftTitle', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('saveTitle')"
          @keyup.esc="emit('cancelTitle')"
        /><button class="primary-btn" @click="emit('saveTitle')">Save</button
        ><button class="ghost-btn" @click="emit('cancelTitle')">Cancel</button>
      </div>
      <button v-else class="trip-title" @click="emit('editTitle')" title="Edit trip title">
        {{ props.title }} <span>✎</span>
      </button>
      <p class="subtitle">
        Build your itinerary together. <span class="lock">⌁</span> Private to your group.
      </p>
    </div>
    <div class="hero-actions">
      <button class="ghost-btn" @click="emit('askAssistant')">✦ Ask Roam AI</button
      ><button
        v-if="!props.completed"
        class="ghost-btn"
        type="button"
        @click="emit('completeTrip')"
      >
        Finish trip</button
      ><span v-else class="trip-completed">Trip finished</span>
    </div>
  </section>
</template>
<style scoped>
.topbar,
.hero-row {
  position: relative;
}
.trip-title {
  border: 0;
  background: none;
  padding: 0;
  color: var(--night);
  text-align: left;
  font:
    400 clamp(48px, 13vw, 86px)/0.88 Instrument Serif,
    serif;
  letter-spacing: -0.05em;
}
.trip-title span {
  color: var(--orange);
  font:
    14px Manrope,
    sans-serif;
}
.hero-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.hero-actions .primary-btn {
  grid-column: 1 / -1;
}
@media (min-width: 801px) {
  .hero-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-self: end;
    align-items: start;
    width: min(100%, 560px);
    gap: 10px;
  }
  .hero-actions > * {
    width: 100%;
    min-height: 48px;
    align-self: start;
  }
  .hero-actions .primary-btn {
    grid-column: auto;
  }
}
</style>
