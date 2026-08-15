<script setup lang="ts">
import VueMarkdown from "vue-markdown-render";
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";

type Message = { role: "user" | "assistant"; content: string };
const props = defineProps<{
  modelValue: boolean;
  note: string;
  messages: Message[];
  loading: boolean;
  error: string;
  implementationLoading: boolean;
}>();
function updateOpen(open: boolean) {
  emit("update:modelValue", open);
}
const emit = defineEmits<{
  "update:modelValue": [boolean];
  "update:note": [string];
  send: [];
  implement: [];
  close: [];
}>();
</script>
<template>
  <ClientOnly>
    <BsSimple
      :model-value="props.modelValue"
      :close-on-backdrop="true"
      :hide-close-button="true"
      height="80dvh"
      :show-backdrop="true"
      :z-index="40"
      class="assistant-sheet"
      @update:model-value="updateOpen"
    >
      <aside class="assistant-panel">
        <div class="section-label">Ask Roam AI</div>
        <h2 id="assistant-title">Shape this trip</h2>
        <div class="assistant-stream">
          <div
            v-for="(message, index) in props.messages"
            :key="index"
            :class="['landing-message', { user: message.role === 'user' }]"
          >
            <VueMarkdown
              :source="message.content"
              :options="{ html: false, breaks: true, linkify: true }"
            />
          </div>
          <div v-if="!props.messages.length" class="landing-message">
            I know this trip. Ask about timing, food, routes, or tradeoffs.
          </div>
          <div v-if="props.loading" class="landing-message">Thinking…</div>
          <div v-if="props.error" class="landing-message assistant-error">{{ props.error }}</div>
        </div>
        <div class="chat-compose">
          <textarea
            :value="props.note"
            placeholder="Ask about this trip…"
            @input="emit('update:note', ($event.target as HTMLTextAreaElement).value)"
            @keyup.enter.exact="emit('send')"
          ></textarea>
          <button :disabled="props.loading" @click="emit('send')">Send ↗</button>
          <button
            class="primary-btn implement-plan-btn"
            :disabled="
              props.loading ||
              props.implementationLoading ||
              !props.messages.some((message) => message.role === 'user')
            "
            @click="emit('implement')"
          >
            {{ props.implementationLoading ? "Analyzing…" : "Implement this plan" }}
          </button>
        </div>
      </aside>
    </BsSimple>
  </ClientOnly>
</template>
<style scoped src="~/assets/styles/components/sheets/assistant.css"></style>
