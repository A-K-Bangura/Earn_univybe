import { openDB, type IDBPDatabase } from "idb";
import { isAxiosError } from "axios";

export interface OfflineAction {
  id: string;
  type: "quiz" | "lesson_complete" | "quiz_complete" | "enrollment";
  method: "POST" | "PUT" | "DELETE";
  url: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

/**
 * Thrown by a service function instead of returning/throwing normally when
 * a write action couldn't reach the server and was queued locally instead.
 * Callers should catch this specifically to show a "saved, will sync later"
 * state rather than a hard error.
 */
export class OfflineQueuedError extends Error {
  constructor(message = "Saved offline — will sync when you're back online.") {
    super(message);
    this.name = "OfflineQueuedError";
    Object.setPrototypeOf(this, OfflineQueuedError.prototype);
  }
}

/** True for a request that never reached the server (offline, DNS/timeout) — false for a real 4xx/5xx from the backend. */
export const isNetworkError = (error: unknown): boolean =>
  isAxiosError(error) && !error.response;

/**
 * Queue a write action locally and throw OfflineQueuedError. Call this from
 * a service function's offline/network-error branch instead of duplicating
 * the addOfflineAction + throw pairing at every call site.
 */
export const queueOfflineAction = async (
  action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">
): Promise<never> => {
  await addOfflineAction(action);
  throw new OfflineQueuedError();
};

const DB_NAME = "EduLiftDB";
const DB_VERSION = 1;
const STORE_ACTIONS = "offlineActions";
const STORE_CACHE = "apiCache";

let dbInstance: IDBPDatabase | null = null;

export const initDB = async (): Promise<IDBPDatabase> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline actions store
      if (!db.objectStoreNames.contains(STORE_ACTIONS)) {
        db.createObjectStore(STORE_ACTIONS, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      // API cache store
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE);
      }
    },
  });

  return dbInstance;
};

export const addOfflineAction = async (
  action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">
): Promise<void> => {
  const db = await initDB();
  await db.add(STORE_ACTIONS, {
    ...action,
    timestamp: Date.now(),
    retryCount: 0,
  });
};

export const getOfflineActions = async (): Promise<OfflineAction[]> => {
  const db = await initDB();
  return await db.getAll(STORE_ACTIONS);
};

export const removeOfflineAction = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORE_ACTIONS, id);
};

/** Increment and persist an action's retry count after a failed sync attempt; returns the new count. */
export const bumpOfflineActionRetryCount = async (
  id: string
): Promise<number> => {
  const db = await initDB();
  const action = (await db.get(STORE_ACTIONS, id)) as OfflineAction | undefined;
  if (!action) return 0;
  const retryCount = (action.retryCount ?? 0) + 1;
  await db.put(STORE_ACTIONS, { ...action, retryCount });
  return retryCount;
};

export const clearOfflineActions = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(STORE_ACTIONS);
};

export const getCachedResponse = async <T>(
  key: string
): Promise<T | undefined> => {
  const db = await initDB();
  return await db.get(STORE_CACHE, key);
};

export const setCachedResponse = async (
  key: string,
  value: unknown,
  ttl: number = 3600000
): Promise<void> => {
  const db = await initDB();
  await db.put(
    STORE_CACHE,
    {
      value,
      timestamp: Date.now(),
      ttl,
    },
    key
  );
};

export const clearCache = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(STORE_CACHE);
};

export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onOnlineStatusChange = (
  callback: (online: boolean) => void
): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
};
