import { BottomSheet } from "../common/BottomSheet";
import { BuyAccessPackButton } from "./BuyAccessPackButton";
import type { ResourceAccessLimitDetails } from "../../types/resource";

const formatResetTime = (resetsAt: string): string => {
  try {
    return new Date(resetsAt).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return resetsAt;
  }
};

/**
 * The 402 RESOURCE_ACCESS_LIMIT_REACHED paywall — a small interaction
 * dialog, not a separate page. See the design guide §7.
 */
export const ResourceAccessDialog = ({
  details,
  onClose,
}: {
  details: ResourceAccessLimitDetails | null;
  onClose: () => void;
}) => {
  const { usage, purchase_available } = details ?? {};

  return (
    <BottomSheet
      open={!!details}
      onClose={onClose}
      title="No new resource accesses left today"
      footer={
        <div className="space-y-3">
          {purchase_available && usage?.pack_offer && (
            <BuyAccessPackButton packOffer={usage.pack_offer} />
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Keep browsing
          </button>
        </div>
      }
    >
      {usage && (
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>{usage.summary}.</p>
          <p>
            Resources you already opened today can still be opened again —
            this only applies to new ones.
          </p>
          <p>
            Your free accesses reset{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatResetTime(usage.resets_at)}
            </span>
            .
          </p>
        </div>
      )}
    </BottomSheet>
  );
};
