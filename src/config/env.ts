// Environment configuration
//
// Mixed content (HTTPS site → HTTP API): browsers block this. Production options:
// 1) Serve the API over HTTPS (recommended), set VITE_API_URL=https://your-api.example.com/api/v1
// 2) Proxy via Vercel: set VITE_API_URL=/api/v1 so requests stay same-origin HTTPS, and add a
//    rewrite in vercel.json from /api/v1/* to your HTTP backend (see repo vercel.json).

const rawApiUrl =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BASE_DEV_URL ?? "";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

/**
 * Base URL for axios (absolute https, or a path like `/api/v1` for same-origin proxy).
 *
 * On Vercel (HTTPS) a baked-in `http://…` API URL causes mixed-content blocking. If the
 * build still has HTTP (common when `VITE_BASE_DEV_URL` points at the raw IP), force the
 * same-origin path that `vercel.json` rewrites to the backend.
 */
function resolveApiUrl(): string {
  const url = trimTrailingSlashes(String(rawApiUrl));

  if (
    import.meta.env.PROD &&
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http:")
  ) {
    return "/api/v1";
  }

  return url;
}

export const API_URL = resolveApiUrl();

export const env = {
  API_URL,
  ENV: import.meta.env.VITE_ENV || "development",
  /** UniVybe support WhatsApp number (public; used for "can't find my institution"). */
  SUPPORT_WHATSAPP_NUMBER: import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER as
    | string
    | undefined,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  enableDebugLogs:
    import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true" || import.meta.env.DEV,
} as const;
