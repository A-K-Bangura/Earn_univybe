import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  id: string;
  title: string;
  subtitle?: string;
  /** Right-aligned "See all"-style action: a link (`to`) or a button (`onClick`). */
  action?: { label: string; to?: string; onClick?: () => void };
}

const actionClass =
  "inline-flex shrink-0 items-center gap-1 rounded-md bg-transparent p-0 text-sm font-semibold text-azure-500 transition-colors hover:text-azure-600 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-azure-500 dark:text-azure-700 dark:hover:text-azure-800";

/** Consistent title row for the discovery sections (courses and roadmaps). */
export const SectionHeader = ({
  id,
  title,
  subtitle,
  action,
}: SectionHeaderProps) => (
  <div className="mb-4 flex items-end justify-between gap-4">
    <div className="min-w-0">
      <h2 id={id} className="text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
    {action &&
      (action.to ? (
        // `own-links` keeps the global unlayered `a { color }` rule off this link.
        <span className="own-links shrink-0">
          <Link to={action.to} className={actionClass}>
            {action.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </span>
      ) : (
        <button type="button" onClick={action.onClick} className={actionClass}>
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ))}
  </div>
);
