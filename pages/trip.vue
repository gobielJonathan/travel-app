<script setup lang="ts">
import type { TripEvent } from "~/types/trip";
import type { GeneratedItinerary } from "~/types/itinerary";
import { loadItinerary, saveItinerary } from "~/utils/itineraryStorage";
const {
  title,
  activeDay,
  days,
  selectedEvents,
  dayTitle,
  crew,
  synced,
  addDay,
  addEvent,
  replaceItinerary,
  syncWorkspace,
} = useTrip();

onMounted(() => {
  void syncWorkspace();
  void tripSync.connect(() => undefined);
});
const route = useRoute();
const { inviteCode } = useInvite();
const tripSync = useTripSync(inviteCode);
const assistantOpen = ref(false);
const discussionPreview = ref(false);
const discussionMessages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
const generatedPreview = ref<GeneratedItinerary | null>(null);
const itineraryLoading = ref(false);
const itineraryError = ref("");
if (import.meta.client && route.query.preview === "1") {
  discussionMessages.value = JSON.parse(sessionStorage.getItem("roam-discussion:default") ?? "[]");
  discussionPreview.value = discussionMessages.value.some((message) => message.role === "user");
}
async function generateItinerary() {
  itineraryLoading.value = true;
  itineraryError.value = "";
  try {
    const response = await $fetch<GeneratedItinerary | { needs: string }>("/api/ai/itinerary", {
      method: "POST",
      body: { messages: discussionMessages.value },
    });
    if ("needs" in response) {
      itineraryError.value = `Before generating, tell Roam AI your ${response.needs}.`;
      return;
    }
    generatedPreview.value = response;
    await saveItinerary(response);
  } catch (error) {
    itineraryError.value =
      error instanceof Error ? error.message : "Itinerary generation unavailable";
  } finally {
    itineraryLoading.value = false;
  }
}
function closeDiscussionPreview() {
  discussionPreview.value = false;
  if (import.meta.client) sessionStorage.removeItem("roam-discussion:default");
}
function useDiscussionPlan() {
  if (!generatedPreview.value) return;
  replaceItinerary(generatedPreview.value);
  closeDiscussionPreview();
}
if (import.meta.client && route.query.preview === "1") {
  loadItinerary().then((saved) => {
    if (saved) generatedPreview.value = saved;
  });
}
const assistantNote = ref("");
const {
  messages: assistantMessages,
  loading: assistantLoading,
  error: assistantError,
  ask: askAssistant,
} = useAiDiscussion({
  context: () =>
    `${title.value}; ${dayTitle.value}; ${selectedEvents.value.map((event) => `${event.time} ${event.title} at ${event.place}`).join("; ")}`,
});
function sendAssistantMessage() {
  const prompt = assistantNote.value.trim();
  if (!prompt) return;
  void askAssistant(prompt);
  assistantNote.value = "";
}
const selectedEvent = ref<TripEvent | null>(null);
const editingTitle = ref(false);
const draftTitle = ref("");
function editTitle() {
  draftTitle.value = title.value;
  editingTitle.value = true;
}
function saveTitle() {
  title.value = draftTitle.value;
  editingTitle.value = false;
}
function cancelTitle() {
  editingTitle.value = false;
}
const showAddEvent = ref(false);
const showInvite = ref(false);
const receiptFile = ref<HTMLInputElement | null>(null);
const receiptProcessing = ref(false);
const receiptMessage = ref("");
function scanReceipt() {
  receiptMessage.value = "";
  receiptFile.value?.click();
}
async function handleReceipt(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !selectedEvent.value) return;
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
    receiptMessage.value = "Use an image smaller than 10 MB.";
    return;
  }
  receiptProcessing.value = true;
  let worker: {
    terminate: () => Promise<unknown>;
    recognize: (image: File) => Promise<{ data: { text: string } }>;
  } | null = null;
  try {
    const { createWorker } = await import("tesseract.js");
    worker = await createWorker("eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core.wasm.js",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
    });
    const text = (await worker.recognize(file)).data.text;
    const items = text
      .split("\n")
      .map((line) => line.trim().match(/^(.+?)\\s+(\\d+[.,]\\d{2})$/))
      .flatMap((match) =>
        match?.[1] && match[2]
          ? [
              {
                name: match[1],
                price: Number(match[2].replace(",", ".")),
                member: "JM",
                settled: false,
              },
            ]
          : [],
      );
    if (!items.length) {
      receiptMessage.value = "No priced items found. Try a clearer receipt.";
      return;
    }
    selectedEvent.value.bill.push(...items);
    receiptMessage.value = `${items.length} item${items.length === 1 ? "" : "s"} added.`;
  } catch {
    receiptMessage.value = "Receipt scan failed. Check image format or try another image.";
  } finally {
    await worker?.terminate();
    receiptProcessing.value = false;
    if (receiptFile.value) receiptFile.value.value = "";
  }
}
function selectEvent(event: TripEvent) {
  selectedEvent.value = event;
}
function submitEvent(input: {
  title: string;
  place: string;
  time: string;
  tag: string;
  coords: [number, number];
}) {
  addEvent(input);
  showAddEvent.value = false;
}
</script>
<template>
  <div class="app-shell trip-page">
    <header class="topbar">
      <NuxtLink class="brand" to="/"><span class="brand-mark">✦</span> roam</NuxtLink>
      <nav>
        <NuxtLink class="nav-active" to="/trip">My plans</NuxtLink
        ><NuxtLink to="/trip-map">Map</NuxtLink>
      </nav>
      <div class="mobile-header-label">{{ title }}</div>
      <div class="top-actions">
        <div class="avatar">JM</div>
        <span class="user-name">Jordan Miller</span>
      </div>
    </header>
    <main>
      <section class="hero-row">
        <div>
          <div class="eyebrow"><span class="live-dot"></span> Local-first workspace</div>
          <div v-if="editingTitle" class="trip-title-editor">
            <input
              v-model="draftTitle"
              autofocus
              aria-label="Trip title"
              @keyup.enter="saveTitle"
              @keyup.esc="cancelTitle"
            /><button class="primary-btn" @click="saveTitle">Save</button
            ><button class="ghost-btn" @click="cancelTitle">Cancel</button>
          </div>
          <button v-else class="trip-title" @click="editTitle" title="Edit trip title">
            {{ title }} <span>✎</span>
          </button>
          <p class="subtitle">
            Four friends, one easygoing trip. <span class="lock">⌁</span> Private to your group.
          </p>
        </div>
        <div class="hero-actions">
          <NuxtLink class="ghost-btn" to="/trip-map">⌖ View map</NuxtLink
          ><button class="ghost-btn" @click="assistantOpen = true">✦ Ask Roam AI</button
          ><button class="primary-btn" @click="showAddEvent = true">＋ Add event</button>
        </div>
      </section>
      <section class="trip-meta">
        <div class="meta-item">
          <span class="meta-icon">◷</span>
          <div><strong>Sep 18 — 21, 2024</strong><small>4 days · Pacific Time</small></div>
        </div>
        <div class="meta-item">
          <span class="meta-icon">♧</span>
          <div>
            <strong>{{ crew.length }} travelers</strong><small>All members can edit</small>
          </div>
        </div>
        <div class="meta-item map-meta">
          <span class="meta-icon">⌖</span>
          <div><strong>Los Angeles, CA</strong><small>12 saved places</small></div>
        </div>
      </section>
      <TripTimeline
        :events="selectedEvents"
        :active-day="activeDay"
        :days="days"
        :day-title="dayTitle"
        :synced="synced"
        @day="activeDay = $event"
        @select="selectEvent"
        @add="showAddEvent = true"
        @add-day="addDay"
      />
      <section class="lower-grid">
        <div class="panel quick-panel">
          <div class="panel-heading">
            <div>
              <div class="section-label">Trip pulse</div>
              <h2>Keep it moving</h2>
            </div>
          </div>
          <div class="pulse-row">
            <div><strong>3.2 km</strong><span>walking today</span></div>
            <div><strong>$86</strong><span>shared costs</span></div>
            <div><strong>72°</strong><span>at 2:00 pm</span></div>
          </div>
        </div>
        <CrewList :members="crew" @invite="showInvite = true" />
      </section>
    </main>
    <div v-if="selectedEvent" class="modal-overlay" @click.self="selectedEvent = null">
      <aside class="event-detail">
        <button class="close-btn" @click="selectedEvent = null">×</button>
        <div class="section-label">Event detail</div>
        <div class="event-detail-dot" :class="selectedEvent.tone"></div>
        <h2>{{ selectedEvent.title }}</h2>
        <p class="detail-place">⌖ {{ selectedEvent.place }}</p>
        <a
          class="map-action"
          :href="`https://www.google.com/maps/search/?api=1&query=${selectedEvent.coords[0]},${selectedEvent.coords[1]}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps ↗
        </a>
        <div class="detail-block">
          <span class="section-label">Schedule</span
          ><strong>{{ selectedEvent.time }} · {{ dayTitle }}</strong>
        </div>
        <div class="detail-block">
          <span class="section-label">Travel</span
          ><strong
            >{{ selectedEvent.travelTime || "Route details loading" }} ·
            {{ selectedEvent.transport || "Walking" }}</strong
          >
        </div>
        <div v-if="selectedEvent.recommendations.length" class="detail-block">
          <span class="section-label">Recommendations</span>
          <ul>
            <li v-for="item in selectedEvent.recommendations" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="selectedEvent.food.length" class="detail-block">
          <span class="section-label">Nearby food</span>
          <ul>
            <li v-for="item in selectedEvent.food" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="selectedEvent.todos.length" class="detail-block">
          <span class="section-label">Todos</span>
          <label v-for="todo in selectedEvent.todos" :key="todo.text"
            ><input v-model="todo.completed" type="checkbox" /> {{ todo.text
            }}<small v-if="todo.assignee"> · {{ todo.assignee }}</small></label
          >
        </div>
        <div class="detail-block">
          <span class="section-label">Split bill</span
          ><strong>{{
            selectedEvent.bill.length ? `${selectedEvent.bill.length} items added` : "No bill added"
          }}</strong
          ><input
            ref="receiptFile"
            class="visually-hidden"
            type="file"
            accept="image/*"
            @change="handleReceipt"
          /><button
            class="primary-btn detail-action"
            :disabled="receiptProcessing"
            @click="scanReceipt"
          >
            {{ receiptProcessing ? "Scanning…" : "Scan receipt" }}</button
          ><small v-if="receiptMessage" class="receipt-message">{{ receiptMessage }}</small>
        </div>
        <button class="primary-btn detail-action" @click="selectedEvent = null">
          Save details
        </button>
      </aside>
    </div>
    <div v-if="discussionPreview" class="modal-overlay">
      <aside class="assistant-panel discussion-preview">
        <div class="section-label">Discussion preview</div>
        <h2>{{ generatedPreview?.title || "Your trip starts here" }}</h2>
        <p v-if="generatedPreview">
          {{ generatedPreview.destination }} · {{ generatedPreview.dates }}
        </p>
        <div v-if="generatedPreview" class="assistant-stream">
          <div
            v-for="event in generatedPreview.events"
            :key="`${event.day}-${event.time}-${event.title}`"
            class="preview-event"
          >
            <strong>{{ event.time }} · {{ event.title }}</strong
            ><small>{{ event.place }}</small>
            <span>{{ event.recommendations.join(" · ") }}</span>
          </div>
        </div>
        <div v-else class="assistant-stream">
          <div
            v-for="(message, index) in discussionMessages"
            :key="index"
            :class="['landing-message', { user: message.role === 'user' }]"
          >
            {{ message.content }}
          </div>
        </div>
        <small v-if="itineraryError" class="assistant-error">{{ itineraryError }}</small>
        <div class="preview-actions">
          <button
            v-if="!generatedPreview"
            class="primary-btn"
            :disabled="itineraryLoading"
            @click="generateItinerary"
          >
            {{ itineraryLoading ? "Building itinerary…" : "Create itinerary" }}
          </button>
          <button v-else class="primary-btn" @click="useDiscussionPlan">Use this itinerary</button>
          <button class="ghost-btn" @click="closeDiscussionPreview">Start blank</button>
        </div>
      </aside>
    </div>
    <div v-if="assistantOpen" class="modal-overlay" @click.self="assistantOpen = false">
      <aside class="assistant-panel">
        <button class="close-btn" @click="assistantOpen = false">×</button>
        <div class="section-label">Ask Roam AI</div>
        <h2>Shape this trip</h2>
        <div class="assistant-stream">
          <div
            v-for="(message, index) in assistantMessages"
            :key="index"
            :class="['landing-message', { user: message.role === 'user' }]"
          >
            {{ message.content }}
          </div>
          <div v-if="!assistantMessages.length" class="landing-message">
            I know this trip. Ask about timing, food, routes, or tradeoffs.
          </div>
          <div v-if="assistantLoading" class="landing-message">Thinking…</div>
          <div v-if="assistantError" class="landing-message assistant-error">
            {{ assistantError }}
          </div>
        </div>
        <div class="chat-compose">
          <textarea
            v-model="assistantNote"
            placeholder="Ask about this trip…"
            @keyup.enter.exact="sendAssistantMessage"
          ></textarea>
          <button :disabled="assistantLoading" @click="sendAssistantMessage">Send ↗</button>
        </div>
      </aside>
    </div>
    <AddEventModal
      v-if="showAddEvent"
      @submit="submitEvent"
      @close="showAddEvent = false"
    /><InviteModal v-if="showInvite" :title="title" @close="showInvite = false" />
  </div>
</template>

<style src="~/assets/styles/components/modals.css"></style>
<style src="~/assets/styles/pages/trip.css"></style>
