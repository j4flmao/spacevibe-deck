/**
 * The fly-through renders through the installed Google Chrome, not the
 * Playwright headless shell the film uses: the scene is WebGL2 with 16
 * subframes per frame, and Chrome's headless mode reaches the GPU through
 * ANGLE's Metal backend where the shell falls back to software.
 */

import { chromium } from "playwright-core";

export function launchChrome() {
  return chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--force-color-profile=srgb",
      "--font-render-hinting=none",
      "--use-angle=metal",
      "--ignore-gpu-blocklist",
    ],
  });
}
