/**
 * Raster pieces that are not on the landing: the title card's badge, headline
 * and italic tail, and the four agent tiles. Drawn with canvas 2D in the
 * landing's own type — the system sans (`--font-display`) and Iowan Old Style,
 * which the release notice already sets — so the film adds no font files.
 */

import { BRAND } from "../../stage/brand.js";
import { AGENT_MARKS } from "../../landing-prototype/src/agent-strip.js";
import { messages } from "../../landing-prototype/src/copy.js";

/** Owner's line, 2026-10-21. */
export const ITALIC_TAIL = "even the one that needs you.";

/** Texture pixels per world px: the title is the closest the camera gets. */
const RASTER = 3;
const INK = "#111312";
const TAIL_INK = "#6b6f75";
const TILE_FILL = "#151716";
const SANS = 'system-ui, -apple-system, "SF Pro Text", sans-serif';
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const TITLE_SIZE = 112;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function canvasFor(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * RASTER);
  canvas.height = Math.ceil(height * RASTER);
  const ctx = canvas.getContext("2d");
  ctx.scale(RASTER, RASTER);
  return { canvas, ctx };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function textLine(text, font, color, tracking) {
  const probe = canvasFor(1, 1).ctx;
  probe.font = font;
  probe.letterSpacing = tracking;
  const metrics = probe.measureText(text);
  const pad = TITLE_SIZE * 0.12;
  const width = metrics.width + pad * 2;
  const height = TITLE_SIZE * 1.32;
  const { canvas, ctx } = canvasFor(width, height);
  ctx.font = font;
  ctx.letterSpacing = tracking;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, height / 2);
  return { image: canvas, width, height };
}

async function badge() {
  const height = 76;
  const mark = 46;
  const font = `600 34px ${SANS}`;
  const probe = canvasFor(1, 1).ctx;
  probe.font = font;
  const textWidth = probe.measureText(BRAND.name).width;
  const width = 16 + mark + 14 + textWidth + 28;
  const { canvas, ctx } = canvasFor(width, height);
  roundRect(ctx, 0, 0, width, height, height / 2);
  ctx.fillStyle = TILE_FILL;
  ctx.fill();
  ctx.drawImage(await loadImage(BRAND.iconSrc), 16, (height - mark) / 2, mark, mark);
  ctx.font = font;
  ctx.fillStyle = "#f4f5f4";
  ctx.textBaseline = "middle";
  ctx.fillText(BRAND.name, 16 + mark + 14, height / 2 + 1);
  return { image: canvas, width, height, radius: height / 2, shadow: true };
}

async function logoTile(src) {
  const size = 104;
  const { canvas, ctx } = canvasFor(size, size);
  roundRect(ctx, 0, 0, size, size, size * 0.24);
  ctx.fillStyle = TILE_FILL;
  ctx.fill();
  ctx.strokeStyle = "rgb(255 255 255 / 9%)";
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, size - 1, size - 1, size * 0.24);
  ctx.stroke();
  const logo = size * 0.46;
  ctx.drawImage(await loadImage(src), (size - logo) / 2, (size - logo) / 2, logo, logo);
  return canvas;
}

export async function buildTitleAssets() {
  await Promise.all([
    document.fonts.load(`500 ${TITLE_SIZE}px ${SANS}`),
    document.fonts.load(`italic 400 ${TITLE_SIZE}px ${SERIF}`),
  ]);

  const marks = AGENT_MARKS.filter((agent) => agent.mark).slice(0, 4);

  return {
    title: {
      badge: await badge(),
      headline: textLine(messages.en.headline, `500 ${TITLE_SIZE}px ${SANS}`, INK, "-0.035em"),
      tail: textLine(ITALIC_TAIL, `italic 400 ${TITLE_SIZE}px ${SERIF}`, TAIL_INK, "-0.01em"),
    },
    logoTiles: await Promise.all(marks.map((agent) => logoTile(agent.mark))),
  };
}
