import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import {
  getResourcePurchase,
  getResourcePurchases,
  purchaseResourcePack,
} from "../services/resources";
import { RESOURCE_USAGE_QUERY_KEY } from "../hooks/useResourceAccess";
import type { ResourcePurchase, ResourcePurchaseStatus } from "../types/resource";

const statusLabel: Record<ResourcePurchaseStatus, string> = {
  pending: "Pending",
  succeeded: "Succeeded",
  cancelled: "Cancelled",
  expired: "Expired",
  failed: "Failed",
};

const statusColor: Record<ResourcePurchaseStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  succeeded: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

const statusIcon: Record<ResourcePurchaseStatus, typeof Clock> = {
  pending: Clock,
  succeeded: CheckCircle,
  cancelled: XCircle,
  expired: XCircle,
  failed: XCircle,
};

/**
 * One pending row's "Check status" / "Resume payment". "Check status" is a
 * one-shot fetch, not a continuous poll (the guide is explicit: don't poll
 * every historical row). "Resume payment" re-POSTs the purchase endpoint —
 * per docs/STUDENT_API_PAYLOADS.md §79 that resumes the same open checkout
 * rather than creating a new one, and only *that* response ever carries a
 * `checkout_url`/`state` (the GET-by-id response used for "Check status"
 * never does), so resuming can't be driven off the checked status.
 */
const PendingPurchaseActions = ({ purchase }: { purchase: ResourcePurchase }) => {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<ResourcePurchase | null>(null);

  const checkStatus = async () => {
    const result = await getResourcePurchase(purchase.id);
    setChecked(result.purchase);
    queryClient.setQueryData(RESOURCE_USAGE_QUERY_KEY, result.usage);
    queryClient.invalidateQueries({ queryKey: ["resource-purchases"] });
  };

  const resumeMutation = useMutation({
    mutationFn: purchaseResourcePack,
    onSuccess: (resumed) => {
      if (resumed.state === "payment_pending" && resumed.checkout_url) {
        window.location.href = resumed.checkout_url;
      }
    },
  });

  const current = checked ?? purchase;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={checkStatus}
        className="text-sm font-semibold text-azure-600 hover:text-azure-700 dark:text-azure-400"
      >
        Check status
      </button>
      {current.status === "pending" && (
        <button
          type="button"
          onClick={() => resumeMutation.mutate()}
          disabled={resumeMutation.isPending}
          className="text-sm font-semibold text-azure-600 hover:text-azure-700 disabled:opacity-60 dark:text-azure-400"
        >
          {resumeMutation.isPending ? "Resuming…" : "Resume payment"}
        </button>
      )}
      {checked && checked.status !== "pending" && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Now: {statusLabel[checked.status]}
        </span>
      )}
      {resumeMutation.isError && (
        <span className="text-sm text-red-600 dark:text-red-400">
          Couldn't resume — please try again.
        </span>
      )}
    </div>
  );
};

export const ResourcePurchases = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["resource-purchases"],
    queryFn: () => getResourcePurchases({ per_page: 20 }),
  });

  const purchases = data?.data ?? [];

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => navigate("/resources")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-azure-500 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
          Back to Resources
        </button>

        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Purchase History
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Every access-pack purchase you've made, and its status.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState
            title="No purchases yet"
            description="Access packs you buy will show up here."
            action={
              <Link
                to="/resources"
                className="inline-block rounded-xl bg-azure-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-azure-600"
              >
                Browse resources
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => {
              const StatusIcon = statusIcon[purchase.status];
              return (
                <div
                  key={purchase.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {purchase.accesses} accesses — {purchase.currency}{" "}
                        {purchase.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(purchase.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColor[purchase.status]}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                      {statusLabel[purchase.status]}
                    </span>
                  </div>
                  {purchase.status === "pending" && (
                    <PendingPurchaseActions purchase={purchase} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
};
