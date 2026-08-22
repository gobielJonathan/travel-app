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
    gatekeeperApiKey: process.env.GATEKEEPER_API_KEY || "",
    gatekeeperBaseUrl:
      process.env.GATEKEEPER_BASE_URL ||
      "https://ws-8tr8jnnzj3p6xmk6.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    gatekeeperModel: process.env.GATEKEEPER_MODEL || "",
    gatekeeperWorkspaceName: process.env.GATEKEEPER_WORKSPACE_NAME || "",
    gatekeeperWorkspaceId: process.env.GATEKEEPER_WORKSPACE_ID || "",
  },
});
