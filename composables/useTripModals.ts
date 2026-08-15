import { ref } from "vue";

export function useTripModals() {
  const assistantOpen = ref(false);
  const discussionPreview = ref(false);
  const showAddEvent = ref(false);
  const showInvite = ref(false);
  return { assistantOpen, discussionPreview, showAddEvent, showInvite };
}
