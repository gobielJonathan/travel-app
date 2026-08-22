<script setup lang="ts">
import type { TripSyncRole } from "~/types/trip";

const props = defineProps<{
  title: string;
  crew: { initials: string; name: string }[];
  role: TripSyncRole;
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
    <div class="topbar-center">
      <nav><NuxtLink class="nav-active" to="/trip">My plans</NuxtLink></nav>
      <div class="mobile-header-label">{{ props.title }}</div>
    </div>
    <div class="top-actions">
      <div class="avatar">{{ props.crew[0]?.initials || "?" }}</div>
      <span v-if="props.role === 'host'" class="user-role">Host</span>
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
      <button class="primary-btn" type="button" @click="emit('askAssistant')">✦ Ask Roam AI</button>
      <button v-if="!props.completed" class="ghost-btn" type="button" @click="emit('completeTrip')">
        Finish trip
      </button>
      <span v-else class="trip-completed">Trip finished</span>
    </div>
  </section>
</template>
<style scoped>
.topbar,
.hero-row {
  position: relative;
}
.topbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  height: 64px;
  column-gap: 12px;
  border-bottom: 1px solid var(--line);
}
.topbar .brand {
  white-space: nowrap;
}
.topbar-center {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.topbar nav {
  display: none;
  gap: 28px;
  font:
    500 10px IBM Plex Mono,
    monospace;
  text-transform: uppercase;
}
.topbar nav a {
  color: var(--muted);
  text-decoration: none;
}
.topbar nav .router-link-active,
.topbar nav .nav-active {
  color: var(--night);
}
.mobile-header-label {
  min-width: 0;
  max-width: 100%;
  margin: 0;
  text-align: center;
}
.top-actions {
  min-width: 0;
  margin-left: 0;
}
.user-name {
  display: none;
}
.user-role {
  color: var(--orange);
  font:
    700 9px IBM Plex Mono,
    monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
.hero-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 22px;
  padding: 40px 0 24px;
}
.hero-row > div:first-child {
  min-width: 0;
}
.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hero-actions .primary-btn,
.hero-actions .ghost-btn {
  width: 100%;
}
.trip-completed {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font:
    500 10px IBM Plex Mono,
    monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
@media (min-width: 801px) {
  .topbar {
    height: 78px;
    column-gap: 24px;
  }
  .topbar-center {
    justify-content: flex-start;
  }
  .topbar nav {
    display: flex;
  }
  .user-name {
    display: inline;
    max-width: 18ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hero-row {
    flex-direction: row;
    align-items: end;
    justify-content: space-between;
    gap: 40px;
    padding: 66px 0 28px;
  }
  .hero-actions {
    flex: 0 0 auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    max-width: 100%;
    padding-left: 28px;
    border-left: 1px solid var(--line);
  }
  .hero-actions .primary-btn,
  .hero-actions .ghost-btn {
    width: auto;
    min-height: 48px;
    padding-inline: 16px;
    white-space: nowrap;
  }
  .trip-completed {
    min-height: 48px;
  }
}
</style>
