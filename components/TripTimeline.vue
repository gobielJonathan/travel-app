<script setup lang="ts">
import type { TripEvent } from '~/types/trip'
defineProps<{ events: TripEvent[]; activeDay: number; days: { label: string; date: string; month: string; count: number }[]; dayTitle: string; synced: boolean }>()
const emit = defineEmits<{ day: [number]; select: [TripEvent]; add: []; addDay: [] }>()
</script>
<template>
  <section class="workspace">
    <aside class="day-list"><div class="section-label">Your itinerary <span>{{ days.length }} days</span></div><button v-for="(day, index) in days" :key="day.date" :class="['day-card', { selected: activeDay === index }]" @click="emit('day', index)"><span class="day-name">{{ day.label }}</span><strong>{{ day.date }}</strong><span class="day-month">{{ day.month }}</span><span class="day-count">{{ day.count }} stops</span></button><button class="add-day" @click="emit('addDay')">＋ Add day</button><div class="offline-card"><span class="offline-icon">⌁</span><div><strong>Saved on this device</strong><p>Your plan works offline and syncs with your group.</p></div></div></aside>
    <section class="timeline-panel"><div class="timeline-head"><div><div class="section-label">Day {{ activeDay + 1 }}</div><h2>{{ dayTitle }}</h2></div><div class="sync-state" :class="{ pending: !synced }"><span></span>{{ synced ? 'Synced just now' : 'Changes saved locally' }}</div></div><div class="timeline"><article v-for="(event, index) in events" :key="event.id" class="event-row"><div class="event-time">{{ event.time }}</div><div class="event-line"><span :class="['event-dot', event.tone]"><b>{{ index + 1 }}</b></span><span v-if="index < events.length - 1" class="line"></span></div><button class="event-card" @click="emit('select', event)"><div class="event-copy"><div class="event-tag" :class="event.tone">{{ event.tag }}</div><h3>{{ event.title }}</h3><p>{{ event.place }}</p><small v-if="event.travelTime" class="event-travel">⌁ {{ event.travelTime }} · {{ event.transport }}</small></div><span class="more-btn">•••</span></button></article></div><button class="add-stop" @click="emit('add')">＋ Add a stop to your day</button></section>
  </section>
</template>
