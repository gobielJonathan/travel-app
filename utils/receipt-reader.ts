let worker: {
  terminate: () => Promise<unknown>;
  recognize: (image: File) => Promise<{ data: { text: string } }>;
} | null = null;

export default async function readReceipt(file: File) {
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

    const items = text
      .split("\n")
      .map((line) => line.trim().match(/^(.+?)\\s+(\\d+[.,]\\d{2})$/))
      .flatMap((match) =>
        match?.[1] && match[2]
          ? [
              {
                name: match[1],
                price: Number(match[2].replace(",", ".")),
                member: "JM",
                settled: false,
              },
            ]
          : [],
      );

    return items;
  } catch (err) {
    throw err;
  } finally {
    await worker?.terminate();
  }
}
