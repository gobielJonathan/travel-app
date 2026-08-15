<script setup lang="ts">
import VueMarkdown from "vue-markdown-render";
import { BsSimple } from "@coderoycc/bottom-sheet-wrappers";
import type { GeneratedItinerary } from "~/types/itinerary";

type Message = { role: "user" | "assistant"; content: string };
type PreviewDay = { day: number; events: GeneratedItinerary["events"] };

const props = defineProps<{
  modelValue: boolean;
  generatedPreview: GeneratedItinerary | null;
  implementationPreview: GeneratedItinerary | null;
  previewDays: PreviewDay[];
  implementationDays: PreviewDay[];
  messages: Message[];
  loading: boolean;
  error: string;
}>();
function updateOpen(open: boolean) {
  emit("update:modelValue", open);
}
const emit = defineEmits<{
  "update:modelValue": [boolean];
  generate: [];
  use: [];
  apply: [];
  close: [];
  cancel: [];
}>();
</script>
<template>
  <ClientOnly>
    <BsSimple
      :model-value="props.modelValue"
      :close-on-backdrop="true"
      :hide-close-button="true"
      height="60dvh"
      :show-backdrop="true"
      :z-index="30"
      class="discussion-preview-sheet"
      @update:model-value="updateOpen"
    >
      <aside class="assistant-panel discussion-preview">
        <div class="preview-kicker"><span class="preview-spark">✦</span> Roam made a route</div>
        <h2>
          {{
            props.implementationPreview?.title ||
            props.generatedPreview?.title ||
            "Your trip starts here"
          }}
        </h2>
        <p v-if="props.generatedPreview" class="preview-subtitle">
          {{ (props.implementationPreview || props.generatedPreview)?.destination }} <span>·</span>
          {{ (props.implementationPreview || props.generatedPreview)?.dates }}
        </p>
        <div v-if="props.implementationPreview || props.generatedPreview" class="preview-itinerary">
          <section
            v-for="day in props.implementationPreview
              ? props.implementationDays
              : props.previewDays"
            :key="day.day"
            class="preview-day"
          >
            <div class="preview-day-marker">
              <span>Day</span><strong>{{ day.day }}</strong>
            </div>
            <div class="preview-day-stops">
              <article
                v-for="event in day.events"
                :key="`${event.day}-${event.time}-${event.title}`"
                class="preview-stop"
              >
                <div class="preview-stop-time">{{ event.time }}</div>
                <div class="preview-stop-pin"></div>
                <div class="preview-stop-copy">
                  <strong>{{ event.title }}</strong
                  ><small>{{ event.place }}</small
                  ><span v-if="event.recommendations.length">{{ event.recommendations[0] }}</span
                  ><span v-if="event.food.length" class="preview-note"
                    >Eat nearby · {{ event.food[0] }}</span
                  ><span v-if="event.conflict" class="preview-conflict"
                    >Time clash with existing event</span
                  >
                </div>
              </article>
            </div>
          </section>
        </div>
        <div v-else class="assistant-stream">
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
        </div>
        <small v-if="props.error" class="assistant-error">{{ props.error }}</small>
        <div class="preview-actions">
          <button
            class="preview-secondary ghost-btn"
            @click="props.implementationPreview ? emit('cancel') : emit('close')"
          >
            {{ props.implementationPreview ? "Cancel" : "Start blank" }}
          </button>
          <button
            v-if="props.implementationPreview"
            class="preview-primary primary-btn"
            @click="
              emit('update:modelValue', false);
              emit('apply');
            "
          >
            Implement plan <span>↗</span>
          </button>
          <button
            v-else-if="!props.generatedPreview"
            class="preview-primary primary-btn"
            :disabled="props.loading"
            @click="emit('generate')"
          >
            {{ props.loading ? "Building itinerary…" : "Build this route" }}
          </button>
          <button v-else class="preview-primary primary-btn" @click="emit('use')">
            Use this route <span>↗</span>
          </button>
        </div>
      </aside>
    </BsSimple>
  </ClientOnly>
</template>
<style scoped src="~/assets/styles/components/sheets/discussion-preview.css"></style>
