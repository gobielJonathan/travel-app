<script setup lang="ts">
const { $pwa } = useNuxtApp();

async function updateApp() {
  await $pwa?.updateServiceWorker(true);
}

async function dismissUpdate() {
  await $pwa?.cancelPrompt();
}
</script>

<template>
  <VitePwaManifest />
  <NuxtPage />
  <div
    v-if="$pwa?.needRefresh"
    class="pwa-update-notice"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <p class="pwa-update-message">
      <strong>New Roam version available.</strong>
      Refresh to use the latest trip planning tools.
    </p>
    <div class="pwa-update-actions">
      <button class="primary-btn" type="button" @click="updateApp">Update</button>
      <button class="ghost-btn" type="button" @click="dismissUpdate">Later</button>
    </div>
  </div>
</template>
