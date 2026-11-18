import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { validateReferralCode } from "../../services/referrals";
import { storeReferralCapture } from "../../utils/referralCapture";

/**
 * Captures a `?ref=CODE` link on any page load (docs/REFERRAL_AMBASSADOR_API.md
 * "Frontend integration checklist" A.1) — the backend cannot see anonymous
 * visits, so remembering the link is frontend work. A direct visit with no
 * `?ref=` changes nothing; an invalid code is ignored and whatever was
 * already stored is kept (never cleared just because a bad code showed up).
 */
export const ReferralCapture = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get("ref");

  useEffect(() => {
    if (!code) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await validateReferralCode(code);
        if (!cancelled && result.valid && result.code) {
          storeReferralCapture(result.code);
        }
      } catch {
        // Best-effort: a validation failure (network, rate limit) leaves
        // whatever was already stored untouched — never worse than not
        // having tried.
      } finally {
        // Drop `?ref=` from the address bar once settled either way — doing
        // this earlier would re-render with `code` now null, tearing down
        // this very effect (via the cleanup below) before the in-flight
        // validate/store above ever got to finish.
        if (!cancelled) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete("ref");
              return next;
            },
            { replace: true }
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, setSearchParams]);

  return null;
};
