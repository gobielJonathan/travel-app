<script setup lang="ts">
import type { TripEvent } from "~/types/trip";
defineProps<{
  events: TripEvent[];
  activeDay: number;
  days: { label: string; date: string; month: string; count: number }[];
  dayTitle: string;
  synced: boolean;
  syncStatus: string;
}>();
const emit = defineEmits<{
  day: [number];
  select: [TripEvent];
  delete: [string];
  add: [];
  addDay: [];
}>();
</script>
<template>
  <section class="workspace">
    <aside class="day-list">
      <div class="section-label">
        Your itinerary <span>{{ days.length }} days</span>
      </div>
      <div class="day-scroll">
        <button
          v-for="(day, index) in days"
          :key="day.date"
          :class="['day-card', { selected: activeDay === index }]"
          @click="emit('day', index)"
        >
          <span class="day-name">{{ day.label }}</span
          ><strong>{{ day.date }}</strong
          ><span class="day-month">{{ day.month }}</span
          ><span class="day-count">{{ day.count }} stops</span>
        </button>
        <button class="add-day" @click="emit('addDay')">＋ Add day</button>
      </div>
    </aside>
    <section class="timeline-panel">
      <div class="timeline-head">
        <div>
          <div class="section-label">Day {{ activeDay + 1 }}</div>
          <h2>{{ dayTitle }}</h2>
        </div>
        <div class="timeline-actions">
          <NuxtLink class="ghost-btn" :to="`/trip-map?day=${activeDay}`">⌖ View map</NuxtLink>
          <button class="primary-btn" type="button" @click="emit('add')">＋ Add event</button>
        </div>
      </div>
      <div class="timeline">
        <article v-for="(event, index) in events" :key="event.id" class="event-row">
          <div class="event-time">{{ event.time }}</div>
          <div class="event-line">
            <span :class="['event-dot', event.tone]"
              ><b>{{ index + 1 }}</b></span
            ><span v-if="index < events.length - 1" class="line"></span>
          </div>
          <button class="event-card" @click="emit('select', event)">
            <div class="event-copy">
              <div class="event-tag" :class="event.tone">{{ event.tag }}</div>
              <h3>{{ event.title }}</h3>
              <p>{{ event.place }}</p>
              <small v-if="event.travelTime" class="event-travel"
                >⌁ {{ event.travelTime }} · {{ event.transport }}</small
              >
            </div>
            <span class="more-btn">•••</span>
          </button>
          <button
            class="delete-event-btn"
            type="button"
            aria-label="Delete event"
            @click.stop="emit('delete', event.id)"
          >
            ×
          </button>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped src="~/assets/styles/pages/trip.css"></style>

<style scoped>
.timeline-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
}
.timeline-head h2 {
  margin: 8px 0 0;
  color: var(--night);
  font:
    400 28px Instrument Serif,
    serif;
}
.timeline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.timeline-actions .ghost-btn,
.timeline-actions .primary-btn {
  padding: 9px 12px;
  font-size: 10px;
}

@media (max-width: 800px) {
  .timeline-head {
    display: block;
    padding: 16px 0 18px;
    border-bottom: 1px solid var(--line);
  }
  .timeline-head > div:first-child {
    display: block;
  }
  .timeline-head .section-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    color: var(--orange);
    font-size: 10px;
    letter-spacing: 0.12em;
  }
  .timeline-head .section-label::after {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--blue);
    content: "";
  }
  .timeline-head h2 {
    max-width: 100%;
    margin: 7px 0 16px;
    font-size: clamp(32px, 9vw, 42px);
    line-height: 0.95;
    letter-spacing: -0.04em;
  }
  .timeline-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
    margin: 0;
  }
  .timeline-actions .ghost-btn,
  .timeline-actions .primary-btn {
    display: inline-flex;
    min-height: 42px;
    align-items: center;
    justify-content: center;
    padding: 10px 8px;
    font-size: 9px;
    letter-spacing: 0.03em;
    text-align: center;
  }
  .timeline-actions .ghost-btn {
    border-color: var(--line);
    background: var(--paper);
  }
  .timeline-actions .primary-btn {
    box-shadow: 3px 3px 0 var(--night);
  }
}
</style>
