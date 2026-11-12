import { Link } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { isAuthenticated } from "../../services/auth";
import { BuyAccessPackButton } from "./BuyAccessPackButton";
import type { ResourceUsage } from "../../types/resource";

/**
 * The compact allowance panel shown on the library page and the resource
 * detail page — one shared source of truth for `usage`, read from the
 * `useResourceAccess()` controller so it's always in sync with the last
 * access/purchase. See the design guide §4 "Allowance panel".
 */
export const ResourceUsagePanel = ({
  usageQuery,
  compact = false,
}: {
  usageQuery: UseQueryResult<ResourceUsage>;
  compact?: boolean;
}) => {
  if (!isAuthenticated()) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Browse freely. Create a student account to open or download
          resources.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <Link
            to="/auth/signup"
            className="rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-azure-600"
          >
            Get started
          </Link>
          <Link
            to="/auth/login"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (usageQuery.isLoading) {
    return (
      <div className="mb-6 h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    );
  }

  if (usageQuery.isError || !usageQuery.data) {
    return (
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <span>Couldn't load your access allowance.</span>
        <button
          type="button"
          onClick={() => usageQuery.refetch()}
          className="shrink-0 font-semibold text-azure-600 hover:text-azure-700 dark:text-azure-400"
        >
          Retry
        </button>
      </div>
    );
  }

  const usage = usageQuery.data;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {usage.summary}
        </p>
        <Link
          to="/resources/purchases"
          className="text-sm font-medium text-azure-600 hover:text-azure-700 dark:text-azure-400"
        >
          Purchase history
        </Link>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {usage.free_remaining} free left · {usage.purchased_remaining}{" "}
        purchased left
      </p>

      {!compact && (
        <details className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
            How access works
          </summary>
          <p className="mt-2">
            Opening a new resource uses one access. Opening or downloading
            the same resource again today uses no extra access. Free
            accesses are used first. Purchased accesses carry over until
            used.
          </p>
        </details>
      )}

      {usage.pack_offer && (
        <div className="mt-4">
          <BuyAccessPackButton packOffer={usage.pack_offer} />
        </div>
      )}
    </div>
  );
};
