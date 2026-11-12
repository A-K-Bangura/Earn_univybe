import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `window.matchMedia(query).matches`. Server/first-render fallback is
 * `false`, so layout-affecting callers should default to the mobile branch.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
};
