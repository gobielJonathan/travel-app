<script setup lang="ts">
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";
import jsQR from "jsqr";

const error = ref("");
const cameraError = ref(false);
const scannerOpen = ref(false);
const video = ref<HTMLVideoElement>();
const canvas = ref<HTMLCanvasElement>();
const { join } = useInvite();
let stream: MediaStream | undefined;
let animationFrame = 0;

useHead({ title: "Join a Trip — Roam" });

async function openScanner() {
  error.value = "";
  if (!window.confirm("Allow Roam to use your camera to scan the invitation QR code?")) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" } },
    });
    scannerOpen.value = true;
    await nextTick();
    video.value?.play();
    scanFrame();
  } catch {
    cameraError.value = true;
  }
}

function scanFrame() {
  if (!scannerOpen.value || !video.value || !canvas.value) return;
  const currentVideo = video.value;
  const currentCanvas = canvas.value;
  if (currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    currentCanvas.width = currentVideo.videoWidth;
    currentCanvas.height = currentVideo.videoHeight;
    const context = currentCanvas.getContext("2d");
    if (context) {
      context.drawImage(currentVideo, 0, 0, currentCanvas.width, currentCanvas.height);
      const result = jsQR(
        context.getImageData(0, 0, currentCanvas.width, currentCanvas.height).data,
        currentCanvas.width,
        currentCanvas.height,
      );
      if (result) {
        if (join(result.data)) {
          closeScanner();
          navigateTo("/trip");
          return;
        }
        error.value = "Code not recognized. Check the code and try again.";
      }
    }
  }
  animationFrame = requestAnimationFrame(scanFrame);
}

function closeScanner() {
  scannerOpen.value = false;
  cancelAnimationFrame(animationFrame);
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
}

function closeCameraError() {
  cameraError.value = false;
}

onUnmounted(closeScanner);
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
        <h1 id="join-title">Scan invitation QR code</h1>
        <p class="invite-description">
          Use your device camera to scan the invitation and join the private itinerary.
        </p>
        <button class="invite-done scan-button" type="button" @click="openScanner">
          Scan QR code
        </button>
        <p v-if="error" class="join-error" role="alert">{{ error }}</p>
        <div class="invite-security">
          <span>⌁</span>
          <div>
            <strong>Private by default</strong>
            <p>Only people with a valid invitation code can join.</p>
          </div>
        </div>
      </section>
    </section>

    <BsSimple
      :model-value="scannerOpen"
      :close-on-backdrop="true"
      :hide-close-button="true"
      :show-backdrop="true"
      height="90dvh"
      class="qr-scanner-sheet"
      @update:model-value="closeScanner"
    >
      <div class="qr-scanner">
        <button type="button" class="qr-close" @click="closeScanner">Close</button>
        <h2>Scan invitation</h2>
        <video ref="video" autoplay playsinline muted aria-label="Camera QR code preview"></video>
        <canvas ref="canvas" class="qr-canvas"></canvas>
      </div>
    </BsSimple>

    <BsSimple
      :model-value="cameraError"
      :close-on-backdrop="true"
      :hide-close-button="true"
      :show-backdrop="true"
      height="auto"
      class="qr-error-sheet"
      @update:model-value="closeCameraError"
    >
      <div class="qr-error-content">
        <h2>Camera access needed</h2>
        <p>Unable to scan QR code because camera access was not granted.</p>
        <button type="button" class="invite-done" @click="closeCameraError">Close</button>
      </div>
    </BsSimple>
  </main>
</template>

<style src="~/assets/styles/pages/join.css"></style>
