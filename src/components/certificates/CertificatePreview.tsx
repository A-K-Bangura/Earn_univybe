import { AlertTriangle, Loader2 } from "lucide-react";
import type {
  CertificateData,
  CertificateFormat,
  PreparedCertificateImage,
} from "../../types/certificate";
import type { ArtifactStatus } from "../../hooks/useCertificateArtifact";
import { certificateAltText, FORMAT_LABELS } from "../../utils/certificates/data";

interface CertificatePreviewProps {
  data: CertificateData | null;
  format: CertificateFormat;
  status: ArtifactStatus;
  image: PreparedCertificateImage | null;
  error: string | null;
  onRetry: () => void;
}

const FRAME: Record<CertificateFormat, { ratio: string; maxWidth: string }> = {
  landscape: { ratio: "2400 / 1697", maxWidth: "min(100%, 860px)" },
  story: { ratio: "1080 / 1920", maxWidth: "min(100%, 340px)" },
};

/**
 * The preview *is* the exported PNG, scaled down to fit — the same pixels the
 * student will download or share, never a separate responsive re-layout or a
 * screenshot of the page. Real text for assistive tech sits beside it.
 */
export const CertificatePreview = ({
  data,
  format,
  status,
  image,
  error,
  onRetry,
}: CertificatePreviewProps) => {
  const frame = FRAME[format];
  const sizeLabel = image ? `${image.width} × ${image.height} px` : null;

  return (
    <div>
      <div className="flex justify-center rounded-xl bg-slate-100 p-3 sm:p-6 dark:bg-gray-800/60">
        <div
          className="relative w-full overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-900"
          style={{ aspectRatio: frame.ratio, maxWidth: frame.maxWidth }}
        >
          {image && data ? (
            <img
              src={image.url}
              width={image.width}
              height={image.height}
              alt={certificateAltText(data, format)}
              className="block h-full w-full"
              draggable={false}
            />
          ) : status === "error" ? (
            <div
              role="alert"
              className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-gray-700 dark:text-gray-300"
            >
              <AlertTriangle className="h-7 w-7 text-amber-500" aria-hidden="true" />
              <p>{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-11 items-center rounded-lg bg-azure-500 px-5 font-semibold text-white hover:bg-azure-400"
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full animate-pulse items-center justify-center bg-gray-100 dark:bg-gray-800"
            >
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400"
      >
        {status === "preparing" && "Preparing image…"}
        {status === "ready" && `Ready · ${FORMAT_LABELS[format]} PNG · ${sizeLabel}`}
        {status === "error" && "We couldn't prepare the image."}
      </p>
    </div>
  );
};
