<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createWorker } from 'tesseract.js'

type BillItem = { name: string; price: number; member: string; settled: boolean }
type EventItem = { time: string; title: string; place: string; tag: string; tone: string; coords: [number, number]; travelTime?: string; transport?: string; bill: BillItem[] }

const activeDay = ref(1)
const showAssistant = ref(false)
const showCreatePlan = ref(true)
const showEventDetail = ref(false)
const showInvite = ref(false)
const showMap = ref(false)
const selectedEvent = ref<EventItem | null>(null)
const mapElement = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let mapLayers: L.LayerGroup | null = null
const chatMessages = ref(['Hi Jordan. I can help shape your next trip. Tell me a destination, dates, and who’s coming.'])
const billItemName = ref('')
const billItemPrice = ref('')
const billItemMember = ref('JM')
const showReceipt = ref(false)
const receiptImage = ref('')
const receiptItems = ref([{ name: 'Receipt item', price: 12, member: 'JM', translated: false }])
const receiptTax = ref(0)
const receiptProcessing = ref(false)
const receiptProgress = ref(0)
const receiptText = ref('')
const receiptFile = ref<HTMLInputElement | null>(null)
const nearbySuggestions = [
  { title: 'Abbot Kinney coffee walk', tag: 'Food', price: '$12', distance: '0.8 mi' },
  { title: 'Santa Monica sunset bike ride', tag: 'Explore', price: '$18', distance: '2.1 mi' },
  { title: 'The Getty Center', tag: 'Culture', price: 'Free', distance: '6.4 mi' },
]
const inviteCopied = ref(false)
const note = ref('')
const synced = ref(true)
const routeStatus = ref('Demo route')
const routeSummary = ref('')
const days = [
  { label: 'Wed', date: '18', month: 'Sep', count: 3 },
  { label: 'Thu', date: '19', month: 'Sep', count: 4 },
  { label: 'Fri', date: '20', month: 'Sep', count: 3 },
  { label: 'Sat', date: '21', month: 'Sep', count: 2 },
]
const events = ref<EventItem[]>([
  { time: '09:00', title: 'Breakfast at Gjusta', place: 'Gjusta Bakery · Venice', tag: 'Food', tone: 'gold', coords: [33.995, -118.457], travelTime: '8 min walk', transport: 'Walking', bill: [] },
  { time: '11:30', title: 'Venice Beach boardwalk', place: 'Venice Beach · 12 min walk', tag: 'Explore', tone: 'blue', coords: [33.985, -118.469], travelTime: '12 min walk', transport: 'Walking', bill: [] },
  { time: '14:00', title: 'Drive to Griffith Observatory', place: 'Transit · 38 min · $2.50', tag: 'Transit', tone: 'mint', coords: [34.118, -118.300], travelTime: '38 min · $2.50', transport: 'Transit', bill: [] },
  { time: '18:30', title: 'Sunset and dinner', place: 'The Misfit · Santa Monica', tag: 'Food', tone: 'coral', coords: [34.010, -118.496], travelTime: '22 min transit', transport: 'Transit', bill: [] },
])

const dayTitle = computed(() => `${days[activeDay.value].label}, ${days[activeDay.value].month} ${days[activeDay.value].date}`)
function addEvent(title = 'New plan stop', place = 'Add location details', tag = 'New') {
  const event = { time: '20:00', title, place, tag, tone: 'purple', coords: [34.02, -118.46] as [number, number], bill: [] }
  events.value.push(event)
  synced.value = false
  openEvent(event)
}
function startReceiptCapture() { receiptFile.value?.click() }
function handleReceipt(file?: File) {
  if (!file) return
  receiptProcessing.value = true
  const reader = new FileReader()
  reader.onload = async () => {
    receiptImage.value = String(reader.result)
    receiptProcessing.value = true
    receiptProgress.value = 0
    try {
      const worker = await createWorker('eng', 1, { logger: message => { receiptProgress.value = Math.round(message.progress * 100) } })
      const result = await worker.recognize(file)
      receiptText.value = result.data.text
      const parsed = result.data.text.split('\\n').map(line => line.trim()).map(line => line.match(/^(.+?)\\s+(\\d+[.,]\\d{2})$/)).filter(Boolean).slice(0, 12)
      if (parsed.length) receiptItems.value = parsed.map(match => ({ name: match![1], price: Number(match![2].replace(',', '.')), member: 'JM', translated: false }))
      await worker.terminate()
    } catch {
      receiptText.value = 'OCR could not read this receipt. Check the fields manually.'
    } finally {
      receiptProcessing.value = false
      showReceipt.value = true
    }
  }
  reader.readAsDataURL(file)
}
function translateReceiptItem(item: { name: string; translated: boolean }) {
  item.translated = true
  item.name = item.name === 'Receipt item' ? 'Shared meal' : item.name
}
function receiptTotal(member?: string) {
  const subtotal = receiptItems.value.filter(item => !member || item.member === member).reduce((sum, item) => sum + item.price, 0)
  const base = receiptItems.value.reduce((sum, item) => sum + item.price, 0)
  return subtotal + (base ? subtotal / base * receiptTax.value : 0)
}
function confirmReceipt() {
  if (!selectedEvent.value) return
  selectedEvent.value.bill = receiptItems.value.map(item => ({ name: item.name, price: item.price + (receiptTotal() ? item.price / receiptItems.value.reduce((sum, current) => sum + current.price, 0) * receiptTax.value : 0), member: item.member, settled: false }))
  showReceipt.value = false
  synced.value = false
}
function addBillItem() {
  if (!selectedEvent.value || !billItemName.value.trim() || !Number(billItemPrice.value)) return
  selectedEvent.value.bill.push({ name: billItemName.value.trim(), price: Number(billItemPrice.value), member: billItemMember.value, settled: false })
  billItemName.value = ''
  billItemPrice.value = ''
  synced.value = false
}
function toggleSettled(item: BillItem) { item.settled = !item.settled; synced.value = false }
function showMapPanel() {
  showMap.value = true
  nextTick(() => {
    if (!mapElement.value) return
    map = L.map(mapElement.value).setView(events.value[0].coords, 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map)
    mapLayers = L.layerGroup().addTo(map)
    const points = events.value.map(event => event.coords)
    events.value.forEach((event, index) => {
      const icon = L.divIcon({ className: `event-pin event-pin-${event.tone}`, html: `<span>${index + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] })
      L.marker(event.coords, { icon }).bindPopup(`<strong>${index + 1}. ${event.title}</strong><br>${event.place}<br><small>${event.travelTime ?? 'Travel time not set'}</small>`).addTo(mapLayers!)
    })
    L.polyline(points, { color: '#d5cfc4', weight: 3, dashArray: '5 8' }).addTo(mapLayers)
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] })
    loadRealRoute(points)
  })
}
async function loadRealRoute(points: [number, number][]) {
  if (!mapLayers || points.length < 2) return
  routeStatus.value = 'Finding best walking route…'
  try {
    const coordinates = points.map(([lat, lon]) => `${lon},${lat}`).join(';')
    const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson&alternatives=true`)
    if (!response.ok) throw new Error('Route request failed')
    const data = await response.json() as { routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }> }
    const routes = data.routes ?? []
    if (!routes.length || !mapLayers) throw new Error('No route found')
    const best = routes.reduce((winner, route) => route.duration < winner.duration || (route.duration === winner.duration && route.distance < winner.distance) ? route : winner)
    const geometry = best.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number])
    L.polyline(geometry, { color: '#d9644e', weight: 5, opacity: 0.9 }).addTo(mapLayers)
    routeStatus.value = 'Best walking route'
    routeSummary.value = `${(best.distance / 1000).toFixed(1)} km · ${Math.round(best.duration / 60)} min`
  } catch {
    routeStatus.value = 'Demo route · offline fallback'
    routeSummary.value = 'Live route unavailable'
  }
}
function closeMap() { map?.remove(); map = null; mapLayers = null; showMap.value = false }
function sendChat() {
  const prompt = note.value.trim()
  if (!prompt) return
  chatMessages.value.push(prompt)
  chatMessages.value.push(/trip|travel|visit|food|place|day|route|hotel|flight/i.test(prompt) ? 'I can shape that into your trip. Confirm a destination, dates, and pace, then I’ll suggest activities.' : 'I only help with this trip.')
  note.value = ''
}
function addSuggestion(suggestion: typeof nearbySuggestions[number]) { addEvent(suggestion.title, `Nearby · ${suggestion.distance} · ${suggestion.price}`, suggestion.tag) }
onBeforeUnmount(() => map?.remove())
function openEvent(event: EventItem) {
  selectedEvent.value = event
  showEventDetail.value = true
}
function copyInvite() {
  inviteCopied.value = true
  showInvite.value = true
  window.setTimeout(() => { inviteCopied.value = false }, 2200)
}
function startPlanning() {
  showCreatePlan.value = false
}
</script>

<template>
  <div class="app-shell">
    <section v-if="showCreatePlan" class="create-plan-page">
      <div class="create-brand"><span class="brand-mark">✦</span> roam</div>
      <div class="chat-layout">
        <div class="welcome-copy"><div class="eyebrow"><span class="live-dot"></span> Your trip, your way</div><h1>Where are you<br><em>headed next?</em></h1><p>Tell Roam what sounds good. It will shape a first draft you can make your own.</p><div class="suggestions"><button @click="note = 'Plan a long weekend in Lisbon for four friends'">Lisbon with friends</button><button @click="note = 'Plan a food-focused trip to Tokyo'">Tokyo food crawl</button><button @click="note = 'Plan a quiet nature trip in Iceland'">Iceland, slow pace</button></div></div>
        <div class="chat-card"><div class="chat-card-head"><div class="assistant-orb">✦</div><div><strong>Roam AI</strong><small>Trip planner</small></div><span class="chat-lock">⌁ Private</span></div><div class="chat-messages"><div class="message ai">Hi Jordan. I can help shape your next trip. Tell me a destination, dates, and who’s coming.</div><div class="message hint">I only help with this trip.</div></div><div class="chat-input"><textarea v-model="note" placeholder="Try “a 4-day food trip to Lisbon…”" @keyup.enter.exact="startPlanning"></textarea><button @click="startPlanning">Send <span>↗</span></button></div><div class="chat-footer">Your plan stays on your devices · encrypted peer-to-peer</div></div>
      </div>
    </section>
    <header v-else class="topbar">
      <a class="brand" href="#"><span class="brand-mark">✦</span> roam</a>
      <nav><a class="nav-active" href="#plan">My plans</a><a href="#discover">Discover</a></nav>
      <div class="mobile-header-label">Los Angeles weekend</div>
      <div class="top-actions"><button class="icon-btn" aria-label="Search">⌕</button><div class="avatar">JM</div><span class="user-name">Jordan Miller</span><button class="chevron">⌄</button></div>
    </header>

    <main v-if="!showCreatePlan">
      <section class="hero-row">
        <div><div class="eyebrow"><span class="live-dot"></span> Local-first workspace</div><h1>Los Angeles <em>weekend</em></h1><p class="subtitle">Four friends, one easygoing trip. <span class="lock">⌁</span> Private to your group.</p></div>
        <div class="hero-actions"><button class="ghost-btn" @click="showAssistant = !showAssistant"><span>✦</span> Ask Roam AI</button><button class="primary-btn" @click="() => addEvent()">＋ Add event</button></div>
      </section>

      <section class="trip-meta"><div class="meta-item"><span class="meta-icon">◷</span><div><strong>Sep 18 — 21, 2024</strong><small>4 days · Pacific Time</small></div></div><div class="meta-item"><span class="meta-icon">♧</span><div><strong>4 travelers</strong><small>All members can edit</small></div><div class="member-stack"><i>JM</i><i class="coral">AK</i><i class="blue">DL</i><i class="gold">+1</i></div></div><div class="meta-item map-meta"><span class="meta-icon">⌖</span><div><strong>Los Angeles, CA</strong><small>12 saved places</small></div><button class="mini-link" @click="showMapPanel">View map ↗</button></div></section>

      <section class="workspace">
        <aside class="day-list"><div class="section-label">Your itinerary <span>4 days</span></div><button v-for="(day, index) in days" :key="day.date" :class="['day-card', { selected: activeDay === index }]" @click="activeDay = index"><span class="day-name">{{ day.label }}</span><strong>{{ day.date }}</strong><span class="day-month">{{ day.month }}</span><span class="day-count">{{ day.count }} stops</span></button><button class="add-day">＋ Add day</button><div class="offline-card"><span class="offline-icon">⌁</span><div><strong>Saved on this device</strong><p>Your plan works offline and syncs with your group.</p></div></div></aside>
        <section class="timeline-panel"><div class="timeline-head"><div><div class="section-label">Day {{ activeDay + 1 }}</div><h2>{{ dayTitle }}</h2></div><div class="sync-state" :class="{ pending: !synced }"><span></span>{{ synced ? 'Synced just now' : 'Changes saved locally' }}</div></div><div class="timeline"><article v-for="(event, index) in events" :key="`${event.title}-${index}`" class="event-row"><div class="event-time">{{ event.time }}</div><div class="event-line"><span :class="['event-dot', event.tone]"><b>{{ index + 1 }}</b></span><span v-if="index < events.length - 1" class="line"></span></div><div class="event-card" @click="openEvent(event)"><div class="event-copy"><div class="event-tag" :class="event.tone">{{ event.tag }}</div><h3>{{ event.title }}</h3><p>{{ event.place }}</p><small v-if="event.travelTime" class="event-travel">⌁ {{ event.travelTime }} · {{ event.transport }}</small></div><button class="more-btn" @click.stop="openEvent(event)">•••</button></div></article></div><button class="add-stop" @click="() => addEvent()">＋ Add a stop to your day</button></section>
      </section>

      <section class="lower-grid"><div class="panel quick-panel"><div class="panel-heading"><div><div class="section-label">Trip pulse</div><h2>Keep it moving</h2></div><span class="sparkline">╱╲╱╲╱</span></div><div class="pulse-row"><div><strong>3.2 km</strong><span>walking today</span></div><div><strong>$86</strong><span>shared costs</span></div><div><strong>72°</strong><span>at 2:00 pm</span></div></div></div><div class="panel invite-panel"><div class="panel-heading"><div><div class="section-label">Your crew</div><h2>Travel together</h2></div><button class="more-btn">•••</button></div><div class="crew-row"><div class="big-avatar">JM</div><div><strong>Invite your people</strong><p>Share a private link to join this plan.</p></div><button class="share-btn" @click="copyInvite">Share invite</button></div></div></section>

      <section v-if="showAssistant" class="assistant"><button class="close-btn" @click="showAssistant = false">×</button><div class="assistant-orb">✦</div><div class="assistant-body"><strong>Roam AI</strong><p>Ask me to shape this trip. I only help with this trip.</p><div class="assistant-messages"><div v-for="(message, index) in chatMessages" :key="index" :class="['assistant-message', { user: index % 2 === 1 }]">{{ message }}</div></div><div class="prompt-row"><input v-model="note" @keyup.enter="sendChat" placeholder="Try “add a coffee stop near Venice”" /><button @click="sendChat">Send</button></div></div></section>
    </main>
    <div v-if="showEventDetail && selectedEvent" class="overlay" @click.self="showEventDetail = false"><aside class="detail-drawer"><button class="close-btn" @click="showEventDetail = false">×</button><div class="event-tag" :class="selectedEvent.tone">{{ selectedEvent.tag }}</div><h2>{{ selectedEvent.title }}</h2><p class="detail-place">⌖ {{ selectedEvent.place }}</p><div class="detail-section"><span class="section-label">Schedule</span><strong>{{ selectedEvent.time }} · Thu, Sep 19</strong></div><div class="detail-section"><span class="section-label">About this stop</span><textarea :value="`A planned stop for your group. Add notes, tickets, and practical details here.`"></textarea></div><div class="detail-section detail-stats"><div><span class="section-label">Estimated cost</span><strong>$24 / person</strong></div><div><span class="section-label">Travel time</span><strong>12 min walk</strong></div></div><div class="detail-section bill-section"><div class="bill-heading"><span class="section-label">Split bill</span><strong v-if="selectedEvent.bill.length">${{ selectedEvent.bill.reduce((sum, item) => sum + item.price, 0).toFixed(2) }} · {{ selectedEvent.bill.length }} item{{ selectedEvent.bill.length === 1 ? '' : 's' }}</strong><strong v-else class="bill-empty-label">No bill added</strong></div><div v-if="receiptProcessing" class="receipt-processing"><strong>Reading receipt… {{ receiptProgress }}%</strong><small>OCR runs in your browser</small></div><div v-else-if="!selectedEvent.bill.length" class="receipt-capture" @click="startReceiptCapture"><div class="camera-icon">⌾</div><strong>Scan receipt</strong><small>Capture a receipt and split it with your crew</small><input ref="receiptFile" type="file" accept="image/*" capture="environment" hidden @change="handleReceipt(($event.target as HTMLInputElement).files?.[0])" /></div><div v-else class="bill-form"><input v-model="billItemName" placeholder="Item name" /><input v-model="billItemPrice" type="number" min="0" step="0.01" placeholder="Price" /><select v-model="billItemMember"><option>JM</option><option>AK</option><option>DL</option><option>+1</option></select><button @click="addBillItem">＋ Add item</button></div><div v-if="selectedEvent.bill.length" class="bill-items"><div v-for="item in selectedEvent.bill" :key="item.name + item.member" class="bill-item"><span>{{ item.name }} · {{ item.member }}</span><strong>${{ item.price.toFixed(2) }}</strong><button @click="toggleSettled(item)">{{ item.settled ? 'Settled' : 'Settle' }}</button></div><div class="bill-total"><span>Total</span><strong>${{ selectedEvent.bill.reduce((sum, item) => sum + item.price, 0).toFixed(2) }}</strong></div></div><p v-else class="empty-bill">Add shared costs for this event and assign each item to a traveler.</p></div><div class="detail-section"><span class="section-label">Suggested activities nearby</span><button v-for="suggestion in nearbySuggestions" :key="suggestion.title" class="suggestion-row" @click="addSuggestion(suggestion)"><span><strong>{{ suggestion.title }}</strong><small>{{ suggestion.tag }} · {{ suggestion.distance }}</small></span><b>{{ suggestion.price }} ＋</b></button></div><button class="primary-btn detail-save" @click="showEventDetail = false; synced = false">Save details</button></aside></div>
    <div v-if="showReceipt" class="overlay"><section class="receipt-page"><button class="close-btn" @click="showReceipt = false">×</button><div class="section-label">Receipt</div><h2>Check the split</h2><p class="receipt-subtitle">OCR draft · review items before sharing costs.</p><img v-if="receiptImage" :src="receiptImage" class="receipt-photo" alt="Captured receipt" /><div class="receipt-items"><div v-for="item in receiptItems" :key="item.name" class="receipt-item"><input v-model="item.name" /><input v-model.number="item.price" type="number" min="0" step="0.01" /><select v-model="item.member"><option>JM</option><option>AK</option><option>DL</option><option>+1</option></select><button class="translate-item" @click="translateReceiptItem(item)">{{ item.translated ? 'Translated to English' : 'Translate item to English' }}</button></div></div><button class="add-receipt-item" @click="receiptItems.push({ name: 'New item', price: 0, member: 'JM', translated: false })">＋ Add item</button><label class="tax-field">Tax <input v-model.number="receiptTax" type="number" min="0" step="0.01" placeholder="0.00" /></label><div class="receipt-total"><span>Total with tax</span><strong>${{ receiptTotal().toFixed(2) }}</strong></div><button class="primary-btn receipt-confirm" @click="confirmReceipt">Confirm split</button></section></div>
    <div v-if="showMap" class="overlay map-overlay"><section class="map-modal"><button class="close-btn" @click="closeMap">×</button><div class="section-label">Route preview</div><h2>Los Angeles stops</h2><p class="map-summary">{{ events.length }} stops · {{ routeStatus }}<span v-if="routeSummary"> · {{ routeSummary }}</span></p><div ref="mapElement" class="map-canvas"></div><div class="route-legend"><span class="route-line"></span><span>Ordered itinerary route · demo route</span></div></section></div>
    <div v-if="showInvite" class="overlay" @click.self="showInvite = false"><div class="invite-modal"><button class="close-btn" @click="showInvite = false">×</button><div class="assistant-orb">✦</div><h2>Invite your crew</h2><p>Share this code with friends. They can join and edit this plan.</p><div class="invite-code">ROAM-LA24-7KQ</div><button class="primary-btn copy-btn" @click="copyInvite">{{ inviteCopied ? 'Copied to clipboard' : 'Copy invite code' }}</button><small>Reusable until you revoke it · encrypted invite</small></div></div>
    <footer v-if="!showCreatePlan"><span>roam · made for the people you travel with</span><span><span class="footer-dot"></span> All changes encrypted & synced peer-to-peer</span></footer>
    <nav v-if="!showCreatePlan" class="mobile-bottom-nav"><button class="active">⌂<span>Plan</span></button><button @click="showAssistant = true">✦<span>Ask AI</span></button><button @click="showInvite = true">♧<span>People</span></button><button @click="showMapPanel">⌖<span>Map</span></button></nav>
  </div>
</template>
