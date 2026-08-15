import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2026-08-09",
  css: [
    "~/assets/style.css",
    "leaflet/dist/leaflet.css",
    "@coderoycc/bottom-sheet-wrappers/style.css",
  ],
  devServer: {
    https: {
      key: "./.ssl/localhost+1-key.pem",
      cert: "./.ssl/localhost+1.pem",
    },
  },
  vite: { plugins: [tailwindcss()] },
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  devtools: { enabled: false },
  runtimeConfig: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
    deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
});
