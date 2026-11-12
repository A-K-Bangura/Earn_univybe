/**
 * Browser handoff helpers for a prepared certificate image. The web page can
 * only hand the PNG *file* to the browser/OS share sheet; the destination is
 * chosen by the student there, and a successful return never means anything
 * was posted anywhere.
 */

/** Feature-detects sharing of this actual File (not a browser-name list). */
export const canShareFile = (file: File | null | undefined): boolean => {
  if (!file || typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
};

export type ShareOutcome = "shared" | "cancelled";

/**
 * Opens the native share sheet with the prepared PNG. Must be called straight
 * from the Share button's click handler with an already-prepared File:
 * `navigator.share` needs a fresh user gesture, which a long render started in
 * the same click could lose.
 *
 * The user closing the sheet (AbortError) resolves quietly as "cancelled".
 * Any other failure rejects so the UI can offer Retry / Download.
 */
export const shareCertificateFile = async (file: File): Promise<ShareOutcome> => {
  try {
    // Called synchronously: nothing is awaited before this line.
    await navigator.share({ files: [file], title: "My UniVybe certificate" });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw error;
  }
};

/** Copies text; resolves false (instead of throwing) when the browser blocks it. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  } catch {
    return false;
  }
};

/** Starts a browser download of `url`. Some mobile browsers open the file instead of saving it. */
export const triggerDownload = (url: string, filename: string): void => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};
