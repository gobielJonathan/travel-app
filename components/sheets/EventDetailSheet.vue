<script setup lang="ts">
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";
import type { TripEvent } from "~/types/trip";
const props = defineProps<{
  event: TripEvent | null;
  dateTime: string;
  notes: string;
  receiptProcessing: boolean;
  receiptMessage: string;
}>();
function closeSheet(open: boolean) {
  if (!open) emit("close");
}
const emit = defineEmits<{
  close: [];
  "update:dateTime": [string];
  "update:notes": [string];
  save: [];
  scan: [];
  receipt: [Event];
}>();
const receiptFile = ref<HTMLInputElement | null>(null);
function scanReceipt() {
  emit("scan");
  receiptFile.value?.click();
}
</script>
<template>
  <ClientOnly
    ><BsSimple
      :close-on-backdrop="true"
      :model-value="Boolean(props.event)"
      height="80dvh"
      :show-backdrop="true"
      :hide-close-button="true"
      :z-index="40"
      class="event-detail-sheet"
      @update:model-value="closeSheet"
    >
      <aside v-if="props.event" class="event-detail">
        <div class="section-label">Event detail</div>
        <div class="event-detail-dot" :class="props.event.tone"></div>
        <h2>{{ props.event.title }}</h2>
        <p class="detail-place">⌖ {{ props.event.place }}</p>
        <a
          class="map-action"
          :href="`https://www.google.com/maps/search/?api=1&query=${props.event.coords[0]},${props.event.coords[1]}`"
          target="_blank"
          rel="noopener noreferrer"
          >Open in Google Maps ↗</a
        >
        <div class="detail-block">
          <span class="section-label">Schedule</span
          ><label class="schedule-picker"
            ><span>Move stop</span
            ><input
              :value="props.dateTime"
              type="datetime-local"
              required
              @input="emit('update:dateTime', ($event.target as HTMLInputElement).value)" /></label
          ><strong>Timeline updates when saved</strong>
        </div>
        <div class="detail-block notes-field">
          <span class="notes-label"><span>Notes</span><small>Optional</small></span
          ><textarea
            :value="props.notes"
            maxlength="280"
            placeholder="A detail worth remembering…"
            @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
          ></textarea
          ><span class="notes-footer"
            ><span>Keep it useful for your future self.</span>{{ props.notes.length }}/280</span
          >
        </div>
        <div class="detail-block">
          <span class="section-label">Travel</span
          ><strong
            >{{ props.event.travelTime || "Route details loading" }} ·
            {{ props.event.transport || "Walking" }}</strong
          >
        </div>
        <div v-if="props.event.recommendations.length" class="detail-block">
          <span class="section-label">Recommendations</span>
          <ul>
            <li v-for="item in props.event.recommendations" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="props.event.food.length" class="detail-block">
          <span class="section-label">Nearby food</span>
          <ul>
            <li v-for="item in props.event.food" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div v-if="props.event.todos.length" class="detail-block">
          <span class="section-label">Todos</span
          ><label v-for="todo in props.event.todos" :key="todo.text"
            ><input v-model="todo.completed" type="checkbox" /> {{ todo.text
            }}<small v-if="todo.assignee"> · {{ todo.assignee }}</small></label
          >
        </div>
        <div class="detail-block">
          <span class="section-label">Split bill</span
          ><strong>{{
            props.event.bill.length ? `${props.event.bill.length} items added` : "No bill added"
          }}</strong
          ><input
            ref="receiptFile"
            class="visually-hidden"
            type="file"
            accept="image/*"
            @change="emit('receipt', $event)"
          /><button
            class="primary-btn detail-action"
            :disabled="props.receiptProcessing"
            @click="scanReceipt"
          >
            {{ props.receiptProcessing ? "Scanning…" : "Scan receipt" }}</button
          ><small v-if="props.receiptMessage" class="receipt-message">{{
            props.receiptMessage
          }}</small>
        </div>
        <button class="primary-btn detail-action" @click="emit('save')">Save details</button>
      </aside>
    </BsSimple></ClientOnly
  >
</template>
<style scoped src="~/assets/styles/components/sheets/event-detail.css"></style>
