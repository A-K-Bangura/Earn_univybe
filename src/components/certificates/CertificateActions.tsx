import { useEffect, useRef, useState } from "react";
import { Copy, Download, FileText, Share2 } from "lucide-react";
import type {
  CertificateData,
  CertificateFormat,
  PreparedCertificateImage,
} from "../../types/certificate";
import type { ArtifactStatus, PreparedPdf } from "../../hooks/useCertificateArtifact";
import { certificateCaption, FORMAT_LABELS } from "../../utils/certificates/data";
import {
  canShareFile,
  copyText,
  shareCertificateFile,
  triggerDownload,
} from "../../utils/certificates/share";

interface CertificateActionsProps {
  data: CertificateData | null;
  format: CertificateFormat;
  status: ArtifactStatus;
  image: PreparedCertificateImage | null;
  preparePdf: () => Promise<PreparedPdf>;
}

type Notice = { tone: "info" | "error"; text: string };

const PDF_URL_LIFETIME_MS = 30_000;

const primary =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-azure-500 px-5 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-azure-400 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto";
const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-transparent px-4 py-2 font-semibold text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800";

/**
 * Download image / Download PDF / Share. The PNG is prepared before any of
 * these can be pressed, so Share calls `navigator.share` synchronously from the
 * click with a ready File and keeps its user activation.
 */
export const CertificateActions = ({ data, format, status, image, preparePdf }: CertificateActionsProps) => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [manualCaption, setManualCaption] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const releases = useRef(new Set<() => void>());
  const timers = useRef(new Set<number>());

  // Blob URLs handed to the browser for download are released after a delay, or on leaving the page.
  useEffect(() => {
    const pendingReleases = releases.current;
    const pendingTimers = timers.current;
    return () => {
      pendingTimers.forEach((t) => window.clearTimeout(t));
      pendingReleases.forEach((release) => release());
      pendingReleases.clear();
    };
  }, []);

  const ready = status === "ready" && !!image && !!data;
  const nativeShare = canShareFile(image?.file);
  const caption = data ? certificateCaption(data.courseTitle) : "";
  const formatLabel = FORMAT_LABELS[format];

  const downloadImage = () => {
    if (!image) return;
    triggerDownload(image.url, image.filename);
    setNotice({ tone: "info", text: `Download started: ${image.filename}` });
  };

  const downloadPdf = async () => {
    if (!ready || pdfBusy) return;
    setPdfBusy(true);
    setNotice({ tone: "info", text: "Preparing PDF…" });
    try {
      const pdf = await preparePdf();
      triggerDownload(pdf.url, pdf.filename);
      releases.current.add(pdf.release);
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        if (releases.current.delete(pdf.release)) pdf.release();
      }, PDF_URL_LIFETIME_MS);
      timers.current.add(timer);
      setNotice({ tone: "info", text: `Download started: ${pdf.filename}` });
    } catch {
      setNotice({ tone: "error", text: "We couldn't prepare the PDF. Please try again." });
    } finally {
      setPdfBusy(false);
    }
  };

  const share = () => {
    if (!image) return;
    if (!nativeShare) {
      // No file sharing here: explain the manual route; never pretend a link or caption is the certificate.
      setFallbackOpen((open) => !open);
      return;
    }
    setNotice(null);
    setShareFailed(false);
    // Straight from the click, with the already-prepared File. Cancelling the
    // sheet resolves quietly; only real failures reach the catch.
    shareCertificateFile(image.file).catch(() => {
      setShareFailed(true);
      setNotice({
        tone: "error",
        text: "Sharing didn't start. Tap Share image to try again, or download the image instead.",
      });
    });
  };

  const copyCaption = async () => {
    const ok = await copyText(caption);
    setManualCaption(!ok);
    setNotice(ok ? { tone: "info", text: "Caption copied." } : null);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Exports the <strong>{formatLabel.toLowerCase()}</strong>
        {format === "landscape"
          ? " as a PNG image or an A4 landscape PDF."
          : " as a 1080 × 1920 PNG image."}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={downloadImage} disabled={!ready} className={primary}>
          <Download className="h-5 w-5" aria-hidden="true" />
          Download image
        </button>
        {format === "landscape" && (
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={!ready || pdfBusy}
            className={secondary}
          >
            <FileText className="h-5 w-5" aria-hidden="true" />
            {pdfBusy ? "Preparing PDF…" : "Download PDF"}
          </button>
        )}
        <button
          type="button"
          onClick={share}
          disabled={!ready}
          aria-expanded={!nativeShare ? fallbackOpen : undefined}
          className={secondary}
        >
          <Share2 className="h-5 w-5" aria-hidden="true" />
          {shareFailed ? "Share image" : "Share"}
        </button>
      </div>

      {fallbackOpen && !nativeShare && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
          <p className="font-semibold">
            Download the image, then upload it to your status or story.
          </p>
          <p className="mt-1">
            This browser can't share image files directly, and UniVybe can't post for you. Save the
            image, then add it in the app you want to share it on.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={downloadImage} className={primary}>
              <Download className="h-5 w-5" aria-hidden="true" />
              Download image
            </button>
            <button type="button" onClick={() => void copyCaption()} className={secondary}>
              <Copy className="h-5 w-5" aria-hidden="true" />
              Copy caption
            </button>
          </div>
        </div>
      )}

      {(!fallbackOpen || nativeShare) && (
        <button
          type="button"
          onClick={() => void copyCaption()}
          disabled={!ready}
          className="inline-flex min-h-11 items-center gap-2 bg-transparent p-0 text-sm font-semibold text-azure-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-azure-400"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy caption
        </button>
      )}

      {manualCaption && (
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Copy this caption manually:
          <textarea
            readOnly
            value={caption}
            rows={2}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </label>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        On some phones the image opens instead of saving — press and hold it, or use your
        device's share controls, to keep a copy.
      </p>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`text-sm ${
            notice.tone === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
};
