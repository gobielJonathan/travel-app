<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    labelledBy?: string;
    closeOnOverlay?: boolean;
  }>(),
  { closeOnOverlay: true },
);
const emit = defineEmits<{ close: [] }>();
useBodyScrollLock(() => props.open);
function close() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      role="presentation"
      @click.self="closeOnOverlay && close()"
    >
      <section class="modal-surface" role="dialog" aria-modal="true" :aria-labelledby="labelledBy">
        <slot />
      </section>
    </div>
  </Teleport>
</template>
