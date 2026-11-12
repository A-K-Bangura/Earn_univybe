import { useState } from "react";
import type { AxiosError } from "axios";
import { MessageCircle, Mail } from "lucide-react";
import { BottomSheet } from "../common/BottomSheet";
import { useGigInterest } from "../../hooks/useGigInterest";
import { ApiError } from "../../utils/apiError";
import type { ApiResponse } from "../../types";
import type { Gig, GigContactMethod, GigInterestResult } from "../../types/gig";

interface GigContactSheetProps {
  open: boolean;
  onClose: () => void;
  gig: Gig;
  onContacted: (result: GigInterestResult) => void;
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    return ApiError.fromAxiosError(error as AxiosError<ApiResponse>).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong — please try again.";
};

/**
 * Lets the student pick WhatsApp (primary, shown first when offered) or
 * Email (secondary) BEFORE any mutation fires — cancelling this sheet never
 * records an applicant. The one "Continue" action per method is what calls
 * the interest endpoint.
 */
export const GigContactSheet = ({ open, onClose, gig, onContacted }: GigContactSheetProps) => {
  const { contact, isContacting } = useGigInterest();
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (method: GigContactMethod) => {
    setError(null);
    try {
      const result = await contact(gig, method);
      if (result) {
        onContacted(result);
        onClose();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const hasWhatsapp = gig.contact_methods.includes("whatsapp");
  const hasEmail = gig.contact_methods.includes("email");

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Contact the creator"
      description="Continuing records your interest and opens WhatsApp/email with a ready-made message."
    >
      <div className="space-y-3">
        {hasWhatsapp && (
          <button
            type="button"
            onClick={() => handlePick("whatsapp")}
            disabled={isContacting}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-gray-900 dark:text-white">WhatsApp</span>
              <span className="block text-sm text-gray-500 dark:text-gray-400">
                {isContacting ? "Recording interest…" : "Open a pre-filled chat"}
              </span>
            </span>
          </button>
        )}
        {hasEmail && (
          <button
            type="button"
            onClick={() => handlePick("email")}
            disabled={isContacting}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-azure-100 text-azure-600 dark:bg-azure-900/30 dark:text-azure-400">
              <Mail className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-gray-900 dark:text-white">Email</span>
              <span className="block text-sm text-gray-500 dark:text-gray-400">
                {isContacting ? "Recording interest…" : "Open a pre-filled email"}
              </span>
            </span>
          </button>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
