import { env } from "../config/env";

const DEBUG_ENABLED = env.enableDebugLogs;

export const debugLog = (scope: string, ...args: unknown[]) => {
  if (!DEBUG_ENABLED) {
    return;
  }

  if (typeof console !== "undefined" && console.debug) {
    console.debug(`[${scope}]`, ...args);
  }
};

