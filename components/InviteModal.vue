<script setup lang="ts">
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ close: []; copied: [] }>()
const copied = ref(false)
async function copyInvite() {
  await navigator.clipboard?.writeText('ROAM-LA24-7KQ')
  copied.value = true
  emit('copied')
  window.setTimeout(() => { copied.value = false }, 1800)
}
</script>
<template>
  <div class="invite-overlay" role="presentation" @click.self="emit('close')">
    <section class="invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <button class="invite-close" aria-label="Close invite dialog" @click="emit('close')">×</button>
      <div class="invite-icon" aria-hidden="true">♧</div>
      <p class="invite-kicker">Your crew</p>
      <h2 id="invite-title">Invite people to {{ props.title }}</h2>
      <p class="invite-description">Share this private code with friends. They can join and edit your itinerary.</p>
      <div class="invite-code-card"><span>ROAM-LA24-7KQ</span><button class="invite-copy" @click="copyInvite">{{ copied ? 'Copied' : 'Copy code' }}</button></div>
      <div class="invite-security"><span>⌁</span><div><strong>Private by default</strong><p>Only people with this code can join.</p></div></div>
      <div class="invite-modal-actions"><NuxtLink class="invite-join-link" to="/join" @click="emit('close')">Join with code</NuxtLink><button class="invite-done" @click="emit('close')">Done</button></div>
    </section>
  </div>
</template>
