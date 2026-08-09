<script setup lang="ts">
import { computed, ref } from 'vue'

type EventItem = { time: string; title: string; place: string; tag: string; tone: string }

const activeDay = ref(1)
const showAssistant = ref(false)
const note = ref('')
const synced = ref(true)
const days = [
  { label: 'Wed', date: '18', month: 'Sep', count: 3 },
  { label: 'Thu', date: '19', month: 'Sep', count: 4 },
  { label: 'Fri', date: '20', month: 'Sep', count: 3 },
  { label: 'Sat', date: '21', month: 'Sep', count: 2 },
]
const events = ref<EventItem[]>([
  { time: '09:00', title: 'Breakfast at Gjusta', place: 'Gjusta Bakery · Venice', tag: 'Food', tone: 'gold' },
  { time: '11:30', title: 'Venice Beach boardwalk', place: 'Venice Beach · 12 min walk', tag: 'Explore', tone: 'blue' },
  { time: '14:00', title: 'Drive to Griffith Observatory', place: 'Transit · 38 min · $2.50', tag: 'Transit', tone: 'mint' },
  { time: '18:30', title: 'Sunset and dinner', place: 'The Misfit · Santa Monica', tag: 'Food', tone: 'coral' },
])

const dayTitle = computed(() => `${days[activeDay.value].label}, ${days[activeDay.value].month} ${days[activeDay.value].date}`)
function addEvent() {
  events.value.push({ time: '20:00', title: 'New plan stop', place: 'Add location details', tag: 'New', tone: 'purple' })
  synced.value = false
}
function saveNote() {
  if (note.value.trim()) {
    events.value.push({ time: '—', title: note.value, place: 'Added from your trip notes', tag: 'Note', tone: 'purple' })
    note.value = ''
    synced.value = false
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#"><span class="brand-mark">✦</span> roam</a>
      <nav><a class="nav-active" href="#plan">My plans</a><a href="#discover">Discover</a></nav>
      <div class="top-actions"><button class="icon-btn" aria-label="Search">⌕</button><div class="avatar">JM</div><span class="user-name">Jordan Miller</span><button class="chevron">⌄</button></div>
    </header>

    <main>
      <section class="hero-row">
        <div><div class="eyebrow"><span class="live-dot"></span> Local-first workspace</div><h1>Los Angeles <em>weekend</em></h1><p class="subtitle">Four friends, one easygoing trip. <span class="lock">⌁</span> Private to your group.</p></div>
        <div class="hero-actions"><button class="ghost-btn" @click="showAssistant = !showAssistant"><span>✦</span> Ask Roam AI</button><button class="primary-btn" @click="addEvent">＋ Add event</button></div>
      </section>

      <section class="trip-meta"><div class="meta-item"><span class="meta-icon">◷</span><div><strong>Sep 18 — 21, 2024</strong><small>4 days · Pacific Time</small></div></div><div class="meta-item"><span class="meta-icon">♧</span><div><strong>4 travelers</strong><small>All members can edit</small></div><div class="member-stack"><i>JM</i><i class="coral">AK</i><i class="blue">DL</i><i class="gold">+1</i></div></div><div class="meta-item map-meta"><span class="meta-icon">⌖</span><div><strong>Los Angeles, CA</strong><small>12 saved places</small></div><button class="mini-link">View map ↗</button></div></section>

      <section class="workspace">
        <aside class="day-list"><div class="section-label">Your itinerary <span>4 days</span></div><button v-for="(day, index) in days" :key="day.date" :class="['day-card', { selected: activeDay === index }]" @click="activeDay = index"><span class="day-name">{{ day.label }}</span><strong>{{ day.date }}</strong><span class="day-month">{{ day.month }}</span><span class="day-count">{{ day.count }} stops</span></button><button class="add-day">＋ Add day</button><div class="offline-card"><span class="offline-icon">⌁</span><div><strong>Saved on this device</strong><p>Your plan works offline and syncs with your group.</p></div></div></aside>
        <section class="timeline-panel"><div class="timeline-head"><div><div class="section-label">Day {{ activeDay + 1 }}</div><h2>{{ dayTitle }}</h2></div><div class="sync-state" :class="{ pending: !synced }"><span></span>{{ synced ? 'Synced just now' : 'Changes saved locally' }}</div></div><div class="timeline"><article v-for="(event, index) in events" :key="`${event.title}-${index}`" class="event-row"><div class="event-time">{{ event.time }}</div><div class="event-line"><span :class="['event-dot', event.tone]"></span><span v-if="index < events.length - 1" class="line"></span></div><div class="event-card"><div class="event-copy"><div class="event-tag" :class="event.tone">{{ event.tag }}</div><h3>{{ event.title }}</h3><p>{{ event.place }}</p></div><button class="more-btn">•••</button></div></article></div><button class="add-stop" @click="addEvent">＋ Add a stop to your day</button></section>
      </section>

      <section class="lower-grid"><div class="panel quick-panel"><div class="panel-heading"><div><div class="section-label">Trip pulse</div><h2>Keep it moving</h2></div><span class="sparkline">╱╲╱╲╱</span></div><div class="pulse-row"><div><strong>3.2 km</strong><span>walking today</span></div><div><strong>$86</strong><span>shared costs</span></div><div><strong>72°</strong><span>at 2:00 pm</span></div></div></div><div class="panel invite-panel"><div class="panel-heading"><div><div class="section-label">Your crew</div><h2>Travel together</h2></div><button class="more-btn">•••</button></div><div class="crew-row"><div class="big-avatar">JM</div><div><strong>Invite your people</strong><p>Share a private link to join this plan.</p></div><button class="share-btn">Share invite</button></div></div></section>

      <section v-if="showAssistant" class="assistant"><div class="assistant-orb">✦</div><div><strong>Roam AI</strong><p>Ask me to shape this trip. I only help with this trip.</p><div class="prompt-row"><input v-model="note" @keyup.enter="saveNote" placeholder="Try “add a coffee stop near Venice”" /><button @click="saveNote">Add to plan</button></div></div></section>
    </main>
    <footer><span>roam · made for the people you travel with</span><span><span class="footer-dot"></span> All changes encrypted & synced peer-to-peer</span></footer>
  </div>
</template>
