/**
 * The fly-through, as pure functions of time. Nothing here keeps state between
 * frames: the camera, every layer's lift and the title card are sampled at `t`,
 * which is what lets the renderer seek, average subframes for motion blur and
 * let `check-camera.mjs` differentiate the path numerically.
 *
 * World space: X = page x, Z = page y (the page runs toward +Z), Y = height in
 * CSS px. The floor is Y = 0 and the page surface Y = PAGE_Y. The camera looks
 * toward -Z and down, so the top of the page is the top of the frame and the
 * fly-through travels +Z, down the page.
 */

export const FPS = 60;
export const DURATION = 14.5;
export const FRAME = { width: 1440, height: 1152 };
export const PAGE_Y = 1;

/** Beat sheet, in seconds. */
export const T = Object.freeze({
  easeIn: 1.4,
  riseStart: 7.75,
  flyEnd: 8.2,
  riseEnd: 9.25,
  apexEnd: 9.47,
  diveEnd: 9.97,
  end: DURATION,
  whooshes: [8.66, 9.8],
  hit: 9.97,
});

const DEG = Math.PI / 180;
const FOV_Y = 40 * DEG;

/** Fly-through framing: distance from the look-at point and pitch below the horizon. */
const FLY = { distance: 1750, pitch: 52 * DEG, startZ: 700, endInset: 620, aperture: 26 };
/** The overhead strip: the whole page plus this much floor, top to bottom. */
const OVERHEAD_MARGIN = 1.12;
/**
 * The fly-through keeps its forward travel into the rise: the look-at point
 * only starts turning back toward the page middle at `turnStart`, once the
 * pull-up has built speed, so the two moves overlap instead of handing over.
 */
const RISE = { turnStart: 7.9 };
/** Look-at drift across the apex, in px/s toward the page top, so it never stops dead. */
const APEX_DRIFT = 420;
/** Where the hero window lands, and how high it floats, for the title card. */
export const CARD = { lift: 160, centerZ: -760, moveStart: T.apexEnd, moveEnd: 10.3, riseEnd: 10.15 };
/**
 * The title view sits this far above the card's centre (toward the page top),
 * so the badge and the lines above the card share the frame with it. The
 * settle keeps a slow push-in running to the last frame.
 */
const TITLE_VIEW = { aboveCard: 170, composeStart: 9.7, composeEnd: 10.3, distanceIn: 2420, distanceOut: 2200, aperture: 46 };
/** Rest lift of the page layers, and the height they reach as the camera passes. */
const PASS_LIFT = { min: 20, max: 40, reach: 520 };

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smoothstep = (a, b, x) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
export const smootherstep = (a, b, x) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const lerp = (a, b, u) => a + (b - a) * u;

/**
 * Quintic Hermite on u ∈ [0, 1]: position, velocity and acceleration at both
 * ends (per unit u), so a handover is continuous in acceleration too.
 */
function quintic(p0, v0, a0, p1, v1, a1, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  const u4 = u3 * u;
  const u5 = u4 * u;
  return (
    (1 - 10 * u3 + 15 * u4 - 6 * u5) * p0 +
    (u - 6 * u3 + 8 * u4 - 3 * u5) * v0 +
    (0.5 * u2 - 1.5 * u3 + 1.5 * u4 - 0.5 * u5) * a0 +
    (0.5 * u3 - u4 + 0.5 * u5) * a1 +
    (-4 * u3 + 7 * u4 - 3 * u5) * v1 +
    (10 * u3 - 15 * u4 + 6 * u5) * p1
  );
}

function flyGeometry(page) {
  const endZ = page.height - FLY.endInset;
  // The velocity ramps in along a smoothstep, which covers half the cruise
  // distance an instant start would: total = v · (riseStart − easeIn / 2).
  const speed = (endZ - FLY.startZ) / (T.riseStart - T.easeIn / 2);
  return { endZ, speed };
}

/** Look-at Z of the fly-through, defined for every t ≥ 0. */
function flyZ(t, page) {
  const { speed } = flyGeometry(page);
  const e = T.easeIn;

  if (t <= e) {
    const x = t / e;
    // ∫ smoothstep = x³ − x⁴ / 2
    return FLY.startZ + speed * e * (x * x * x - (x * x * x * x) / 2);
  }

  return FLY.startZ + speed * (e / 2 + (t - e));
}

/** Look-at Z over the apex: the page middle, drifting slowly toward the hero. */
function apexZ(t, page) {
  return page.height / 2 - APEX_DRIFT * (t - (T.riseEnd + T.apexEnd) / 2);
}

function overheadDistance(page) {
  return (page.height * OVERHEAD_MARGIN) / (2 * Math.tan(FOV_Y / 2));
}

/**
 * Rise progress over [riseStart, apexEnd]: front-loaded by an ease-out warp
 * that keeps a finite slope at the start (no jerk spike), so ~99.9% of the
 * climb is done by riseEnd; APEX_DRIFT carries the motion through the apex.
 */
function riseProgress(t) {
  const u = clamp01((t - T.riseStart) / (T.apexEnd - T.riseStart));
  return smootherstep(0, 1, 1 - (1 - u) ** 1.6);
}

/**
 * @param {number} t seconds
 * @param {{ page: { width: number, height: number }, hero: { rect: object, lift: number } }} layout
 *   the captured page and its hero window layer
 * @returns {{ target: number[], distance: number, pitch: number, fovY: number,
 *   focus: number, aperture: number }}
 */
export function cameraAt(t, layout) {
  const { page, hero } = layout;
  const centerX = page.width / 2;
  const fly = flyGeometry(page);

  if (t < T.riseStart) {
    return {
      target: [centerX, PAGE_Y, flyZ(t, page)],
      distance: FLY.distance,
      pitch: FLY.pitch,
      fovY: FOV_Y,
      focus: FLY.distance,
      aperture: FLY.aperture,
    };
  }

  const overhead = overheadDistance(page);

  if (t < T.apexEnd) {
    const r = riseProgress(t);
    const turn = smootherstep(RISE.turnStart, T.riseEnd, t);
    const distance = Math.exp(lerp(Math.log(FLY.distance), Math.log(overhead), r));

    return {
      target: [centerX, PAGE_Y, lerp(flyZ(t, page), apexZ(t, page), turn)],
      distance,
      pitch: lerp(FLY.pitch, 90 * DEG, r),
      fovY: FOV_Y,
      focus: distance,
      aperture: lerp(FLY.aperture, 0, r),
    };
  }

  const settleSpan = T.end - T.diveEnd;
  const logIn = Math.log(TITLE_VIEW.distanceIn);
  const settleDelta = Math.log(TITLE_VIEW.distanceOut) - logIn;
  let logDistance;

  if (t < T.diveEnd) {
    // The settle is an ease-out quadratic; the dive lands on its start
    // velocity and acceleration, so the landing has no jolt.
    const span = T.diveEnd - T.apexEnd;
    logDistance = quintic(
      Math.log(overhead),
      0,
      0,
      logIn,
      ((2 * settleDelta) / settleSpan) * span,
      ((-2 * settleDelta) / settleSpan ** 2) * span * span,
      (t - T.apexEnd) / span,
    );
  } else {
    const u = clamp01((t - T.diveEnd) / settleSpan);
    logDistance = logIn + settleDelta * (1 - (1 - u) ** 2);
  }

  // The dive aims at the hero window and then follows it off the page, so the
  // card is never left behind; once it lands, the view eases up to take in
  // the title above it.
  const card = heroCardAt(t, hero);
  const cardZ = hero.rect.y + hero.rect.height / 2 + card.offsetZ;
  const follow = cardZ - TITLE_VIEW.aboveCard * smootherstep(TITLE_VIEW.composeStart, TITLE_VIEW.composeEnd, t);
  const dive = smootherstep(T.apexEnd, T.diveEnd, t);
  const height = lerp(PAGE_Y, PAGE_Y + card.lift, dive);
  const distance = Math.exp(logDistance);

  return {
    target: [centerX, height, lerp(apexZ(t, page), follow, dive)],
    distance,
    pitch: 90 * DEG,
    fovY: FOV_Y,
    focus: distance,
    aperture: TITLE_VIEW.aperture * dive,
  };
}

/** Camera position and orthonormal basis for a sampled camera. */
export function cameraBasis(cam) {
  const sp = Math.sin(cam.pitch);
  const cp = Math.cos(cam.pitch);
  const forward = [0, -sp, -cp];
  const up = [0, cp, -sp];
  const right = [1, 0, 0];
  const eye = cam.target.map((v, i) => v - forward[i] * cam.distance);
  return { eye, forward, up, right };
}

/**
 * Lift of a page layer. Layers rest between PASS_LIFT.min and the middle of
 * the range (the captured lift keeps their order) and rise to PASS_LIFT.max
 * while the camera's look-at point passes them. `rest` is the part kept on
 * the line of sight; the pass-by rise is left free so it reads as parallax.
 */
export function layerLift(layer, t, cam) {
  const rest = PASS_LIFT.min + (layer.lift - PASS_LIFT.min) / 2;
  const centerZ = layer.rect.y + layer.rect.height / 2;
  const near = Math.exp(-(((centerZ - cam.target[2]) / PASS_LIFT.reach) ** 2));
  const passing = 1 - smoothstep(T.riseStart, T.riseEnd, t);
  return { rest, lift: rest + (PASS_LIFT.max - rest) * near * passing };
}

/**
 * Horizontal shift that keeps a lifted layer on the camera's line of sight
 * through its page position: it rises toward the lens instead of sliding over
 * the text beside it. Fades out with the rise, where lifts are straight up.
 */
export function towardCamera(centerX, centerZ, lift, eye, t) {
  const k = 1 - smoothstep(T.riseStart, T.riseEnd, t);
  const height = Math.max(eye[1] - PAGE_Y, 1);
  return {
    dx: ((eye[0] - centerX) / height) * lift * k,
    dz: ((eye[2] - centerZ) / height) * lift * k,
  };
}

/**
 * The hero window leaves the page during the dive and settles, higher, on the
 * open floor above the page's top edge: the floating card of the title.
 */
export function heroCardAt(t, layer) {
  const { rect } = layer;
  const move = smootherstep(CARD.moveStart, CARD.moveEnd, t);
  const rise = smootherstep(T.apexEnd, CARD.riseEnd, t);
  const pageCenterZ = rect.y + rect.height / 2;
  const hover = 6 * Math.sin((t - T.diveEnd) * 1.1) * smoothstep(T.diveEnd, T.end, t);
  return {
    offsetX: 0,
    offsetZ: lerp(pageCenterZ, CARD.centerZ, move) - pageCenterZ,
    lift: lerp(layer.lift, CARD.lift, rise) + hover,
  };
}

/**
 * Four agent tiles float around the hero window from the first frame and ride
 * along with it into the title card. Offsets are from the window's centre.
 */
export const LOGO_TILES = Object.freeze([
  { dx: -612, dz: -250, size: 104, above: 46, phase: 0.0 },
  { dx: 600, dz: -318, size: 96, above: 58, phase: 1.7 },
  { dx: -588, dz: 236, size: 92, above: 64, phase: 3.1 },
  { dx: 626, dz: 196, size: 108, above: 40, phase: 4.4 },
]);

/** Each tile bobs and wanders a few px, so the title hold never freezes. */
export function logoTileAt(tile, t, card) {
  return {
    dx: tile.dx + 7 * Math.sin(t * 0.7 + tile.phase),
    dz: tile.dz + 7 * Math.cos(t * 0.55 + tile.phase),
    lift: card.lift + tile.above + 10 * Math.sin(t * 0.9 + tile.phase),
  };
}

/**
 * Title-card elements: badge, headline, italic tail. Each rises 28px into the
 * card's plane and fades in, staggered from the music hit; the first waits
 * until the page has slid out from under the card, so the page's own
 * headline is gone before the title's arrives.
 */
export const TITLE_ITEMS = Object.freeze([
  { id: "badge", start: T.diveEnd + 0.27, gapAboveCard: 380 },
  { id: "headline", start: T.diveEnd + 0.45, gapAboveCard: 238 },
  { id: "tail", start: T.diveEnd + 0.63, gapAboveCard: 112 },
]);

export function titleItemAt(item, t) {
  const u = smootherstep(item.start, item.start + 0.7, t);
  return { opacity: u, rise: 28 * (1 - u) };
}
