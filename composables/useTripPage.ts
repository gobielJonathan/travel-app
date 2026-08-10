import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type * as Leaflet from 'leaflet'

type BillItem = { name: string; price: number; member: string; settled: boolean }
type EventItem = { time: string; title: string; place: string; tag: string; tone: string; coords: [number, number]; travelTime?: string; transport?: string; bill: BillItem[] }
type ReceiptItem = { name: string; price: number; member: string; translated: boolean; translation: string }

export function useTripPage() {
  const activeDay = ref(1)
  const showAssistant = ref(false)
  const showCreatePlan = ref(true)
  const showEventDetail = ref(false)
  const showInvite = ref(false)
  const showMap = ref(false)
  const selectedEvent = ref<EventItem | null>(null)
  const mapElement = ref<HTMLElement | null>(null)
  let map: Leaflet.Map | null = null
  let mapLayers: Leaflet.LayerGroup | null = null
  let leaflet: typeof import('leaflet') | null = null
  const chatMessages = ref(['Hi Jordan. I can help shape your next trip. Tell me a destination, dates, and who’s coming.'])
  const billItemName = ref('')
  const billItemPrice = ref('')
  const billItemMember = ref('JM')
  const showReceipt = ref(false)
  const receiptImage = ref('')
  const receiptItems = ref<ReceiptItem[]>([{ name: 'Receipt item', price: 12, member: 'JM', translated: false, translation: '' }])
  const receiptTax = ref(0)
  const receiptProcessing = ref(false)
  const receiptProgress = ref(0)
  const receiptFile = ref<HTMLInputElement | null>(null)
  const nearbySuggestions = [{ title: 'Abbot Kinney coffee walk', tag: 'Food', price: '$12', distance: '0.8 mi' }, { title: 'Santa Monica sunset bike ride', tag: 'Explore', price: '$18', distance: '2.1 mi' }, { title: 'The Getty Center', tag: 'Culture', price: 'Free', distance: '6.4 mi' }]
  const inviteCopied = ref(false)
  const note = ref('')
  const synced = ref(true)
  const routeStatus = ref('Demo route')
  const routeSummary = ref('')
  const days = [{ label: 'Wed', date: '18', month: 'Sep', count: 3 }, { label: 'Thu', date: '19', month: 'Sep', count: 4 }, { label: 'Fri', date: '20', month: 'Sep', count: 3 }, { label: 'Sat', date: '21', month: 'Sep', count: 2 }]
  const events = ref<EventItem[]>([
    { time: '09:00', title: 'Breakfast at Gjusta', place: 'Gjusta Bakery · Venice', tag: 'Food', tone: 'gold', coords: [33.995, -118.457], travelTime: '8 min walk', transport: 'Walking', bill: [] },
    { time: '11:30', title: 'Venice Beach boardwalk', place: 'Venice Beach · 12 min walk', tag: 'Explore', tone: 'blue', coords: [33.985, -118.469], travelTime: '12 min walk', transport: 'Walking', bill: [] },
    { time: '14:00', title: 'Drive to Griffith Observatory', place: 'Transit · 38 min · $2.50', tag: 'Transit', tone: 'mint', coords: [34.118, -118.300], travelTime: '38 min · $2.50', transport: 'Transit', bill: [] },
    { time: '18:30', title: 'Sunset and dinner', place: 'The Misfit · Santa Monica', tag: 'Food', tone: 'coral', coords: [34.010, -118.496], travelTime: '22 min transit', transport: 'Transit', bill: [] },
  ])
  const dayTitle = computed(() => { const day = days[activeDay.value] ?? days[0]!; return `${day.label}, ${day.month} ${day.date}` })
  function openEvent(event: EventItem) { selectedEvent.value = event; showEventDetail.value = true }
  function addEvent(title = 'New plan stop', place = 'Add location details', tag = 'New') { const event: EventItem = { time: '20:00', title, place, tag, tone: 'purple', coords: [34.02, -118.46], bill: [] }; events.value.push(event); synced.value = false; openEvent(event) }
  function startPlanning() { showCreatePlan.value = false }
  function startReceiptCapture() { receiptFile.value?.click() }
  function handleReceipt(file?: File) { if (!file) return; receiptProcessing.value = true; const reader = new FileReader(); reader.onload = async () => { receiptImage.value = String(reader.result); receiptProgress.value = 0; try { const { createWorker } = await import('tesseract.js'); const worker = await createWorker('eng', 1, { logger: message => { receiptProgress.value = Math.round(message.progress * 100) } }); const text = (await worker.recognize(file)).data.text; const parsed = text.split('\n').map(line => line.trim().match(/^(.+?)\s+(\d+[.,]\d{2})$/)).flatMap(match => match?.[1] && match[2] ? [{ name: match[1], price: Number(match[2].replace(',', '.')), member: 'JM', translated: false, translation: '' }] : []); if (parsed.length) receiptItems.value = parsed; await worker.terminate() } catch { } finally { receiptProcessing.value = false; showReceipt.value = true } }; reader.readAsDataURL(file) }
  function receiptTotal(member?: string) { const subtotal = receiptItems.value.filter(item => !member || item.member === member).reduce((sum, item) => sum + item.price, 0); const base = receiptItems.value.reduce((sum, item) => sum + item.price, 0); return subtotal + (base ? subtotal / base * receiptTax.value : 0) }
  function confirmReceipt() { if (!selectedEvent.value) return; const base = receiptItems.value.reduce((sum, item) => sum + item.price, 0); selectedEvent.value.bill = receiptItems.value.map(item => ({ name: item.name, price: item.price + (base ? item.price / base * receiptTax.value : 0), member: item.member, settled: false })); showReceipt.value = false; synced.value = false }
  function addBillItem() { if (!selectedEvent.value || !billItemName.value.trim() || !Number(billItemPrice.value)) return; selectedEvent.value.bill.push({ name: billItemName.value.trim(), price: Number(billItemPrice.value), member: billItemMember.value, settled: false }); billItemName.value = ''; billItemPrice.value = ''; synced.value = false }
  function toggleSettled(item: BillItem) { item.settled = !item.settled; synced.value = false }
  function translateReceiptItem(item: ReceiptItem) { item.translation = item.name === 'Receipt item' ? 'Shared meal' : item.name; item.translated = true }
  async function showMapPanel() { showMap.value = true; leaflet ??= await import('leaflet'); await nextTick(); const firstEvent = events.value[0]; if (!mapElement.value || !leaflet || !firstEvent) return; map = leaflet.map(mapElement.value).setView(firstEvent.coords, 11); leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map); mapLayers = leaflet.layerGroup().addTo(map); const points = events.value.map(event => event.coords); events.value.forEach((event, index) => leaflet!.marker(event.coords).bindPopup(`<strong>${index + 1}. ${event.title}</strong><br>${event.place}`).addTo(mapLayers!)); leaflet.polyline(points, { color: '#d5cfc4', weight: 3, dashArray: '5 8' }).addTo(mapLayers); map.fitBounds(leaflet.latLngBounds(points), { padding: [24, 24] }); loadRealRoute(points) }
  async function loadRealRoute(points: [number, number][]) { if (!mapLayers || !leaflet || points.length < 2) return; routeStatus.value = 'Finding best walking route…'; try { const coordinates = points.map(([lat, lon]) => `${lon},${lat}`).join(';'); const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson&alternatives=true`); if (!response.ok) throw new Error('Route request failed'); const data = await response.json() as { routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }> }; const routes = data.routes ?? []; if (!routes.length) throw new Error('No route found'); const best = routes.reduce((winner, route) => route.duration < winner.duration ? route : winner); leaflet.polyline(best.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]), { color: '#d9644e', weight: 5, opacity: 0.9 }).addTo(mapLayers); routeStatus.value = 'Best walking route'; routeSummary.value = `${(best.distance / 1000).toFixed(1)} km · ${Math.round(best.duration / 60)} min` } catch { routeStatus.value = 'Demo route · offline fallback'; routeSummary.value = 'Live route unavailable' } }
  function closeMap() { map?.remove(); map = null; mapLayers = null; showMap.value = false }
  function sendChat() { const prompt = note.value.trim(); if (!prompt) return; chatMessages.value.push(prompt, /trip|travel|visit|food|place|day|route|hotel|flight/i.test(prompt) ? 'I can shape that into your trip. Confirm a destination, dates, and pace, then I’ll suggest activities.' : 'I only help with this trip.'); note.value = '' }
  function addSuggestion(suggestion: typeof nearbySuggestions[number]) { addEvent(suggestion.title, `Nearby · ${suggestion.distance} · ${suggestion.price}`, suggestion.tag) }
  function copyInvite() { inviteCopied.value = true; showInvite.value = true; window.setTimeout(() => { inviteCopied.value = false }, 2200) }
  onBeforeUnmount(() => map?.remove())
  return { activeDay, showAssistant, showCreatePlan, showEventDetail, showInvite, showMap, selectedEvent, mapElement, chatMessages, billItemName, billItemPrice, billItemMember, showReceipt, receiptImage, receiptItems, receiptTax, receiptProcessing, receiptProgress, receiptFile, inviteCopied, note, synced, routeStatus, routeSummary, days, events, dayTitle, nearbySuggestions, openEvent, addEvent, addSuggestion, startPlanning, startReceiptCapture, handleReceipt, receiptTotal, confirmReceipt, addBillItem, toggleSettled, translateReceiptItem, showMapPanel, closeMap, sendChat, copyInvite }
}
