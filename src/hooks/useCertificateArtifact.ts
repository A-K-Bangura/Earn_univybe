import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type {
  CertificateData,
  CertificateFormat,
  PreparedCertificateImage,
} from "../types/certificate";
import {
  artifactKey,
  certificateArtifacts,
  type CachedArtifact,
} from "../utils/certificates/artifactCache";
import { certificateFilename } from "../utils/certificates/data";
import { CertificateTextOverflowError } from "../utils/certificates/layout";
import {
  getCertificateAccountScope,
  subscribeCertificateAccount,
} from "../utils/certificates/session";

/** The signed-in account id, kept live across sign-out/in in this tab and in other tabs. */
export const useCertificateAccount = (): string | null =>
  useSyncExternalStore(subscribeCertificateAccount, getCertificateAccountScope, () => null);

export type ArtifactStatus = "idle" | "preparing" | "ready" | "error";

interface ArtifactState {
  key: string;
  status: "preparing" | "ready" | "error";
  image: PreparedCertificateImage | null;
  error: string | null;
}

const GENERIC_ERROR = "We couldn't prepare your certificate. Please try again.";

const describeError = (error: unknown): string =>
  error instanceof CertificateTextOverflowError ? error.message : GENERIC_ERROR;

// Typing a name re-renders the preview; wait for a pause rather than render per keystroke.
const NAME_EDIT_DEBOUNCE_MS = 350;

const toCached = (
  key: string,
  accountId: string,
  blob: Blob,
  filename: string,
  size: { width: number; height: number },
  mime: string
): CachedArtifact => ({
  key,
  accountId,
  blob,
  file: new File([blob], filename, { type: mime }),
  width: size.width,
  height: size.height,
  filename,
});

const loadRenderer = () => import("../utils/certificates/render");

// Two quick clicks on "Download PDF" must share one render.
const pdfInFlight = new Map<string, Promise<CachedArtifact>>();

export interface PreparedPdf {
  url: string;
  filename: string;
  /** Call once the download has been handed to the browser. */
  release: () => void;
}

interface UseCertificateArtifactArgs {
  accountId: string | null;
  /** Must be referentially stable between renders unless its contents change. */
  data: CertificateData | null;
  format: CertificateFormat;
}

/**
 * Prepares the selected format's PNG before the student presses Download or
 * Share (so the share click keeps its user activation), invalidates it whenever
 * the name, course, date, format or template changes, and keeps prepared files
 * in the bounded, account-scoped cache.
 */
export const useCertificateArtifact = ({ accountId, data, format }: UseCertificateArtifactArgs) => {
  const key = accountId && data ? artifactKey(accountId, data, format, "png") : null;
  const [state, setState] = useState<ArtifactState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastNameRef = useRef<string | null>(null);

  // Another student's files go the moment the account changes.
  useEffect(() => {
    certificateArtifacts.retainAccount(accountId);
  }, [accountId]);

  // If the cache is cleared (logout, session loss) re-evaluate instead of showing a revoked URL.
  useEffect(() => certificateArtifacts.subscribe(() => setAttempt((n) => n + 1)), []);

  useEffect(() => {
    if (!key || !accountId || !data) return;
    let cancelled = false;
    let heldUrl: string | null = null;

    const show = (artifact: CachedArtifact) => {
      const url = certificateArtifacts.acquireUrl(artifact.key);
      if (!url) return;
      if (cancelled) {
        certificateArtifacts.release(artifact.key, url);
        return;
      }
      heldUrl = url;
      setState({
        key,
        status: "ready",
        error: null,
        image: {
          url,
          file: artifact.file,
          width: artifact.width,
          height: artifact.height,
          filename: artifact.filename,
        },
      });
    };

    const cleanup = () => {
      cancelled = true;
      if (heldUrl) certificateArtifacts.release(key, heldUrl);
    };

    const cached = certificateArtifacts.get(key);
    if (cached) {
      show(cached);
      return cleanup;
    }

    setState({ key, status: "preparing", image: null, error: null });
    const nameChanged = lastNameRef.current !== null && lastNameRef.current !== data.displayName;
    lastNameRef.current = data.displayName;

    const timer = setTimeout(
      async () => {
        try {
          const renderer = await loadRenderer();
          const blob = await renderer.renderCertificateBlob(data, format);
          if (cancelled) return;
          const filename = certificateFilename(data.courseTitle, format, "png");
          const artifact = toCached(key, accountId, blob, filename, renderer.FORMAT_SIZES[format], "image/png");
          certificateArtifacts.set(artifact);
          show(artifact);
        } catch (error) {
          if (!cancelled) setState({ key, status: "error", image: null, error: describeError(error) });
        }
      },
      nameChanged ? NAME_EDIT_DEBOUNCE_MS : 0
    );

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [key, accountId, data, format, attempt]);

  const current = state && state.key === key ? state : null;
  const status: ArtifactStatus = !key ? "idle" : (current?.status ?? "preparing");

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /** Renders the A4 landscape PDF on demand (never ahead of time). */
  const preparePdf = useCallback(async (): Promise<PreparedPdf> => {
    if (!accountId || !data) throw new Error("Certificate details aren't ready yet.");
    const pdfKey = artifactKey(accountId, data, "landscape", "pdf");

    let artifact = certificateArtifacts.get(pdfKey);
    if (!artifact) {
      let pending = pdfInFlight.get(pdfKey);
      if (!pending) {
        pending = (async () => {
          const renderer = await loadRenderer();
          const blob = await renderer.renderCertificatePdfBlob(data);
          const filename = certificateFilename(data.courseTitle, "landscape", "pdf");
          const made = toCached(pdfKey, accountId, blob, filename, renderer.FORMAT_SIZES.landscape, "application/pdf");
          certificateArtifacts.set(made);
          return made;
        })().finally(() => pdfInFlight.delete(pdfKey));
        pdfInFlight.set(pdfKey, pending);
      }
      artifact = await pending;
    }

    const url = certificateArtifacts.acquireUrl(pdfKey);
    // Gone means the session/account changed while rendering: don't hand out another student's file.
    if (!url) throw new Error("Your session changed. Please try again.");
    return { url, filename: artifact.filename, release: () => certificateArtifacts.release(pdfKey, url) };
  }, [accountId, data]);

  return {
    status,
    image: current?.status === "ready" ? current.image : null,
    error: current?.status === "error" ? current.error : null,
    retry,
    preparePdf,
  };
};
