import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';
import manifest from './pwa-manifest.json';
export default defineConfig({plugins:[react(),tailwindcss(),VitePWA({
 registerType:'autoUpdate', includeAssets:['favicon.ico','earn-icon-192.png','earn-icon-512.png'], manifest:manifest as Partial<ManifestOptions>,
 workbox:{cacheId:'univybe-earn',cleanupOutdatedCaches:true,globPatterns:['**/*.{js,css,html,ico,svg}','earn-icon-*.png','assets/brand-*.webp'],navigateFallback:'index.html',navigateFallbackDenylist:[/^\/api\//,/^\/__/],runtimeCaching:[
 // Deliberately cache no API response: gig payloads vary by account, even on public routes.
 {urlPattern:({sameOrigin,url})=>sameOrigin && /^\/assets\//.test(url.pathname) && /\.(webp|ttf|woff2?)$/i.test(url.pathname),handler:'CacheFirst',options:{cacheName:'earn-static-assets',expiration:{maxEntries:50,maxAgeSeconds:2592000}}}
 ]}
})]});
