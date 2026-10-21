/**
 * Motion checks for the fly-through.
 *
 * `checkCamera` differentiates the analytic camera path: after the ease-in the
 * cruise speed must hold within ±2%, the zoom must not reverse during the
 * fly-through, the rise and the dive must each move one way, and every seam
 * must be continuous in velocity and acceleration. It also projects a grid of
 * page points to measure screen motion where the review found the film
 * stalling: the fly-through → rise blend and the apex.
 *
 * `checkFlow` measures what actually reached the pixels: block-matching optical
 * flow between consecutive frames of the 30fps preview, flagging any frame
 * whose mean flow jumps past 1.5× its neighbours.
 */

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

import { FPS, FRAME, PAGE_Y, T, cameraAt, cameraBasis } from "../src/camera.js";

const RATE = 600;
const SPEED_TOLERANCE = 0.02;
const SPIKE_RATIO = 1.5;
/** Screen motion through the blend may not dip below this share of the cruise. */
const BLEND_FLOOR = 0.85;
/** The apex drifts at least this many px per frame. */
const APEX_MIN_FLOW = 0.5;
const GRID = 120;

function sample(layout, from, to, fn) {
  const out = [];
  for (let i = 0; i <= Math.round((to - from) * RATE); i += 1) {
    const t = from + i / RATE;
    out.push({ t, ...fn(t, cameraAt(t, layout)) });
  }
  return out;
}

function monotonic(values, sign) {
  let worst = 0;
  for (let i = 1; i < values.length; i += 1) {
    worst = Math.max(worst, -sign * (values[i] - values[i - 1]));
  }
  return worst;
}

/** Mean on-screen travel (px per 60fps frame) of the page points in frame at t. */
function screenFlow(layout, t) {
  const project = (time, point) => {
    const cam = cameraAt(time, layout);
    const { eye, forward, up, right } = cameraBasis(cam);
    const d = point.map((v, k) => v - eye[k]);
    const dot = (a) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
    const f = FRAME.height / 2 / Math.tan(cam.fovY / 2) / dot(forward);
    return [FRAME.width / 2 + f * dot(right), FRAME.height / 2 - f * dot(up)];
  };
  let total = 0;
  let count = 0;
  for (let x = 0; x <= layout.page.width; x += GRID) {
    for (let z = 0; z <= layout.page.height; z += GRID) {
      const a = project(t, [x, PAGE_Y, z]);
      if (a[0] < 0 || a[0] > FRAME.width || a[1] < 0 || a[1] > FRAME.height) {
        continue;
      }
      const b = project(t + 1 / FPS, [x, PAGE_Y, z]);
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}

function flowOver(layout, from, to) {
  const out = [];
  for (let t = from; t <= to; t += 1 / FPS) {
    out.push({ t, v: screenFlow(layout, t) });
  }
  return out;
}

/** @returns {{ ok: boolean, lines: string[] }} */
export function checkCamera(layout) {
  const lines = [];
  let ok = true;
  const report = (pass, text) => {
    ok &&= pass;
    lines.push(`  ${pass ? "✓" : "✗"} ${text}`);
  };

  const eye = (cam) => cameraBasis(cam).eye;
  const fly = sample(layout, 0, T.riseStart, (t, cam) => ({ eye: eye(cam), distance: cam.distance, fov: cam.fovY }));
  const speeds = fly.slice(1).map((s, i) => {
    const p = fly[i].eye;
    return { t: s.t, v: Math.hypot(...s.eye.map((v, k) => v - p[k])) * RATE };
  });
  const cruise = speeds.filter((s) => s.t >= T.easeIn);
  const mean = cruise.reduce((sum, s) => sum + s.v, 0) / cruise.length;
  const spread = Math.max(...cruise.map((s) => Math.abs(s.v / mean - 1)));
  report(spread <= SPEED_TOLERANCE, `cruise ${T.easeIn}–${T.riseStart}s: ${mean.toFixed(1)} px/s, max deviation ${(spread * 100).toFixed(3)}%`);

  const easeIn = speeds.filter((s) => s.t < T.easeIn).map((s) => s.v);
  report(monotonic(easeIn, 1) < 1e-6, `ease-in 0–${T.easeIn}s: speed rises monotonically 0 → ${easeIn.at(-1).toFixed(1)} px/s`);

  const flyZoom = monotonic(fly.map((s) => s.distance), -1) + monotonic(fly.map((s) => s.fov), -1);
  report(flyZoom === 0, `fly-through: no zoom change (distance and FOV fixed)`);

  const rise = sample(layout, T.riseStart, T.apexEnd, (_, cam) => ({ distance: cam.distance }));
  report(monotonic(rise.map((s) => s.distance), 1) < 1e-6, `rise ${T.riseStart}–${T.apexEnd}s: distance ${rise[0].distance.toFixed(0)} → ${rise.at(-1).distance.toFixed(0)}, monotonic`);

  const dive = sample(layout, T.apexEnd, T.end, (_, cam) => ({ distance: cam.distance }));
  report(monotonic(dive.map((s) => s.distance), -1) < 1e-6, `dive + settle ${T.apexEnd}–${T.end}s: distance ${dive[0].distance.toFixed(0)} → ${dive.at(-1).distance.toFixed(0)}, monotonic`);

  // C1 at every seam: the one-sided eye velocities must agree, measured
  // against the fastest the eye moves within 50ms of the seam.
  const at = (t) => eye(cameraAt(t, layout));
  const velocity = (a, b, h) => at(b).map((x, k) => (x - at(a)[k]) / h);
  for (const seam of [T.easeIn, T.riseStart, T.apexEnd, T.diveEnd]) {
    const h = 1e-6;
    const before = velocity(seam - h, seam, h);
    const after = velocity(seam, seam + h, h);
    const jump = Math.hypot(...before.map((x, k) => x - after[k]));
    let scale = 1;
    for (let t = seam - 0.05; t <= seam + 0.05; t += 0.005) {
      scale = Math.max(scale, Math.hypot(...velocity(t, t + 1e-4, 1e-4)));
    }
    report(jump / scale < 0.02, `seam ${seam}s: velocity continuous (jump ${((100 * jump) / scale).toFixed(2)}% of local speed)`);
  }

  // C2 at every seam: one-sided accelerations must agree, against the
  // largest acceleration within 50ms of the seam.
  const accel = (a, h) => at(a + 2 * h).map((x, k) => (x - 2 * at(a + h)[k] + at(a)[k]) / (h * h));
  for (const seam of [T.riseStart, T.apexEnd, T.diveEnd]) {
    const h = 1e-3;
    const before = accel(seam - 2 * h, h);
    const after = accel(seam, h);
    const jump = Math.hypot(...before.map((x, k) => x - after[k]));
    let scale = 1;
    for (let t = seam - 0.05; t <= seam + 0.05; t += 0.005) {
      scale = Math.max(scale, Math.hypot(...accel(t - h, h)));
    }
    report(jump / scale < 0.05, `seam ${seam}s: acceleration continuous (jump ${((100 * jump) / scale).toFixed(2)}% of local peak)`);
  }

  const cruiseFlow = flowOver(layout, T.easeIn, T.riseStart);
  const cruiseMean = cruiseFlow.reduce((sum, s) => sum + s.v, 0) / cruiseFlow.length;
  const blend = flowOver(layout, T.riseStart, T.flyEnd);
  const blendMin = blend.reduce((low, s) => (s.v < low.v ? s : low));
  report(
    blendMin.v >= cruiseMean * BLEND_FLOOR,
    `blend ${T.riseStart}–${T.flyEnd}s: screen flow ≥ ${blendMin.v.toFixed(2)} px/frame at ${blendMin.t.toFixed(2)}s (cruise ${cruiseMean.toFixed(2)}, floor ${BLEND_FLOOR * 100}%)`,
  );
  const apex = flowOver(layout, T.riseEnd, T.apexEnd);
  const apexMin = Math.min(...apex.map((s) => s.v));
  report(apexMin >= APEX_MIN_FLOW, `apex ${T.riseEnd}–${T.apexEnd}s: drift ≥ ${apexMin.toFixed(2)} px/frame (floor ${APEX_MIN_FLOW})`);

  return { ok, lines };
}

const FLOW_W = 180;
const FLOW_H = 144;
const BLOCK = 12;
const SEARCH = 10;

function readGrayFrames(videoPath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-i", videoPath,
      "-vf", `scale=${FLOW_W}:${FLOW_H}`, "-pix_fmt", "gray", "-f", "rawvideo", "-",
    ]);
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with ${code}`));
        return;
      }
      const data = Buffer.concat(chunks);
      const size = FLOW_W * FLOW_H;
      const frames = [];
      for (let i = 0; i + size <= data.length; i += size) {
        frames.push(data.subarray(i, i + size));
      }
      resolvePromise(frames);
    });
  });
}

/** Mean block-matching displacement (in flow-grid px) from frame a to b. */
function meanFlow(a, b) {
  let total = 0;
  let count = 0;
  for (let by = SEARCH; by + BLOCK + SEARCH <= FLOW_H; by += BLOCK) {
    for (let bx = SEARCH; bx + BLOCK + SEARCH <= FLOW_W; bx += BLOCK) {
      let contrast = 0;
      for (let y = 0; y < BLOCK; y += 1) {
        for (let x = 1; x < BLOCK; x += 1) {
          const i = (by + y) * FLOW_W + bx + x;
          contrast += Math.abs(a[i] - a[i - 1]);
        }
      }
      // Flat floor blocks match anywhere; they carry no motion signal.
      if (contrast < BLOCK * BLOCK * 2) {
        continue;
      }
      let best = Infinity;
      let bestD = 0;
      for (let dy = -SEARCH; dy <= SEARCH; dy += 1) {
        for (let dx = -SEARCH; dx <= SEARCH; dx += 1) {
          let sad = 0;
          for (let y = 0; y < BLOCK && sad < best; y += 1) {
            for (let x = 0; x < BLOCK; x += 1) {
              sad += Math.abs(a[(by + y) * FLOW_W + bx + x] - b[(by + y + dy) * FLOW_W + bx + x + dx]);
            }
          }
          if (sad < best) {
            best = sad;
            bestD = Math.hypot(dx, dy);
          }
        }
      }
      total += bestD;
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}

/**
 * @param {string} videoPath 30fps preview
 * @param {number} fps
 * @param {string} svgPath where the flow plot goes
 */
export async function checkFlow(videoPath, fps, svgPath) {
  const frames = await readGrayFrames(videoPath);
  const flow = [];
  for (let i = 1; i < frames.length; i += 1) {
    flow.push({ t: i / fps, v: meanFlow(frames[i - 1], frames[i]) * (1440 / FLOW_W) });
  }

  const window = flow.filter((f) => f.t > T.easeIn && f.t < T.riseStart);
  const spikes = window.filter((f, i) => {
    const prev = window[i - 1]?.v;
    const next = window[i + 1]?.v;
    if (prev === undefined || next === undefined) {
      return false;
    }
    const around = (prev + next) / 2;
    return around > 0.5 && f.v > around * SPIKE_RATIO;
  });
  const mean = window.reduce((sum, f) => sum + f.v, 0) / window.length;

  const W = 900;
  const H = 260;
  const max = Math.max(...flow.map((f) => f.v), 1);
  const points = flow.map((f) => `${((f.t / T.end) * W).toFixed(1)},${(H - (f.v / max) * (H - 20)).toFixed(1)}`).join(" ");
  const marks = [T.easeIn, T.riseStart, T.apexEnd, T.diveEnd]
    .map((t) => `<line x1="${(t / T.end) * W}" x2="${(t / T.end) * W}" y1="0" y2="${H}" stroke="#bbb" stroke-dasharray="4 4"/>`)
    .join("");
  await writeFile(
    svgPath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="#fff"/>${marks}` +
      `<polyline points="${points}" fill="none" stroke="#2e4fd8" stroke-width="2"/>` +
      `<text x="8" y="16" font-family="sans-serif" font-size="12">mean optical flow per frame (px at 1440 wide), max ${max.toFixed(1)}</text></svg>\n`,
  );

  return {
    ok: spikes.length === 0,
    lines: [
      `  ${spikes.length === 0 ? "✓" : "✗"} flow ${T.easeIn}–${T.riseStart}s: mean ${mean.toFixed(2)} px/frame, ${spikes.length} spike(s) over ${SPIKE_RATIO}× neighbours` +
        (spikes.length ? ` at ${spikes.map((s) => s.t.toFixed(2)).join(", ")}s` : ""),
    ],
  };
}
