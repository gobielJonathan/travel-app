<script setup lang="ts">
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";
import { useQRCode } from "@vueuse/integrations/useQRCode";

const props = defineProps<{ title: string }>();
const emit = defineEmits<{ close: []; copied: [] }>();
const { inviteCode } = useInvite();
const qrCode = useQRCode(inviteCode);
function closeSheet(open: boolean) {
  console.log("lcose shete");
  if (!open) emit("close");
}
</script>
<template>
  <BsSimple
    :model-value="true"
    :close-on-backdrop="true"
    :hide-close-button="true"
    height="auto"
    :show-backdrop="true"
    :z-index="40"
    class="invite-sheet"
    @update:model-value="closeSheet"
  >
    <div class="invite-dialog">
      <div class="invite-icon" aria-hidden="true">♧</div>
      <p class="invite-kicker">Your crew</p>
      <p class="invite-description">
        Share this private code with friends. They can join and edit your itinerary.
      </p>
      <div class="invite-qr">
        <img :src="qrCode" alt="QR code containing trip invitation code" />
      </div>
      <div class="invite-security">
        <span>⌁</span>
        <div>
          <strong>Private by default</strong>
          <p>Only people with this code can join.</p>
        </div>
      </div>
    </div>
  </BsSimple>
</template>
