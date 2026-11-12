import { mulberry32 } from "../../brandColors";

export const BRAND = {
  azure: "#3A86FF",
  amber: "#FFBE0B",
  rose: "#FF006E",
  aqua: "#00F5D4",
  violet: "#8338EC",
  violetDeep: "#6414D5",
  navy: "#0B1026",
  ink: "#3B4468",
  paper: "#FFFDF8",
} as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

/** Draws `image` inside the box, preserving its aspect ratio; returns the rect actually used. */
export const drawContain = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  box: Rect,
  anchor: "center" | "bottom" = "center"
): Rect => {
  const scale = Math.min(box.w / image.width, box.h / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  const x = box.x + (box.w - w) / 2;
  const y = anchor === "bottom" ? box.y + box.h - h : box.y + (box.h - h) / 2;
  ctx.drawImage(image, x, y, w, h);
  return { x, y, w, h };
};

/** Uppercase label with manual tracking (ctx.letterSpacing isn't available everywhere). */
export const drawTrackedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  tracking: number
) => {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  let x = centerX - total / 2;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = align;
};

export const measureTracked = (ctx: CanvasRenderingContext2D, text: string, tracking: number): number => {
  const chars = Array.from(text);
  return chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + tracking * (chars.length - 1);
};

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Deterministic confetti (same seed → same layout, so a regenerated export
 * looks identical). Pieces overlapping any `avoid` rect are skipped.
 */
export const drawConfetti = (
  ctx: CanvasRenderingContext2D,
  area: Rect,
  options: { seed: number; count: number; avoid: Rect[]; colors: readonly string[]; minSize: number; maxSize: number; alpha?: number }
) => {
  const rand = mulberry32(options.seed);
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  for (let i = 0; i < options.count; i++) {
    const size = options.minSize + rand() * (options.maxSize - options.minSize);
    const x = area.x + rand() * area.w;
    const y = area.y + rand() * area.h;
    const rotation = rand() * Math.PI;
    const shape = Math.floor(rand() * 3);
    const color = options.colors[Math.floor(rand() * options.colors.length)];
    const box: Rect = { x: x - size, y: y - size, w: size * 2, h: size * 2 };
    if (options.avoid.some((r) => intersects(box, r))) continue;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    if (shape === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 1) {
      roundRectPath(ctx, -size / 2, -size / 4, size, size / 2, size / 8);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 2, size / 2);
      ctx.lineTo(-size / 2, size / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
};

/**
 * Brand-shape stand-in used when a mascot image can't be loaded: an amber disc
 * with a navy graduation-cap silhouette and a few confetti dots. Not a new
 * mascot — just enough shape to keep the layout balanced.
 */
export const drawMascotFallback = (ctx: CanvasRenderingContext2D, box: Rect) => {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const r = Math.min(box.w, box.h) * 0.42;
  ctx.save();
  ctx.fillStyle = BRAND.amber;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRAND.navy;
  // Cap board
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.55);
  ctx.lineTo(cx + r * 0.8, cy - r * 0.15);
  ctx.lineTo(cx, cy + r * 0.25);
  ctx.lineTo(cx - r * 0.8, cy - r * 0.15);
  ctx.closePath();
  ctx.fill();
  // Cap base
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + 0.02 * r);
  ctx.lineTo(cx - r * 0.45, cy + r * 0.4);
  ctx.quadraticCurveTo(cx, cy + r * 0.65, cx + r * 0.45, cy + r * 0.4);
  ctx.lineTo(cx + r * 0.45, cy + 0.02 * r);
  ctx.lineTo(cx, cy + r * 0.25);
  ctx.closePath();
  ctx.fill();
  const dots: Array<[number, number, number, string]> = [
    [-1.05, -0.7, 0.12, BRAND.rose],
    [1.0, -0.85, 0.1, BRAND.aqua],
    [1.1, 0.5, 0.13, BRAND.violet],
    [-1.0, 0.65, 0.09, BRAND.azure],
  ];
  for (const [dx, dy, dr, color] of dots) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, dr * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};
