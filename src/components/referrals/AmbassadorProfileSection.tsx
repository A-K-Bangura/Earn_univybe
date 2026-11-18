import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toDataURL } from "qrcode";
import { Copy, Check, Share2 } from "lucide-react";
import { getAmbassadorReferrals } from "../../services/referrals";
import { copyText } from "../../utils/clipboard";
import type { AmbassadorProfile } from "../../types/referral";

import { accountScope } from "../../utils/accountScope";

const HISTORY_PAGE_SIZE = 15;

const formatRate = (rate: number | null): string =>
  rate === null ? "—" : `${rate}%`;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() =>
        void copyText(value).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        })
      }
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-azure-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-azure-600"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
};

/**
 * The ambassador block on the student's own profile (Round 15) — rendered by
 * the caller only when `student.ambassador` is not null. Code/link/QR are
 * frontend jobs from `referral_link` (docs/REFERRAL_AMBASSADOR_API.md §4.1);
 * share/QR are hidden while `accepting_referrals` is false, but the code,
 * numbers and history stay visible either way.
 */
export const AmbassadorProfileSection = ({
  ambassador,
}: {
  ambassador: AmbassadorProfile;
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { stats } = ambassador;

  useEffect(() => {
    if (!ambassador.accepting_referrals) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    toDataURL(ambassador.referral_link, { width: 160, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ambassador.referral_link, ambassador.accepting_referrals]);

  const historyQuery = useQuery({
    queryKey: ["ambassador-referrals", accountScope(), page],
    queryFn: () => getAmbassadorReferrals(page, HISTORY_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join UniVybe",
          url: ambassador.referral_link,
        });
        return;
      } catch {
        // Cancelled by the student, or unsupported mid-call — copy instead.
      }
    }
    await copyText(ambassador.referral_link);
  };

  return (
    <div className="earn-empty">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Campus Ambassador
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            ambassador.accepting_referrals
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}
        >
          {ambassador.accepting_referrals ? "Active" : "Paused"}
        </span>
      </div>

      {!ambassador.accepting_referrals && (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
          Your code isn't accepting new referrals right now. Your numbers and
          history are still here.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Your code
            </p>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white">
                {ambassador.code}
              </code>
              <CopyButton value={ambassador.code} label="Copy" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Your link
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all text-sm text-gray-700 dark:text-gray-300">
                {ambassador.referral_link}
              </span>
              <CopyButton value={ambassador.referral_link} label="Copy" />
              {ambassador.accepting_referrals && (
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
              )}
            </div>
          </div>
        </div>

        {ambassador.accepting_referrals && qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="QR code for your referral link"
            width={112}
            height={112}
            className="h-28 w-28 self-start rounded-lg border border-gray-200 dark:border-gray-700"
          />
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.verified_registrations}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Verified</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.completed_onboardings}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Onboarded</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.activated_learners}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Activated</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>
          Onboarding rate:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatRate(stats.onboarding_conversion_rate)}
          </span>
        </p>
        <p>
          Activation rate:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatRate(stats.learning_activation_rate)}
          </span>
        </p>
      </div>

      {/* History */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Referral history
        </h3>
        {historyQuery.isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : historyQuery.isError ? (
          <div className="text-sm text-red-600 dark:text-red-400">
            Couldn't load your referral history.{" "}
            <button
              type="button"
              onClick={() => void historyQuery.refetch()}
              className="underline"
            >
              Try again
            </button>
          </div>
        ) : historyQuery.data && historyQuery.data.data.length > 0 ? (
          (() => {
            const { data: referrals, meta } = historyQuery.data;
            return (
              <>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {referrals.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {item.first_name || "New student"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(item.referred_at)}
                          {item.university ? ` · ${item.university.name}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            item.onboarding_completed
                              ? "bg-azure-100 text-azure-700 dark:bg-azure-900/30 dark:text-azure-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          Onboarded
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            item.learning_activated
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          Activated
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {meta.last_page > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={meta.current_page <= 1}
                      className="text-sm font-medium text-azure-500 disabled:text-gray-400"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {meta.current_page} / {meta.last_page}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(meta.last_page, p + 1))
                      }
                      disabled={meta.current_page >= meta.last_page}
                      className="text-sm font-medium text-azure-500 disabled:text-gray-400"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No referrals yet — share your link to get started.
          </p>
        )}
      </div>
    </div>
  );
};
