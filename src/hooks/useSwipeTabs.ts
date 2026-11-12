import { useCallback, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

const ARM_THRESHOLD_PX = 12;
const COMMIT_FRACTION = 0.2;
const FLICK_VELOCITY_PX_MS = 0.5;
const EDGE_GUARD_PX = 24;
const SETTLE_MS = 220;
const REDUCED_MOTION_MS = 100;

const IGNORE_SELECTOR =
  'input, textarea, select, [role="slider"], video, [data-no-swipe], [role="dialog"]';

interface UseSwipeTabsOptions {
  /** Ordered tab keys, e.g. ["feed","opportunities","gigs"]. */
  tabCount: number;
  activeIndex: number;
  /** Called once a swipe commits to a new tab (caller navigates with `{replace:true}`). */
  onCommit: (nextIndex: number) => void;
  disabled?: boolean;
}

interface UseSwipeTabsResult {
  containerProps: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
    onPointerCancel: (event: React.PointerEvent) => void;
    onClickCapture: (event: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
  isDragging: boolean;
}

/**
 * Touch-only horizontal swipe between the Feed/Opportunities/Gigs discovery
 * tabs. Pointer Events (filtered to `pointerType === "touch"`) rather than
 * raw Touch Events — one listener set, and mouse/trackpad drag is never
 * armed since the guide only asks for touch-device swipe (tap/keyboard are
 * handled separately, by the tablist itself, not this hook).
 *
 * Only the active panel is ever mounted (see FeedShell/App.tsx routing), so
 * there is no adjacent panel to slide into view during the drag — the active
 * panel translates during the gesture, then a route change mounts the next
 * one fresh on commit. A true dual-panel pager would need both tabs mounted
 * mid-drag, which conflicts with "never continuously fetch hidden panels."
 */
export const useSwipeTabs = ({
  tabCount,
  activeIndex,
  onCommit,
  disabled = false,
}: UseSwipeTabsOptions): UseSwipeTabsResult => {
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [settling, setSettling] = useState(false);

  const state = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    startTime: number;
    armed: boolean;
    containerWidth: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    armed: false,
    containerWidth: 1,
  });

  const justDraggedRef = useRef(false);

  const reset = useCallback(() => {
    state.current.pointerId = null;
    state.current.armed = false;
    setIsDragging(false);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || event.pointerType !== "touch") return;
      const target = event.target as HTMLElement;
      if (target.closest(IGNORE_SELECTOR)) return;

      const viewportWidth = window.innerWidth;
      if (event.clientX < EDGE_GUARD_PX || event.clientX > viewportWidth - EDGE_GUARD_PX) {
        return; // leave room for the browser's own edge-back gesture
      }

      const container = event.currentTarget as HTMLElement;
      state.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        armed: false,
        containerWidth: container.offsetWidth || viewportWidth,
      };
    },
    [disabled]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (state.current.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.current.startX;
      const dy = event.clientY - state.current.startY;

      if (!state.current.armed) {
        if (Math.abs(dx) < ARM_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
          return; // ambiguous — let native scroll proceed
        }
        state.current.armed = true;
        setIsDragging(true);
      }

      event.preventDefault();

      const atStart = activeIndex === 0 && dx > 0;
      const atEnd = activeIndex === tabCount - 1 && dx < 0;
      const rubberBanded = atStart || atEnd ? dx * 0.35 : dx;
      setDragOffsetPx(prefersReducedMotion ? 0 : rubberBanded);
    },
    [activeIndex, tabCount, prefersReducedMotion]
  );

  const settleTo = useCallback(
    (target: number, after: () => void) => {
      setSettling(true);
      setDragOffsetPx(target);
      const duration = prefersReducedMotion ? REDUCED_MOTION_MS : SETTLE_MS;
      window.setTimeout(() => {
        setSettling(false);
        setDragOffsetPx(0);
        after();
      }, duration);
    },
    [prefersReducedMotion]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (state.current.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.current.startX;
      const elapsed = Math.max(1, performance.now() - state.current.startTime);
      const wasArmed = state.current.armed;
      reset();
      if (!wasArmed) return;

      const velocity = Math.abs(dx) / elapsed;
      const commit =
        Math.abs(dx) > state.current.containerWidth * COMMIT_FRACTION ||
        velocity > FLICK_VELOCITY_PX_MS;

      if (!commit) {
        settleTo(0, () => {});
        return;
      }

      const direction = dx < 0 ? 1 : -1; // left swipe -> next tab
      const nextIndex = Math.min(tabCount - 1, Math.max(0, activeIndex + direction));

      if (nextIndex === activeIndex) {
        settleTo(0, () => {}); // already at an edge — snap back, no navigation
        return;
      }

      justDraggedRef.current = true;
      settleTo(direction * state.current.containerWidth, () => {
        onCommit(nextIndex);
      });
    },
    [activeIndex, tabCount, onCommit, reset, settleTo]
  );

  const onPointerCancel = useCallback(() => {
    const wasArmed = state.current.armed;
    reset();
    if (wasArmed) settleTo(0, () => {});
  }, [reset, settleTo]);

  // Swallows only the one synthetic click that immediately follows a
  // recognized drag release, so a card underneath the finger doesn't
  // accidentally navigate — an ordinary tap is never touched (preventDefault
  // only ever fires after arming at >12px of horizontal-dominant movement).
  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  return {
    isDragging,
    containerProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
      style: {
        touchAction: "pan-y",
        transform: dragOffsetPx ? `translateX(${dragOffsetPx}px)` : undefined,
        transition: settling
          ? `transform ${prefersReducedMotion ? REDUCED_MOTION_MS : SETTLE_MS}ms ease-out`
          : undefined,
      },
    },
  };
};
