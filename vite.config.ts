import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "vite.svg"],
      manifest: {
        name: "EduLift Sierra",
        short_name: "EduLift",
        description: "PWA learning platform for Sierra Leone",
        theme_color: "#3a86ff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg}",
          // App-chrome logos (TopNav, auth pages): ~60 KB total, precached so
          // they still render offline on a first visit, as the PNGs they
          // replaced did. Files are named `brand-*` by scripts/optimize-assets.mjs.
          "assets/brand-*.webp",
        ],
        runtimeCaching: [
          {
            // Landing-page art (.webp) and brand fonts aren't in the precache
            // list above, so first install stays small on slow connections.
            // Cache them the first time they're viewed so the landing page
            // still renders offline afterwards. Hashed filenames make
            // CacheFirst safe.
            urlPattern: ({ sameOrigin, url }) =>
              sameOrigin && /\.(?:webp|ttf|woff2?)$/i.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "landing-assets",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\./,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
});
