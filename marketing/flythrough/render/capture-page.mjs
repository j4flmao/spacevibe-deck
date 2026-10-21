/**
 * Capture the landing for the fly-through: the page as tiles with every
 * floating element hidden, each floating element alone on a transparent
 * background, and `layers.json` tying them together.
 *
 * The layout is locked before anything is captured — reduced motion parks the
 * staggered reveals and the hero beat, the GitHub releases request is answered
 * from a fixture so the download count and the release notice cannot change
 * between runs — and the section heights are measured twice. A capture whose
 * layout moved would shift every beat of the camera path that reads it.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { launchChrome } from "./chrome.mjs";

/** Captured at 2×: the dive ends close enough to the hero to need it. */
export const CAPTURE_SCALE = 2;
const VIEWPORT = { width: 1440, height: 1152 };
/** 2048 CSS px = 4096 device px, well inside WebGL2's MAX_TEXTURE_SIZE. */
const TILE_CSS_HEIGHT = 2048;

/**
 * Release fixture. 876 is the live installer count read on 2026-10-21; the
 * film shows one number forever rather than whatever GitHub says on render day.
 */
const RELEASE_TAG = "v2.12.1";
const RELEASES_FIXTURE = [
  {
    tag_name: RELEASE_TAG,
    name: `Deck ${RELEASE_TAG.slice(1)}`,
    prerelease: false,
    draft: false,
    published_at: "2026-10-20T00:00:00Z",
    body: "",
    assets: [
      {
        name: "Deck-2.12.1-arm64.dmg",
        browser_download_url: `https://github.com/mxrsv/spacevibe-deck/releases/download/${RELEASE_TAG}/Deck-2.12.1-arm64.dmg`,
        download_count: 876,
      },
    ],
  },
];

/**
 * What lifts off the page. `lift` is the rest height in CSS px above the page;
 * `nth` picks one match when a selector matches several.
 */
const LAYERS = [
  { id: "topbar-download", selector: ".a-topbar__download", kind: "chip", lift: 20 },
  { id: "hero-cta-mac", selector: ".hero-cta--mac", kind: "chip", lift: 28 },
  { id: "hero-cta-win", selector: ".hero-cta--win", kind: "chip", lift: 24 },
  { id: "hero-install-line", selector: ".hero-install__line", kind: "chip", lift: 20 },
  { id: "hero-window", selector: ".hero-window", kind: "window", lift: 36 },
  { id: "watch-rail", selector: ".w-rail", kind: "card", lift: 32 },
  { id: "watch-usage", selector: ".w-usage", kind: "card", lift: 28 },
  { id: "launch-quick", selector: ".w-ql", kind: "card", lift: 30 },
  { id: "launch-catalog", selector: ".w-cat", kind: "card", lift: 34 },
  {
    id: "keep-caption-restore",
    selector: '.chapter[data-tone="plate"] .wtile h3',
    nth: 0,
    kind: "chip",
    lift: 22,
  },
  {
    id: "keep-caption-surfaces",
    selector: '.chapter[data-tone="plate"] .wtile h3',
    nth: 1,
    kind: "chip",
    lift: 22,
  },
  { id: "keep-restore", selector: ".w-restore", kind: "card", lift: 30 },
  { id: "keep-surfaces", selector: ".w-surfaces", kind: "card", lift: 34 },
  { id: "finale-mac", selector: ".finale__btn", nth: 0, kind: "chip", lift: 26 },
  { id: "finale-win", selector: ".finale__btn", nth: 1, kind: "chip", lift: 22 },
];

/** Top-level blocks whose heights must not move between two measurements. */
const SECTION_SELECTOR = "#specimen-root > section, .tour > section, .tour > footer";

const ISOLATE_CSS = `
  html.fly-base [data-fly-layer] { visibility: hidden !important; }
  html.fly-isolate, html.fly-isolate body { background: transparent !important; }
  html.fly-isolate * { visibility: hidden !important; }
  html.fly-isolate [data-fly-active],
  html.fly-isolate [data-fly-active] * { visibility: visible !important; }
  html.fly-isolate [data-fly-active] { box-shadow: none !important; }
`;

async function measureSections(page) {
  return page.evaluate((selector) => {
    return {
      total: document.documentElement.scrollHeight,
      sections: [...document.querySelectorAll(selector)].map((el) =>
        Math.round(el.getBoundingClientRect().height * 100) / 100,
      ),
    };
  }, SECTION_SELECTOR);
}

function assertSameLayout(a, b, when) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(
      `Layout moved ${when}:\n  ${JSON.stringify(a)}\n  ${JSON.stringify(b)}`,
    );
  }
}

/**
 * @param {object} options
 * @param {string} options.url landing URL
 * @param {string} options.outDir where tiles, layers and layers.json go
 * @param {(message: string) => void} options.log
 */
export async function capturePage({ url, outDir, log }) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await launchChrome();

  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: CAPTURE_SCALE,
      reducedMotion: "reduce",
      colorScheme: "dark",
    });
    const errors = [];

    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://api.github.com/**", (route) =>
      route.fulfill({ json: RELEASES_FIXTURE }),
    );
    await page.addInitScript((tag) => {
      // The notice stays quiet for a tag the visitor already dismissed.
      localStorage.setItem("deck.landing.releaseSeen", tag);
    }, RELEASE_TAG);

    await page.goto(url, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: ISOLATE_CSS });
    await page.evaluate(async () => {
      // Lazy images below the fold never load in a 1152px viewport.
      const images = [...document.images];
      for (const image of images) {
        image.loading = "eager";
      }
      await Promise.all(images.map((image) => image.decode().catch(() => {})));
      await document.fonts.ready;
    });
    await page.waitForFunction(
      () => document.querySelector("[data-download-count]")?.textContent?.trim() === "876",
    );

    if (errors.length > 0) {
      throw new Error(`Landing reported errors:\n  ${errors.join("\n  ")}`);
    }

    const before = await measureSections(page);
    await page.waitForTimeout(500);
    assertSameLayout(before, await measureSections(page), "while settling");
    log(`  layout locked: ${before.total}px, sections ${before.sections.join(" / ")}`);

    const layers = await page.evaluate((specs) => {
      return specs.map((spec) => {
        const el = document.querySelectorAll(spec.selector)[spec.nth ?? 0];

        if (!el) {
          throw new Error(`No element for layer ${spec.id} (${spec.selector}).`);
        }

        el.dataset.flyLayer = spec.id;
        const rect = el.getBoundingClientRect();
        const radius = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;

        return {
          id: spec.id,
          kind: spec.kind,
          lift: spec.lift,
          rect: {
            x: rect.left + scrollX,
            y: rect.top + scrollY,
            width: rect.width,
            height: rect.height,
          },
          radius: Math.min(radius, rect.height / 2),
        };
      });
    }, LAYERS);

    await page.evaluate(() => document.documentElement.classList.add("fly-base"));

    const tiles = [];
    for (let y = 0; y < before.total; y += TILE_CSS_HEIGHT) {
      const height = Math.min(TILE_CSS_HEIGHT, before.total - y);
      const file = `page-${tiles.length}.png`;

      await page.screenshot({
        path: join(outDir, file),
        clip: { x: 0, y, width: VIEWPORT.width, height },
        fullPage: true,
        animations: "disabled",
      });
      tiles.push({ file, y, height });
    }
    log(`  page: ${tiles.length} tiles`);

    await page.evaluate(() => {
      document.documentElement.classList.remove("fly-base");
      document.documentElement.classList.add("fly-isolate");
    });

    for (const layer of layers) {
      layer.file = `layer-${layer.id}.png`;
      await page.evaluate((id) => {
        document.querySelector(`[data-fly-layer="${id}"]`).dataset.flyActive = "";
      }, layer.id);
      await page.screenshot({
        path: join(outDir, layer.file),
        clip: layer.rect,
        fullPage: true,
        omitBackground: true,
        animations: "disabled",
      });
      await page.evaluate((id) => {
        delete document.querySelector(`[data-fly-layer="${id}"]`).dataset.flyActive;
      }, layer.id);
    }
    log(`  layers: ${layers.length}`);

    // The capture itself must not have moved the layout either.
    await page.evaluate(() => document.documentElement.classList.remove("fly-isolate"));
    assertSameLayout(before, await measureSections(page), "during capture");

    const manifest = {
      scale: CAPTURE_SCALE,
      page: { width: VIEWPORT.width, height: before.total, tiles },
      sections: before.sections,
      layers,
    };

    await writeFile(join(outDir, "layers.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    return manifest;
  } finally {
    await browser.close();
  }
}
