import type { ReceiptAnalysis } from "~/types/trip";
import readReceiptText from "~/utils/receipt-reader";

export function useReceiptScanner() {
  const { inviteCode } = useInvite();
  const processing = ref(false);

  async function scan(file: File) {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      throw new Error("Use image smaller than 10 MB.");
    }

    processing.value = true;
    try {
      const text = await readReceiptText(file);
      if (!text.trim()) throw new Error("No receipt text found.");

      const response = await $fetch<ReceiptAnalysis>("/api/ai/receipt", {
        method: "POST",
        body: { text, workspaceCode: inviteCode.value },
      });
      if (typeof response.currency !== "string" || !Array.isArray(response.items))
        throw new Error("Receipt analysis unavailable.");
      return response;
    } finally {
      processing.value = false;
    }
  }

  return { processing, scan };
}
