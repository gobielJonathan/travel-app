<script setup lang="ts">
const code = ref("");
const error = ref("");
const { join } = useInvite();

function submit() {
  error.value = "";
  if (!join(code.value)) {
    error.value = "Code not recognized. Check the code and try again.";
    return;
  }
  navigateTo("/trip");
}
</script>

<template>
  <main class="join-page">
    <NuxtLink class="join-back" to="/">← Back home</NuxtLink>
    <div class="join-mark"><span class="brand-mark">✦</span> roam</div>
    <section class="join-layout" aria-labelledby="join-title">
      <div class="join-story">
        <p class="eyebrow"><span class="live-dot"></span> A seat is waiting</p>
        <h1>Come along<br />for the <em>good parts.</em></h1>
        <p>
          Join your friends’ living itinerary. See what’s planned, add your own stops, and keep the
          whole trip close—even offline.
        </p>
        <div class="join-stamp">
          ROAM<br /><strong>PRIVATE CREW</strong><small>LOS ANGELES · 2024</small>
        </div>
      </div>
      <section class="invite-dialog invite-page-card" aria-labelledby="join-title">
        <div class="invite-icon" aria-hidden="true">♧</div>
        <p class="invite-kicker">Join a trip</p>
        <h1 id="join-title">Enter your invitation code</h1>
        <p class="invite-description">
          Someone invited you to join their private itinerary. Enter the code to continue.
        </p>
        <form class="join-form" @submit.prevent="submit">
          <label for="invite-code">Invitation code</label>
          <input
            id="invite-code"
            v-model="code"
            autocomplete="one-time-code"
            placeholder="ROAM-XXXXXX"
            aria-describedby="invite-error"
            :aria-invalid="Boolean(error)"
            @input="error = ''"
          />
          <p v-if="error" id="invite-error" class="join-error" role="alert">{{ error }}</p>
          <button class="invite-done" type="submit" :disabled="!code.trim()">Join trip</button>
        </form>
        <div class="invite-security">
          <span>⌁</span>
          <div>
            <strong>Private by default</strong>
            <p>Only people with a valid invitation code can join.</p>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<style src="~/assets/styles/pages/join.css"></style>
