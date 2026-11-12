import { Link } from "react-router-dom";
import { FileText, Link2, Youtube, CheckCircle2 } from "lucide-react";
import { formatFileSize } from "../../utils/format";
import type { Resource } from "../../types/resource";

const hasAcademicContext = (resource: Resource): boolean => {
  const ctx = resource.academic_context;
  return !!(
    ctx.university_id ||
    ctx.faculty_id ||
    ctx.department_id ||
    ctx.organization_id ||
    ctx.level ||
    ctx.semester
  );
};

const academicContextLabel = (resource: Resource): string | null => {
  const ctx = resource.academic_context;
  const parts = [
    ctx.department?.name ?? ctx.faculty?.name ?? ctx.university?.name,
    ctx.organization?.name,
    ctx.level ? `Year ${ctx.level}` : undefined,
    ctx.semester,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
};

interface ResourceListItemProps {
  resource: Resource;
  formatLabel: string;
  isAccessing: boolean;
  onOpen: (disposition?: "inline" | "attachment") => void;
}

/**
 * One row — used by both the library list and CourseResourcesSection, so
 * the access controls (and what they mean) are identical everywhere a
 * resource shows up. See the design guide §4.3.
 */
export const ResourceListItem = ({
  resource,
  formatLabel,
  isAccessing,
  onOpen,
}: ResourceListItemProps) => {
  const isPdf = resource.source_type === "file" && resource.format === "pdf";
  const isExternal = resource.source_type === "external";
  const isYoutube = resource.link_type?.startsWith("youtube");

  const Icon = isExternal ? (isYoutube ? Youtube : Link2) : FileText;

  const metaParts = [
    resource.author,
    resource.subject,
    resource.module,
    resource.publication_year ? String(resource.publication_year) : null,
    resource.file ? formatFileSize(resource.file.size_bytes) : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-start dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-azure-50 text-azure-600 dark:bg-azure-900/20 dark:text-azure-400 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <Link
          to={`/resources/${resource.uuid}`}
          className="line-clamp-2 text-base font-semibold text-gray-900 hover:text-azure-600 dark:text-white dark:hover:text-azure-400"
        >
          {resource.title}
        </Link>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {resource.resource_type_label} · {formatLabel}
        </p>
        {resource.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {resource.description}
          </p>
        )}
        {(metaParts.length > 0 || hasAcademicContext(resource)) && (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">
            {hasAcademicContext(resource)
              ? academicContextLabel(resource)
              : "General resource"}
            {metaParts.length > 0 &&
              (hasAcademicContext(resource) ? " · " : "") +
                metaParts.join(" · ")}
          </p>
        )}
        {resource.accessed_today && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Opened today
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
        {isExternal ? (
          <button
            type="button"
            onClick={() => onOpen()}
            disabled={isAccessing}
            className="rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAccessing ? "Opening…" : "Open link"}
          </button>
        ) : isPdf ? (
          <>
            <button
              type="button"
              onClick={() => onOpen("inline")}
              disabled={isAccessing}
              className="rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAccessing ? "Opening…" : "Open PDF"}
            </button>
            <button
              type="button"
              onClick={() => onOpen("attachment")}
              disabled={isAccessing}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Download
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onOpen("attachment")}
            disabled={isAccessing}
            className="rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAccessing ? "Preparing download…" : "Download"}
          </button>
        )}
      </div>
    </div>
  );
};
