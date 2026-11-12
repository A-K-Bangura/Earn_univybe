import type { ReactNode } from "react";
import { Mascot, type MascotPose } from "./Mascot";

interface EmptyStateProps {
  title: string;
  description: string;
  /** Vybe's pose; omit for a compact, text-only state. */
  pose?: MascotPose;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty / no-results state, optionally with Vybe. */
export const EmptyState = ({
  title,
  description,
  pose,
  action,
  className = "",
}: EmptyStateProps) => (
  <div
    className={`rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-800 ${className}`}
  >
    {pose && <Mascot pose={pose} className="mx-auto mb-4 h-28 w-auto" />}
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
      {title}
    </h3>
    <p className="mx-auto mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">
      {description}
    </p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);
