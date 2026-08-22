<script setup lang="ts">
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [boolean];
  select: ["upload" | "camera"];
}>();

function closeSheet(open: boolean) {
  if (!open) emit("update:modelValue", false);
}
</script>

<template>
  <BsSimple
    :model-value="props.modelValue"
    :close-on-backdrop="true"
    :hide-close-button="true"
    height="auto"
    :show-backdrop="true"
    :z-index="40"
    class="receipt-source-sheet"
    @update:model-value="closeSheet"
  >
    <div class="receipt-source-dialog" aria-labelledby="receipt-source-title">
      <div class="receipt-source-heading">
        <div>
          <div class="section-label">Receipt scanner</div>
          <h2 id="receipt-source-title">Add your receipt</h2>
        </div>
        <span class="receipt-source-mark" aria-hidden="true">✦</span>
      </div>
      <p class="receipt-source-intro">Choose how you want to bring the bill into your trip.</p>
      <div class="receipt-source-actions">
        <button type="button" @click="emit('select', 'upload')">
          <span class="receipt-source-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"
              />
              <path d="m7.5 16 3-3 2.25 2.25 1.5-1.5 2.25 2.25M8.5 8.5h.01" />
            </svg>
          </span>
          <span>
            <strong>Upload image</strong>
            <small>Choose from photos or files</small>
          </span>
          <span class="receipt-source-arrow" aria-hidden="true">→</span>
        </button>
        <button type="button" @click="emit('select', 'camera')">
          <span class="receipt-source-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M5 8.5A1.5 1.5 0 0 1 6.5 7h2l1-2h5l1 2h2A1.5 1.5 0 0 1 19 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 17.5z"
              />
              <circle cx="12" cy="13" r="3.25" />
            </svg>
          </span>
          <span>
            <strong>Take a photo</strong>
            <small>Use your device’s back camera</small>
          </span>
          <span class="receipt-source-arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <button class="receipt-source-cancel" type="button" @click="emit('update:modelValue', false)">
        Cancel
      </button>
    </div>
  </BsSimple>
</template>
