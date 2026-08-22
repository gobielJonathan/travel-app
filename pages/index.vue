<script setup lang="ts">
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";
import VueMarkdown from "vue-markdown-render";
import type { GeneratedItinerary } from "~/types/itinerary";
import { useInvite } from "~/composables/useInvite";
import {
  clearItinerary,
  getTripStorageKeys,
  loadItinerary,
  loadTripSnapshot,
  saveItinerary,
} from "~/utils/itineraryStorage";

useHead({ title: "Plan Your Trip — Roam" });

const note = ref("");
const { messages, loading, error, ask } = useAiDiscussion();
const roles = new Set(["user", "assistant"]);

const hasDiscussion = computed(() => messages.value.some((message) => roles.has(message.role)));

const finalizing = ref(false);
const finalizeError = ref("");
const showExistingPlanDialog = ref(false);
const existingPlanPending = ref(false);
const { inviteCode, createNewWorkspace } = useInvite();
const storageKeys = computed(() => getTripStorageKeys(inviteCode.value));

function hasExistingTrip() {
  return !!localStorage.getItem(storageKeys.value.state);
}

async function startBlankPlan() {
  existingPlanPending.value = false;
  showExistingPlanDialog.value = false;
  const previousWorkspaceCode = inviteCode.value;
  const previousStorageKeys = getTripStorageKeys(previousWorkspaceCode);
  await clearItinerary();
  await clearTripSnapshot(previousWorkspaceCode);
  localStorage.removeItem(previousStorageKeys.state);
  localStorage.removeItem(previousStorageKeys.title);
  localStorage.removeItem(previousStorageKeys.deletedEventIds);
  createNewWorkspace();
  await navigateTo("/trip");
}

async function keepExistingPlan() {
  existingPlanPending.value = false;
  showExistingPlanDialog.value = false;
  await navigateTo("/trip");
}

async function startBlankPlanWithCheck() {
  if (hasExistingTrip() || (await loadItinerary()) || (await loadTripSnapshot(inviteCode.value))) {
    showExistingPlanDialog.value = true;
    return;
  }
  await startBlankPlan();
}
const intro = "Tell me where you want to go, who is coming, and what kind of days you want.";
function send() {
  const prompt = note.value.trim();
  if (!prompt) return;
  void ask(prompt);
  note.value = "";
}
async function startPlanning() {
  if (!hasDiscussion.value) {
    await startBlankPlanWithCheck();
    return;
  }
  finalizing.value = true;
  finalizeError.value = "";
  try {
    const itinerary = await $fetch<GeneratedItinerary | { needs: string }>("/api/ai/itinerary", {
      method: "POST",
      body: { messages: messages.value, workspaceCode: inviteCode.value },
    });
    if ("needs" in itinerary) {
      finalizeError.value = `Before finalizing, tell Roam AI your ${itinerary.needs}.`;
      return;
    }
    const previousWorkspaceCode = inviteCode.value;
    const previousStorageKeys = getTripStorageKeys(previousWorkspaceCode);
    await clearItinerary();
    await clearTripSnapshot(previousWorkspaceCode);
    localStorage.removeItem(previousStorageKeys.state);
    localStorage.removeItem(previousStorageKeys.title);
    localStorage.removeItem(previousStorageKeys.deletedEventIds);
    createNewWorkspace();
    await saveItinerary(itinerary);
    await navigateTo("/trip?preview=1");
  } catch (requestError) {
    finalizeError.value =
      requestError instanceof Error ? requestError.message : "Itinerary generation unavailable";
  } finally {
    finalizing.value = false;
  }
}
</script>
<template>
  <main class="landing">
    <header class="landing-nav">
      <NuxtLink class="brand" to="/"><span class="brand-mark">✦</span> roam</NuxtLink
      ><span class="landing-status"><i></i> Private trip planning</span
      ><NuxtLink class="landing-join" to="/join">Join a plan ↗</NuxtLink>
    </header>
    <section class="landing-hero">
      <div class="landing-copy">
        <div class="eyebrow">
          <span class="live-dot"></span> Built for the people you travel with
        </div>
        <h1>Make room<br />for <em>detours.</em></h1>
        <p>
          Roam turns loose ideas into a shared trip plan—then keeps it close to your group, even
          when the signal disappears.
        </p>
        <div class="landing-stats">
          <div><strong>01</strong><span>Tell us the feeling</span></div>
          <div><strong>02</strong><span>Shape the days together</span></div>
          <div><strong>03</strong><span>Take it offline</span></div>
        </div>
      </div>
      <section class="landing-chat">
        <div class="chat-header">
          <div class="assistant-orb">✦</div>
          <div><strong>Ask Roam AI</strong><small>Trip studio</small></div>
          <span>⌁ Local-first</span>
        </div>
        <div class="chat-stream">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['landing-message', { user: message.role === 'user' }]"
          >
            <VueMarkdown
              :source="message.content"
              :options="{ html: false, breaks: true, linkify: true }"
            />
          </div>
          <div v-if="!messages.length" class="landing-message">{{ intro }}</div>
          <div v-if="loading" class="landing-message">Thinking…</div>
          <div v-if="error" class="landing-message assistant-error">{{ error }}</div>
        </div>
        <div class="chat-compose">
          <textarea
            v-model="note"
            placeholder="Try “four days in Lisbon, slow mornings…”"
            @keyup.enter.exact="send"
          ></textarea
          ><button @click="send">Send ↗</button>
        </div>
        <div class="chat-prompts">
          <button @click="note = 'A food-focused long weekend'">Food weekend</button
          ><button @click="note = 'A relaxed city trip'">Slow city days</button
          ><button @click="note = 'An outdoors trip nearby'">Outside time</button>
        </div>
        <button v-if="!hasDiscussion" class="start-button" @click="startPlanning">
          Start with a blank plan <span>→</span>
        </button>
        <button
          v-else
          class="start-button finalize-button"
          :disabled="loading || finalizing || !!error"
          @click="startPlanning"
        >
          {{ finalizing ? "Building trip preview…" : "Finalize trip plan" }} <span>→</span>
        </button>
        <small v-if="finalizeError" class="assistant-error">{{ finalizeError }}</small>
      </section>
    </section>
    <ClientOnly>
      <BsSimple
        v-model="showExistingPlanDialog"
        :close-on-backdrop="true"
        :hide-close-button="true"
        :show-backdrop="true"
        :z-index="40"
        class="existing-plan-sheet"
      >
        <div class="existing-plan-dialog">
          <div class="existing-plan-mark" aria-hidden="true">↻</div>
          <p class="existing-plan-kicker">Trip memory</p>
          <h2 id="existing-plan-title">You already have a trip in motion.</h2>
          <p class="existing-plan-copy">
            Keep your saved days, or clear them and make a clean start. Nothing changes until you
            choose.
          </p>
          <div class="existing-plan-actions">
            <button :disabled="existingPlanPending" @click="keepExistingPlan">Keep my trip</button>
            <button :disabled="existingPlanPending" @click="startBlankPlan">
              Clear and start fresh
            </button>
          </div>
        </div>
      </BsSimple>
    </ClientOnly>
    <section class="landing-foot">
      <span>Four friends. One living itinerary.</span
      ><span>End-to-end encrypted · works offline · no account required</span>
    </section>
  </main>
</template>

<style scoped src="~/assets/styles/pages/index.css"></style>
