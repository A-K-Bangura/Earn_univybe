import { create } from "zustand";

interface FeedTabState {
  /** The last of /feed, /feed/opportunities or /feed/gigs the student visited this session. */
  lastVisitedFeedTab: string;
  setLastVisitedFeedTab: (path: string) => void;
}

// Deliberately not persisted — a hard reload always re-derives the active
// tab from the URL (the guide requires the URL be authoritative on direct
// load), so session-only memory is all "reopen the last tab" needs.
export const useFeedTabStore = create<FeedTabState>((set) => ({
  lastVisitedFeedTab: "/feed",
  setLastVisitedFeedTab: (path) => set({ lastVisitedFeedTab: path }),
}));
