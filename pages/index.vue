<script setup lang="ts">
const note = ref("");
const { messages, loading, error, ask } = useAiDiscussion();
const hasDiscussion = computed(() => messages.value.some((message) => message.role === "user"));
const intro = "Tell me where you want to go, who is coming, and what kind of days you want.";
function send() {
  const prompt = note.value.trim();
  if (!prompt) return;
  void ask(prompt);
  note.value = "";
}
async function startPlanning() {
  if (!hasDiscussion.value) {
    await navigateTo("/trip");
    return;
  }
  await navigateTo("/trip?preview=1");
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
            {{ message.content }}
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
        <button class="start-button" @click="startPlanning">
          Start with a blank plan <span>→</span>
        </button>
      </section>
    </section>
    <section class="landing-foot">
      <span>Four friends. One living itinerary.</span
      ><span>End-to-end encrypted · works offline · no account required</span>
    </section>
  </main>
</template>

<style src="~/assets/styles/pages/index.css"></style>
