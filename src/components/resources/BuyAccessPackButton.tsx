import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { purchaseResourcePack } from "../../services/resources";
import { ApiError } from "../../utils/apiError";
import type { ApiResponse } from "../../types";
import type { ResourcePackOffer } from "../../types/resource";

const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === "object" && "response" in error) {
    return ApiError.fromAxiosError(
      error as AxiosError<ApiResponse>
    ).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong.";
};

/**
 * Shared "Buy N accesses — Le X" button, used by both the usage panel and
 * the 402 paywall dialog so the purchase flow (and its error/processing
 * states) is written exactly once.
 */
export const BuyAccessPackButton = ({
  packOffer,
  className,
}: {
  packOffer: ResourcePackOffer;
  className?: string;
}) => {
  const purchaseMutation = useMutation({
    mutationFn: purchaseResourcePack,
    onSuccess: (purchase) => {
      if (purchase.state === "payment_pending" && purchase.checkout_url) {
        window.location.href = purchase.checkout_url;
      }
      // state === "payment_processing": no checkout to reopen, the
      // "Confirming your payment…" text below covers it.
    },
  });

  const errorMessage = getErrorMessage(purchaseMutation.error);
  const isProcessing =
    purchaseMutation.data?.state === "payment_processing" &&
    !purchaseMutation.isPending;

  if (isProcessing) {
    return (
      <p className="text-sm font-medium text-azure-700 dark:text-azure-300">
        Confirming your payment…
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => purchaseMutation.mutate()}
        disabled={purchaseMutation.isPending}
        className="w-full rounded-xl bg-azure-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {purchaseMutation.isPending
          ? "Starting checkout…"
          : `Buy ${packOffer.accesses} accesses — ${packOffer.currency} ${packOffer.price.toLocaleString()}`}
      </button>
      {errorMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
