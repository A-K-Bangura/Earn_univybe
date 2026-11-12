import type { CertificateData } from "../../../types/certificate";
import { CertificateTextOverflowError, assertTitleLength, fitTiered, type FittedText, type Measure } from "../layout";
import type { CertificateAssets, CertificateFonts } from "./assets";
import {
  BRAND,
  drawContain,
  drawMascotFallback,
  drawTrackedText,
  roundRectPath,
  type Rect,
} from "./shapes";

/** Canonical landscape canvas: ~A4 landscape at 2400px wide (A4 = 297 × 210mm → 1.4143). */
export const LANDSCAPE_SIZE = { width: 2400, height: 1697 } as const;

const INSET = 140;
const TEXT_CX = 1200;
/** Text never enters the right-hand mascot column, whatever its length. */
const TEXT_WIDTH = 1520;
const FLOW_TOP = 372;
const FLOW_BOTTOM = 1392;
const MASCOT_BOX: Rect = { x: 2000, y: 1040, w: 260, h: 520 };
const LABEL = "CERTIFICATE OF COMPLETION";
const FOOTER = "A celebration of learning on UniVybe";

export type LandscapeRole = "label" | "body" | "name" | "title";

export interface LandscapePlan {
  scale: number;
  label: { y: number; size: number };
  intro: { y: number; size: number };
  name: FittedText & { y: number };
  rule: { y: number; width: number };
  outro: { y: number; size: number };
  title: FittedText & { y: number };
  date: { y: number; size: number; text: string } | null;
}

/**
 * Decides every size and position without touching a canvas, so layout is
 * testable and deterministic. The whole text stack is scaled down (never
 * clipped) until it fits between the wordmark and the footer; if even the
 * smallest readable sizes don't fit, it throws instead of producing a
 * clipped certificate.
 */
export const planLandscape = (
  data: Pick<CertificateData, "displayName" | "courseTitle" | "completionDateLabel">,
  measure: (role: LandscapeRole, text: string, sizePx: number) => number
): LandscapePlan => {
  assertTitleLength(data.courseTitle);
  const nameMeasure: Measure = (t, s) => measure("name", t, s);
  const titleMeasure: Measure = (t, s) => measure("title", t, s);
  const available = FLOW_BOTTOM - FLOW_TOP;

  for (let scale = 1; scale >= 0.5; scale = Math.round((scale - 0.05) * 100) / 100) {
    const labelSize = Math.max(34, Math.round(54 * scale));
    const bodySize = Math.max(30, Math.round(42 * scale));
    const dateSize = Math.max(32, Math.round(46 * scale));

    const name = fitTiered(data.displayName, TEXT_WIDTH, 1.12, nameMeasure, [
      { maxLines: 1, maxSize: 128 * scale, minSize: 84 * scale, maxHeight: 160 * scale },
      { maxLines: 2, maxSize: 112 * scale, minSize: 60 * scale, maxHeight: 300 * scale },
      { maxLines: 4, maxSize: 72 * scale, minSize: 44, maxHeight: 420 * scale },
    ]);
    const title = fitTiered(data.courseTitle, TEXT_WIDTH, 1.22, titleMeasure, [
      { maxLines: 2, maxSize: 80 * scale, minSize: 56 * scale, maxHeight: 220 * scale },
      { maxLines: 4, maxSize: 64 * scale, minSize: 44, maxHeight: 360 * scale },
      { maxLines: 10, maxSize: 48, minSize: 36, maxHeight: 640 },
    ]);
    if (!name.fits || !title.fits) continue;

    const gaps = {
      label: Math.round(52 * scale),
      intro: Math.round(26 * scale),
      name: Math.round(30 * scale),
      rule: Math.round(42 * scale),
      outro: Math.round(26 * scale),
      title: Math.round(44 * scale),
    };
    const ruleHeight = 8;
    const labelH = labelSize;
    const bodyH = Math.round(bodySize * 1.2);
    const dateH = data.completionDateLabel ? Math.round(dateSize * 1.2) : 0;

    const total =
      labelH + gaps.label + bodyH + gaps.intro + name.height + gaps.name + ruleHeight + gaps.rule +
      bodyH + gaps.outro + title.height + (dateH ? gaps.title + dateH : 0);
    if (total > available) continue;

    let y = FLOW_TOP + Math.round((available - total) / 2);
    const place = (height: number, gapAfter: number) => {
      const top = y;
      y += height + gapAfter;
      return top;
    };
    const labelTop = place(labelH, gaps.label);
    const introTop = place(bodyH, gaps.intro);
    const nameTop = place(name.height, gaps.name);
    const ruleTop = place(ruleHeight, gaps.rule);
    const outroTop = place(bodyH, gaps.outro);
    const titleTop = place(title.height, dateH ? gaps.title : 0);
    const dateTop = dateH ? place(dateH, 0) : 0;

    return {
      scale,
      label: { y: labelTop + labelH / 2, size: labelSize },
      intro: { y: introTop + bodyH / 2, size: bodySize },
      name: { ...name, y: nameTop },
      rule: { y: ruleTop, width: Math.min(560, Math.max(280, Math.round(TEXT_WIDTH * 0.32))) },
      outro: { y: outroTop + bodyH / 2, size: bodySize },
      title: { ...title, y: titleTop },
      date:
        data.completionDateLabel && dateH
          ? { y: dateTop + dateH / 2, size: dateSize, text: data.completionDateLabel }
          : null,
    };
  }
  throw new CertificateTextOverflowError(
    "name or course title"
  );
};

const nameFont = (fonts: CertificateFonts, size: number) => `400 ${size}px ${fonts.display}`;

/** Measures with the exact font each role is drawn in, so wrapping matches rendering. */
export const canvasLandscapeMeasure =
  (ctx: CanvasRenderingContext2D, fonts: CertificateFonts) =>
  (role: LandscapeRole, text: string, sizePx: number): number => {
    ctx.font =
      role === "name"
        ? nameFont(fonts, sizePx)
        : role === "title"
          ? `700 ${sizePx}px ${fonts.body}`
          : `500 ${sizePx}px ${fonts.body}`;
    return ctx.measureText(text).width;
  };

const drawCornerShapes = (ctx: CanvasRenderingContext2D) => {
  const { width: W, height: H } = LANDSCAPE_SIZE;
  const circle = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Top-left cluster
  circle(0, 0, 430, "rgba(58,134,255,0.10)");
  circle(0, 0, 300, "rgba(131,56,236,0.10)");
  circle(0, 0, 170, "rgba(255,190,11,0.30)");
  circle(262, 214, 20, BRAND.rose);
  circle(168, 318, 13, BRAND.aqua);
  circle(350, 128, 11, BRAND.azure);
  // Bottom-right cluster
  circle(W, H, 430, "rgba(131,56,236,0.10)");
  circle(W, H, 300, "rgba(58,134,255,0.10)");
  circle(W, H, 170, "rgba(255,0,110,0.16)");
  // Small bottom-left / top-right touches
  circle(214, H - 232, 16, BRAND.amber);
  circle(300, H - 150, 11, BRAND.violet);
  circle(W - 230, 220, 18, BRAND.aqua);
  circle(W - 330, 150, 11, BRAND.rose);
};

export const drawLandscape = (
  ctx: CanvasRenderingContext2D,
  plan: LandscapePlan,
  assets: CertificateAssets,
  fonts: CertificateFonts
) => {
  const { width: W, height: H } = LANDSCAPE_SIZE;

  // Opaque background (PNG and PDF must never be transparent).
  ctx.fillStyle = BRAND.paper;
  ctx.fillRect(0, 0, W, H);

  // Decorative corner shapes, clipped inside the frame.
  ctx.save();
  roundRectPath(ctx, 64, 64, W - 128, H - 128, 28);
  ctx.clip();
  drawCornerShapes(ctx);
  ctx.restore();

  // Thin double frame.
  ctx.lineWidth = 4;
  ctx.strokeStyle = BRAND.violet;
  roundRectPath(ctx, 64, 64, W - 128, H - 128, 28);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(11,16,38,0.22)";
  roundRectPath(ctx, 88, 88, W - 176, H - 176, 18);
  ctx.stroke();

  // Wordmark (text fallback if the image is unavailable).
  if (assets.wordmarkColor) {
    drawContain(ctx, assets.wordmarkColor, { x: TEXT_CX - 230, y: INSET + 10, w: 460, h: 141 });
  } else {
    ctx.fillStyle = BRAND.navy;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 110px ${fonts.display}`;
    ctx.fillText("UniVybe", TEXT_CX, INSET + 80);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Label
  ctx.fillStyle = BRAND.violetDeep;
  ctx.font = `700 ${plan.label.size}px ${fonts.body}`;
  drawTrackedText(ctx, LABEL, TEXT_CX, plan.label.y, plan.label.size * 0.18);

  // "This celebrates"
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 ${plan.intro.size}px ${fonts.body}`;
  ctx.fillText("This celebrates", TEXT_CX, plan.intro.y);

  // Name — the centrepiece
  ctx.fillStyle = BRAND.navy;
  ctx.font = nameFont(fonts, plan.name.size);
  plan.name.lines.forEach((line, i) => {
    ctx.fillText(line, TEXT_CX, plan.name.y + plan.name.lineHeightPx * (i + 0.5));
  });

  // Tri-colour rule under the name.
  const segment = plan.rule.width / 3;
  const ruleX = TEXT_CX - plan.rule.width / 2;
  [BRAND.azure, BRAND.violet, BRAND.rose].forEach((color, i) => {
    ctx.fillStyle = color;
    roundRectPath(ctx, ruleX + segment * i + (i ? 4 : 0), plan.rule.y, segment - 4, 8, 4);
    ctx.fill();
  });

  // "for completing"
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 ${plan.outro.size}px ${fonts.body}`;
  ctx.fillText("for completing", TEXT_CX, plan.outro.y);

  // Course title (always in full).
  ctx.fillStyle = BRAND.navy;
  ctx.font = `700 ${plan.title.size}px ${fonts.body}`;
  plan.title.lines.forEach((line, i) => {
    ctx.fillText(line, TEXT_CX, plan.title.y + plan.title.lineHeightPx * (i + 0.5));
  });

  // Recorded completion date (omitted when none was recorded).
  if (plan.date) {
    ctx.fillStyle = BRAND.ink;
    ctx.font = `600 ${plan.date.size}px ${fonts.body}`;
    ctx.fillText(plan.date.text, TEXT_CX, plan.date.y);
  }

  // Footer
  ctx.strokeStyle = "rgba(11,16,38,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TEXT_CX - 420, 1452);
  ctx.lineTo(TEXT_CX + 420, 1452);
  ctx.stroke();
  ctx.fillStyle = BRAND.ink;
  ctx.font = `500 38px ${fonts.body}`;
  ctx.fillText(FOOTER, TEXT_CX, 1510);

  // Mascot (or brand-shape fallback).
  if (assets.graduate) {
    drawContain(ctx, assets.graduate, MASCOT_BOX, "bottom");
  } else {
    drawMascotFallback(ctx, { x: MASCOT_BOX.x - 20, y: MASCOT_BOX.y + 120, w: MASCOT_BOX.w + 40, h: 400 });
  }

};
