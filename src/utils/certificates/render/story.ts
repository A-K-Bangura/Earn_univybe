import type { CertificateData } from "../../../types/certificate";
import { CertificateTextOverflowError, assertTitleLength, fitTiered, type FittedText, type Measure } from "../layout";
import type { CertificateAssets, CertificateFonts } from "./assets";
import {
  BRAND,
  drawConfetti,
  drawContain,
  drawMascotFallback,
  roundRectPath,
  type Rect,
} from "./shapes";

/** Canonical story card: 9:16 at 1080 × 1920. */
export const STORY_SIZE = { width: 1080, height: 1920 } as const;

// Social apps overlay their own UI at the top/bottom, so important content
// stays inside ~180px top/bottom and 80px sides. A design allowance, not a guarantee.
const SIDE = 80;
const TOP = 180;
const CONTENT_W = STORY_SIZE.width - SIDE * 2;
const CARD_PAD = 52;
const INNER_W = CONTENT_W - CARD_PAD * 2;
// The mascot ends above the slogan, which sits inside the bottom safe margin.
const MASCOT_BOTTOM = 1640;
const SLOGAN_Y = 1688;
const MASCOT_MIN = 240;
const WORDMARK = { w: 380, h: 122 };
const HEADLINE_LINES = ["I completed", "a course!"] as const;
const SLOGAN = "A new vibe for learning";

export type StoryRole = "display" | "title" | "body";

export interface StoryPlan {
  scale: number;
  headline: FittedText & { y: number };
  card: Rect;
  title: FittedText & { y: number };
  divider: { y: number };
  name: FittedText & { y: number };
  date: { y: number; size: number; text: string } | null;
  /** Free area under the card for the mascot; null when too little room remains (decoration yields first). */
  mascot: Rect | null;
}

export const planStory = (
  data: Pick<CertificateData, "displayName" | "courseTitle" | "completionDateLabel">,
  measure: (role: StoryRole, text: string, sizePx: number) => number
): StoryPlan => {
  assertTitleLength(data.courseTitle);
  const displayMeasure: Measure = (t, s) => measure("display", t, s);
  const titleMeasure: Measure = (t, s) => measure("title", t, s);
  const nameMeasure: Measure = (t, s) => measure("title", t, s);

  // Fixed, balanced break ("I completed" / "a course!"), sized to the widest line.
  let headlineSize = 124;
  while (
    headlineSize > 80 &&
    Math.max(...HEADLINE_LINES.map((line) => displayMeasure(line, headlineSize))) > CONTENT_W
  ) {
    headlineSize -= 2;
  }
  const headlineLineHeight = Math.round(headlineSize * 1.05);
  const headline: FittedText = {
    lines: [...HEADLINE_LINES],
    size: headlineSize,
    lineHeightPx: headlineLineHeight,
    height: headlineLineHeight * HEADLINE_LINES.length,
    fits: true,
  };
  const headlineTop = TOP + WORDMARK.h + 46;
  const cardTop = headlineTop + headline.height + 46;

  for (let scale = 1; scale >= 0.6; scale = Math.round((scale - 0.05) * 100) / 100) {
    const title = fitTiered(data.courseTitle, INNER_W, 1.16, titleMeasure, [
      { maxLines: 3, maxSize: 90 * scale, minSize: 60 * scale, maxHeight: 330 * scale },
      { maxLines: 6, maxSize: 64 * scale, minSize: 44, maxHeight: 460 * scale },
      { maxLines: 10, maxSize: 44, minSize: 38, maxHeight: 640 },
    ]);
    const name = fitTiered(data.displayName, INNER_W, 1.14, nameMeasure, [
      { maxLines: 1, maxSize: 76 * scale, minSize: 52 * scale, maxHeight: 120 * scale },
      { maxLines: 2, maxSize: 62 * scale, minSize: 44, maxHeight: 220 * scale },
      { maxLines: 4, maxSize: 44, minSize: 38, maxHeight: 340 },
    ]);
    if (!title.fits || !name.fits) continue;

    const dateSize = Math.max(32, Math.round(38 * scale));
    const dateH = data.completionDateLabel ? Math.round(dateSize * 1.25) : 0;
    const gap = Math.round(34 * scale);
    const dividerH = 8;
    const cardH =
      CARD_PAD + title.height + gap + dividerH + gap + name.height + (dateH ? Math.round(22 * scale) + dateH : 0) + CARD_PAD;

    const free = MASCOT_BOTTOM - (cardTop + cardH);
    if (free < 0) continue;
    // Prefer a comfortable mascot; accept a hidden one only at the smallest scale.
    if (free < MASCOT_MIN && scale > 0.65) continue;

    let y = cardTop + CARD_PAD;
    const titleY = y;
    y += title.height + gap;
    const dividerY = y;
    y += dividerH + gap;
    const nameY = y;
    y += name.height;
    const dateY = dateH ? y + Math.round(22 * scale) : 0;

    // With no mascot, centre the card in the free space instead of leaving a hole.
    const mascotFits = free >= MASCOT_MIN;
    const shift = mascotFits ? 0 : Math.round(free / 2);

    return {
      scale,
      headline: { ...headline, y: headlineTop },
      card: { x: SIDE, y: cardTop + shift, w: CONTENT_W, h: cardH },
      title: { ...title, y: titleY + shift },
      divider: { y: dividerY + shift },
      name: { ...name, y: nameY + shift },
      date:
        data.completionDateLabel && dateH
          ? { y: dateY + shift + dateH / 2, size: dateSize, text: data.completionDateLabel }
          : null,
      mascot: mascotFits ? { x: SIDE, y: cardTop + cardH + 24, w: CONTENT_W, h: free - 24 } : null,
    };
  }
  throw new CertificateTextOverflowError("name or course title");
};

export const canvasStoryMeasure =
  (ctx: CanvasRenderingContext2D, fonts: CertificateFonts) =>
  (role: StoryRole, text: string, sizePx: number): number => {
    ctx.font = role === "display" ? `400 ${sizePx}px ${fonts.display}` : `700 ${sizePx}px ${fonts.body}`;
    return ctx.measureText(text).width;
  };

export const drawStory = (
  ctx: CanvasRenderingContext2D,
  plan: StoryPlan,
  assets: CertificateAssets,
  fonts: CertificateFonts
) => {
  const { width: W, height: H } = STORY_SIZE;

  // Opaque brand gradient.
  const gradient = ctx.createLinearGradient(0, 0, W * 0.35, H);
  gradient.addColorStop(0, "#2F73F5");
  gradient.addColorStop(0.55, "#6A4AEE");
  gradient.addColorStop(1, "#8338EC");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Soft abstract shapes.
  const disc = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  disc(W - 40, 180, 330, "rgba(255,255,255,0.08)");
  disc(60, H - 360, 380, "rgba(255,255,255,0.07)");
  disc(W - 120, H - 140, 200, "rgba(255,190,11,0.22)");
  disc(80, 520, 150, "rgba(0,245,212,0.14)");

  const wordmarkBox: Rect = { x: (W - WORDMARK.w) / 2, y: TOP, w: WORDMARK.w, h: WORDMARK.h };
  const headlineBox: Rect = {
    x: SIDE,
    y: plan.headline.y,
    w: W - SIDE * 2,
    h: plan.headline.height,
  };

  drawConfetti(ctx, { x: 0, y: 0, w: W, h: H }, {
    seed: 20261009,
    count: 70,
    avoid: [
      { x: wordmarkBox.x - 30, y: wordmarkBox.y - 30, w: wordmarkBox.w + 60, h: wordmarkBox.h + 60 },
      { x: headlineBox.x - 10, y: headlineBox.y - 10, w: headlineBox.w + 20, h: headlineBox.h + 20 },
      { x: plan.card.x - 20, y: plan.card.y - 20, w: plan.card.w + 40, h: plan.card.h + 40 },
      { x: 280, y: SLOGAN_Y - 70, w: 520, h: 140 },
    ],
    colors: [BRAND.amber, BRAND.rose, BRAND.aqua, "#FFFFFF"],
    minSize: 22,
    maxSize: 46,
  });

  // Wordmark
  if (assets.wordmarkWhite) {
    drawContain(ctx, assets.wordmarkWhite, wordmarkBox);
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 96px ${fonts.display}`;
    ctx.fillText("UniVybe", W / 2, wordmarkBox.y + wordmarkBox.h / 2);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Headline
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `400 ${plan.headline.size}px ${fonts.display}`;
  plan.headline.lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, plan.headline.y + plan.headline.lineHeightPx * (i + 0.5));
  });

  // Card
  ctx.save();
  ctx.shadowColor = "rgba(11,16,38,0.30)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = "#FFFFFF";
  roundRectPath(ctx, plan.card.x, plan.card.y, plan.card.w, plan.card.h, 48);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = BRAND.navy;
  ctx.font = `700 ${plan.title.size}px ${fonts.body}`;
  plan.title.lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, plan.title.y + plan.title.lineHeightPx * (i + 0.5));
  });

  const ruleW = 240;
  const segment = ruleW / 3;
  [BRAND.azure, BRAND.violet, BRAND.rose].forEach((color, i) => {
    ctx.fillStyle = color;
    roundRectPath(ctx, W / 2 - ruleW / 2 + segment * i + (i ? 4 : 0), plan.divider.y, segment - 4, 8, 4);
    ctx.fill();
  });

  ctx.fillStyle = BRAND.violetDeep;
  ctx.font = `700 ${plan.name.size}px ${fonts.body}`;
  plan.name.lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, plan.name.y + plan.name.lineHeightPx * (i + 0.5));
  });

  if (plan.date) {
    ctx.fillStyle = BRAND.ink;
    ctx.font = `600 ${plan.date.size}px ${fonts.body}`;
    ctx.fillText(plan.date.text, W / 2, plan.date.y);
  }

  // Mascot (yields first when text needs the room), else a small brand-shape accent.
  if (plan.mascot) {
    if (assets.trophy) {
      drawContain(ctx, assets.trophy, plan.mascot);
    } else {
      drawMascotFallback(ctx, plan.mascot);
    }
  }

  // Slogan
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `400 58px ${fonts.display}`;
  ctx.fillText(SLOGAN, W / 2, SLOGAN_Y);
};
