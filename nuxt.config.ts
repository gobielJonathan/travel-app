import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2026-08-09",
  css: ["~/assets/style.css", "leaflet/dist/leaflet.css"],
  vite: { plugins: [tailwindcss()] },
  devtools: { enabled: true },
  runtimeConfig: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
    deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
});
