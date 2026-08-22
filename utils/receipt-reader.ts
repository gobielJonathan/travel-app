let worker: {
  terminate: () => Promise<unknown>;
  recognize: (image: File) => Promise<{ data: { text: string } }>;
} | null = null;

export default async function readReceiptText(file: File) {
  try {
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core.wasm.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0",
      });
    }

    const text = (await worker.recognize(file)).data.text;

    return text;
  } catch (err) {
    throw err;
  } finally {
    const activeWorker = worker;
    worker = null;
    await activeWorker?.terminate();
  }
}
