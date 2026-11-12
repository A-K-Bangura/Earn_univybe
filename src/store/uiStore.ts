import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  darkMode: boolean;
  lowBandwidthMode: boolean;
  isMobilePanelOpen: boolean;
  currentMiniLessonId: string | null;
  toggleDarkMode: () => void;
  toggleLowBandwidthMode: () => void;
  toggleMobilePanel: () => void;
  setCurrentMiniLesson: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      lowBandwidthMode: false,
      isMobilePanelOpen: false,
      currentMiniLessonId: null,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleLowBandwidthMode: () =>
        set((state) => ({ lowBandwidthMode: !state.lowBandwidthMode })),
      toggleMobilePanel: () =>
        set((state) => ({ isMobilePanelOpen: !state.isMobilePanelOpen })),
      setCurrentMiniLesson: (id) => set({ currentMiniLessonId: id }),
    }),
    {
      name: "edulift-ui-storage",
    }
  )
);
