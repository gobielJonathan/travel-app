import tailwindcss from "@tailwindcss/vite";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";

export default defineNuxtConfig({
  modules: ["@vite-pwa/nuxt", "@vercel/analytics"],
  ssr: false,
  compatibilityDate: "2026-08-09",
  app: {
    head: {
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", href: "/pwa-192x192.png" },
      ],
    },
  },
  css: [
    "~/assets/style.css",
    "~/assets/styles/components/modals.css",
    "~/assets/styles/components/sheets/receipt-source.css",
    "leaflet/dist/leaflet.css",
    "@coderoycc/bottom-sheet-wrappers/style.css",
  ],
  // devServer: {
  //   https: {
  //     key: "./.ssl/localhost+1-key.pem",
  //     cert: "./.ssl/localhost+1.pem",
  //   },
  // },
  vite: {
    plugins: [tailwindcss()],
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: browserslistToTargets(browserslist()),
      },
    },
    build: {
      cssMinify: "lightningcss",
    },
  },
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  devtools: { enabled: false },
  pwa: {
    registerType: "prompt",
    client: {
      periodicSyncForUpdates: 3600,
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
    },
    manifest: {
      name: "Roam — Shared Trip Planning",
      short_name: "Roam",
      description: "Plan trips together, even when the signal disappears.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#172522",
      theme_color: "#172522",
      icons: [
        {
          src: "/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/pwa-maskable-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
  },
  runtimeConfig: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
    deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
});
