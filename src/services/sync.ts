import api from "./api";
import type { OfflineAction } from "../utils/db";
import {
  getOfflineActions,
  removeOfflineAction,
  bumpOfflineActionRetryCount,
  isOnline,
  onOnlineStatusChange,
} from "../utils/db";

const MAX_RETRIES = 3;

export const syncOfflineActions = async (
  onActionSynced?: (action: OfflineAction) => void
): Promise<void> => {
  if (!isOnline()) {
    console.log("Offline - skipping sync");
    return;
  }

  const actions = await getOfflineActions();

  for (const action of actions) {
    try {
      // Execute the action
      switch (action.method) {
        case "POST":
          await api.post(action.url, action.payload);
          break;
        case "PUT":
          await api.put(action.url, action.payload);
          break;
        case "DELETE":
          await api.delete(action.url);
          break;
        default:
          console.error("Unknown method:", action.method);
          continue;
      }

      // Success - remove from queue
      await removeOfflineAction(action.id as string);
      console.log("Synced action:", action.type);
      onActionSynced?.(action);
    } catch (error) {
      console.error("Failed to sync action:", action.type, error);
      // Track retries and drop the action once it's failed too many times
      // (e.g. a validation error that will never succeed as-is) rather than
      // retrying it forever on every future reconnect.
      const retryCount = await bumpOfflineActionRetryCount(
        action.id as string
      );
      if (retryCount >= MAX_RETRIES) {
        await removeOfflineAction(action.id as string);
        console.log("Removed action after max retries:", action.type);
      }
    }
  }
};

export const initSync = (
  onActionSynced?: (action: OfflineAction) => void
): (() => void) => {
  // Initial sync if online
  if (isOnline()) {
    syncOfflineActions(onActionSynced);
  }

  // Sync when coming back online
  return onOnlineStatusChange((online) => {
    if (online) {
      console.log("Back online - syncing actions");
      syncOfflineActions(onActionSynced);
    }
  });
};
