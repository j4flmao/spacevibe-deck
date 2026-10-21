#!/usr/bin/env node
/**
 * Render the landing fly-through.
 *
 *   node marketing/flythrough/render/render.mjs capture        # lock + capture the landing
 *   node marketing/flythrough/render/render.mjs stills         # review stills + contact sheet
 *   node marketing/flythrough/render/render.mjs check          # camera curve + 30fps optical-flow preview
 *   node marketing/flythrough/render/render.mjs final [--music track.mp3 --hit 4.2]
 *                                                              # the 60fps H.264 MP4 + 10-bit HEVC master; --hit is where the
 *                                                              # track's hit sits, landed on 9.97s
 *
 * Boots a Vite server on the marketing root so the scene can import the
 * landing's own agent marks and brand, then drives `window.__flythrough.seek`.
 */

import { execFile, spawn } from "node:child_process";
import { readFile, mkdir, rm, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

import { DURATION, FPS, FRAME, T } from "../src/camera.js";
import { capturePage } from "./capture-page.mjs";
import { SUBFRAMES } from "../src/scene.js";
import { checkCamera, checkFlow } from "./check-motion.mjs";
import { launchChrome } from "./chrome.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const flyDir = resolve(here, "..");
const marketingDir = resolve(flyDir, "..");
const outDir = join(flyDir, "out");
const captureDir = join(outDir, "capture");
const framesDir = join(flyDir, ".frames");
const PREVIEW_FPS = 30;
/** VideoToolbox has no CRF; a fixed high bitrate keeps the 12px terminal type clean. */
const VIDEO_BITRATE = "28M";
/**
 * The frames are sRGB PNGs: convert with the BT.709 matrix and say so, or
 * players guess and saturated marks shift hue.
 */
const COLOR = {
  // `setparams` tags the frames; encoders take primaries and transfer from
  // the frames, not from the -color_* output flags.
  filter:
    "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int," +
    "setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv",
  tags: ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"],
};
/** Whoosh envelope (s), level and fade curve: a swell onto the beat, then a decay to silence (≈ −20 LUFS). */
const WHOOSH = { rise: 0.5, fall: 0.8, gainDb: 5, curve: "cub" };
const PORT = 5197;

function log(message) {
  process.stdout.write(`${message}\n`);
}

/** The review beats from the brief. */
const STILL_TIMES = [0, 1.6, 2.5, 5, 6.5, 9.3, 11];

function ffmpeg(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`ffmpeg exited with ${code}`)),
    );
  });
}

/** Open the scene with the clock parked and hand back a seek-and-shoot page. */
async function openScene(origin, browser) {
  const page = await browser.newPage({ viewport: FRAME, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  await page.goto(`${origin}/flythrough/?render=1`, { waitUntil: "load" });
  await page.waitForFunction(
    () => document.documentElement.dataset.flyReady || document.documentElement.dataset.flyError,
    undefined,
    { timeout: 60_000 },
  );
  const failure = await page.evaluate(() => document.documentElement.dataset.flyError);
  if (failure || errors.length > 0) {
    throw new Error(`Scene failed: ${failure ?? errors.join("\n  ")}`);
  }
  const canvas = page.locator("#stage");
  return {
    async shoot(t, path, options) {
      await page.evaluate(([time, opts]) => window.__flythrough.seek(time, opts), [t, options]);
      await canvas.screenshot({ path });
    },
  };
}

async function renderFrames(origin, { fps, subframes, dir }) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const count = Math.round(DURATION * fps);
  const browser = await launchChrome();
  try {
    const scene = await openScene(origin, browser);
    let lastPercent = -1;
    for (let i = 0; i < count; i += 1) {
      await scene.shoot(i / fps, join(dir, `frame-${String(i).padStart(5, "0")}.png`), { subframes });
      const percent = Math.floor(((i + 1) / count) * 100);
      if (percent % 10 === 0 && percent !== lastPercent) {
        lastPercent = percent;
        process.stdout.write(`  frames ${percent}%\r`);
      }
    }
  } finally {
    await browser.close();
  }
  log(`  rendered ${count} frames at ${fps}fps, ${subframes} subframe(s) each`);
  return count;
}

async function readManifest() {
  return JSON.parse(await readFile(join(captureDir, "layers.json"), "utf8"));
}

/**
 * Two whooshes peaking on their beats, and the owner's track (if any) shifted
 * so its hit lands on T.hit. Returns ffmpeg input args and the filter graph.
 */
function audioGraph(music, hit) {
  const inputs = ["-f", "lavfi", "-t", String(DURATION), "-i", "anullsrc=r=48000:cl=stereo"];
  const filters = [];
  const mix = ["[a0]"];
  filters.push("[1:a]anull[a0]");
  T.whooshes.forEach((peak, i) => {
    const { rise, fall, gainDb, curve } = WHOOSH;
    const index = i + 2;
    // The source outlasts the envelope, so the fade, not the clip, ends it.
    inputs.push("-f", "lavfi", "-t", String(rise + fall + 0.1), "-i", `anoisesrc=color=pink:r=48000:seed=${11 + i}`);
    const delay = Math.round((peak - rise) * 1000);
    filters.push(
      `[${index}:a]highpass=f=260,lowpass=f=2400,aformat=channel_layouts=stereo,` +
        `afade=t=in:st=0:d=${rise}:curve=${curve},afade=t=out:st=${rise}:d=${fall}:curve=${curve},` +
        `volume=${gainDb}dB,adelay=${delay}|${delay}[w${i}]`,
    );
    mix.push(`[w${i}]`);
  });
  if (music) {
    const index = T.whooshes.length + 2;
    inputs.push("-i", music);
    const offset = T.hit - hit;
    const shift =
      offset >= 0
        ? `adelay=${Math.round(offset * 1000)}|${Math.round(offset * 1000)}`
        : `atrim=start=${-offset},asetpts=PTS-STARTPTS`;
    filters.push(
      `[${index}:a]aformat=sample_rates=48000:channel_layouts=stereo,${shift},` +
        `atrim=end=${DURATION},afade=t=out:st=${DURATION - 0.8}:d=0.8[m]`,
    );
    mix.push("[m]");
  }
  filters.push(`${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0,alimiter=limit=0.89[aout]`);
  return { inputs, filter: filters.join(";") };
}

function parseFinalArgs(rest) {
  const args = { music: null, hit: null };
  for (let i = 0; i < rest.length; i += 2) {
    if (rest[i] === "--music") args.music = rest[i + 1];
    else if (rest[i] === "--hit") args.hit = Number.parseFloat(rest[i + 1]);
    else throw new Error(`Unknown flag "${rest[i]}".`);
  }
  if (args.music && !Number.isFinite(args.hit)) {
    throw new Error("--music needs --hit <seconds into the track where the hit is>.");
  }
  return args;
}

const COMMANDS = {
  async check(origin) {
    const manifest = await readManifest();
    log("▶ camera curve");
    const camera = checkCamera({
      page: manifest.page,
      hero: manifest.layers.find((layer) => layer.kind === "window"),
    });
    camera.lines.forEach((line) => log(line));

    log(`▶ ${PREVIEW_FPS}fps preview, no motion blur`);
    const dir = join(framesDir, "preview");
    await renderFrames(origin, { fps: PREVIEW_FPS, subframes: 1, dir });
    const preview = join(outDir, "preview-30fps.mp4");
    await ffmpeg([
      "-y", "-framerate", String(PREVIEW_FPS), "-i", join(dir, "frame-%05d.png"),
      "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", preview,
    ]);
    await rm(dir, { recursive: true, force: true });

    log("▶ optical flow");
    const flow = await checkFlow(preview, PREVIEW_FPS, join(outDir, "flow.svg"));
    flow.lines.forEach((line) => log(line));
    log(`✓ ${preview}\n✓ ${join(outDir, "flow.svg")}`);
    if (!camera.ok || !flow.ok) {
      process.exitCode = 1;
    }
  },

  async final(origin, rest) {
    const args = parseFinalArgs(rest);
    log(`▶ final ${FRAME.width}×${FRAME.height} @ ${FPS}fps`);
    const dir = join(framesDir, "final");
    await renderFrames(origin, { fps: FPS, subframes: SUBFRAMES, dir });
    const audio = audioGraph(args.music, args.hit);
    const outPath = join(outDir, "deck-flythrough.mp4");
    const hevcPath = join(outDir, "deck-flythrough-hevc10.mp4");
    const encode = (path, pixelFormat, codec) =>
      ffmpeg([
        "-y", "-framerate", String(FPS), "-i", join(dir, "frame-%05d.png"),
        ...audio.inputs,
        "-filter_complex", `[0:v]${COLOR.filter},format=${pixelFormat}[vout];${audio.filter}`,
        "-map", "[vout]", "-map", "[aout]",
        ...codec, ...COLOR.tags,
        "-c:a", "aac", "-b:a", "192k", "-shortest",
        "-movflags", "+faststart", path,
      ]);
    // H.264 8-bit plays everywhere; x264's grain tune keeps the floor's
    // dither instead of smoothing it back into bands. The frames are 8-bit,
    // so the 10-bit HEVC master adds no gradient levels; it only stops the
    // encoder from re-quantizing the dither into bands.
    const encoder = "libx264 (yuv420p) + hevc_videotoolbox (main10)";
    await encode(outPath, "yuv420p", ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "grain"]);
    await encode(hevcPath, "p010le", [
      "-c:v", "hevc_videotoolbox", "-profile:v", "main10", "-b:v", VIDEO_BITRATE, "-allow_sw", "0", "-tag:v", "hvc1",
    ]);
    await rm(dir, { recursive: true, force: true });
    const probe = async (path) =>
      (
        await promisify(execFile)("ffprobe", [
          "-v", "error", "-show_entries",
          "stream=codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_frames,color_space,color_transfer,color_primaries:format=duration",
          "-of", "compact", path,
        ])
      ).stdout;
    const stdout = `${await probe(outPath)}${await probe(hevcPath)}`;
    const size = (await stat(outPath)).size / 1024 / 1024;
    log(`  encoder: ${encoder}${args.music ? `, music hit ${args.hit}s → ${T.hit}s` : ", no music"}`);
    log(stdout.trim().split("\n").map((line) => `  ${line}`).join("\n"));
    log(`✓ ${outPath} (${size.toFixed(1)} MB)\n✓ ${hevcPath} (${((await stat(hevcPath)).size / 1024 / 1024).toFixed(1)} MB)`);
  },

  /** `stills` shoots the review beats; `stills 9.6 9.7 …` (up to 8) any others. */
  async stills(origin, rest) {
    const times = rest.length > 0 ? rest.map(Number.parseFloat).slice(0, 8) : STILL_TIMES;
    const dir = join(outDir, "stills");
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const browser = await launchChrome();
    try {
      const scene = await openScene(origin, browser);
      for (const t of times) {
        await scene.shoot(t, join(dir, `still-${t.toFixed(2)}s.png`));
        log(`  ✓ ${t.toFixed(2)}s`);
      }
    } finally {
      await browser.close();
    }
    const cellCount = 8;
    const inputs = times.flatMap((t) => ["-i", join(dir, `still-${t.toFixed(2)}s.png`)]);
    const cells = Array.from({ length: cellCount }, (_, i) =>
      i < times.length
        ? `[${i}]scale=480:-1,drawtext=text='${times[i].toFixed(2)}s':x=12:y=12:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=6[c${i}]`
        : `color=c=0x202020:s=480x384:d=1[c${i}]`,
    );
    const grid = `${cells.map((_, i) => `[c${i}]`).join("")}xstack=inputs=${cellCount}:layout=0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0`;
    await ffmpeg([
      "-y",
      ...inputs,
      "-filter_complex",
      [...cells, grid].join(";"),
      "-frames:v",
      "1",
      join(dir, "contact-sheet.png"),
    ]);
    log(`✓ ${dir}`);
  },

  async capture(origin) {
    log("▶ capture");
    await capturePage({
      url: `${origin}/landing-prototype/`,
      outDir: captureDir,
      log,
    });
    log(`✓ ${captureDir}`);
  },
};

async function main() {
  const [command = "", ...rest] = process.argv.slice(2);
  const run = COMMANDS[command];

  if (!run) {
    throw new Error(`Usage: render.mjs <${Object.keys(COMMANDS).join("|")}>`);
  }

  const server = await createServer({
    root: marketingDir,
    configFile: false,
    logLevel: "warn",
    server: { port: PORT, strictPort: true, host: "127.0.0.1" },
  });

  await server.listen();

  try {
    await run(`http://127.0.0.1:${PORT}`, rest);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
