import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rendered under the title, above the scrollable body. */
  description?: string;
  /** Optional sticky footer (primary action). */
  footer?: ReactNode;
  children: ReactNode;
  /** Dark surface, for the immersive roadmap journey. */
  tone?: "light" | "dark";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal sheet that slides up from the bottom (mobile filter form, roadmap
 * course preview). Closes on Escape, backdrop tap or the close button; traps
 * focus while open, locks page scroll, and returns focus to whatever opened it.
 */
export const BottomSheet = ({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  tone = "light",
}: BottomSheetProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const dark = tone === "dark";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`animate-sheet-up relative z-10 flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl ${
          dark
            ? "bg-[#12183a] text-white ring-1 ring-white/10"
            : "bg-white text-gray-900 dark:bg-gray-900 dark:text-white"
        }`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-gray-300/70 sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold leading-snug">
              {title}
            </h2>
            {description && (
              <p
                className={`mt-0.5 text-sm ${
                  dark ? "text-white/70" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-transparent p-0 ${
              dark
                ? "text-white/80 hover:bg-white/10"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">
          {children}
        </div>
        {footer && (
          <div
            className={`shrink-0 border-t px-5 py-3 ${
              dark ? "border-white/10" : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
