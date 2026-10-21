/**
 * Boot: load the capture, build the scene, expose a seekable clock.
 *
 * `?render=1` parks the preview loop so the renderer drives every frame
 * through `window.__flythrough.seek(t)`; `?t=9.3` freezes on one beat.
 */

import { DURATION, FRAME } from "./camera.js";
import { createScene } from "./scene.js";
import { buildTitleAssets } from "./title-card.js";

const CAPTURE = "/flythrough/out/capture/";

async function bitmap(file) {
  const response = await fetch(`${CAPTURE}${file}`);
  if (!response.ok) {
    throw new Error(`Missing ${file}: run "npm run flythrough -- capture" first.`);
  }
  // ImageBitmaps ignore UNPACK_PREMULTIPLY_ALPHA_WEBGL; premultiply here.
  return createImageBitmap(await response.blob(), {
    premultiplyAlpha: "premultiply",
    colorSpaceConversion: "none",
  });
}

async function boot() {
  const response = await fetch(`${CAPTURE}layers.json`);
  if (!response.ok) {
    throw new Error('No capture found: run "npm run flythrough -- capture" first.');
  }
  const manifest = await response.json();
  const [tiles, layers, extras] = await Promise.all([
    Promise.all(manifest.page.tiles.map(async (tile) => ({ ...tile, image: await bitmap(tile.file) }))),
    Promise.all(manifest.layers.map(async (layer) => ({ ...layer, image: await bitmap(layer.file) }))),
    buildTitleAssets(),
  ]);

  const canvas = document.querySelector("#stage");
  canvas.width = FRAME.width;
  canvas.height = FRAME.height;

  const scene = createScene(canvas, { page: manifest.page, tiles, layers, ...extras });
  const params = new URLSearchParams(location.search);
  const frozen = params.has("t") ? Number.parseFloat(params.get("t")) : null;

  window.__flythrough = {
    duration: DURATION,
    seek: (t, options) => scene.render(t, options),
  };

  if (frozen !== null) {
    scene.render(frozen);
  } else if (!params.has("render")) {
    const start = performance.now();
    const loop = (now) => {
      scene.render(((now - start) / 1000) % DURATION, { subframes: 2 });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  document.documentElement.dataset.flyReady = "true";
}

boot().catch((error) => {
  document.documentElement.dataset.flyError = error.message;
  throw error;
});
