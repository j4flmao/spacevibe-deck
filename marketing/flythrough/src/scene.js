/**
 * The fly-through renderer: one WebGL2 context, every surface a textured
 * horizontal quad. Planes never intersect and the camera is always above them,
 * so painter's order by height is exact and no depth buffer is needed; each
 * draw also writes its view depth (weighted by coverage) to a second target
 * for the depth-of-field pass.
 *
 * A frame is SUBFRAMES renders spread across a 180° shutter, each jittered by a
 * sub-pixel Halton offset and put through depth of field, averaged in a float
 * buffer: motion blur and anti-aliasing from the same samples.
 */

import {
  FPS,
  PAGE_Y,
  cameraAt,
  cameraBasis,
  heroCardAt,
  layerLift,
  logoTileAt,
  LOGO_TILES,
  titleItemAt,
  TITLE_ITEMS,
  towardCamera,
} from "./camera.js";

export const SUBFRAMES = 16;
const SHUTTER = 0.5 / FPS;
const NEAR = 20;
const FAR = 80000;
const PAGE_RADIUS = 24;
const MAX_COC = 10;
const DOF_TAPS = 24;
const FLOOR_CENTER = [0xf9, 0xfb, 0xfb].map((v) => v / 255);
const FLOOR_CORNER = [0xf2, 0xf3, 0xf6].map((v) => v / 255);

const QUAD_VS = `#version 300 es
in vec2 aCorner;
uniform mat4 uViewProj;
uniform vec3 uOrigin;
uniform vec2 uSize;
uniform float uY;
out vec2 vUV;
out vec3 vWorld;
void main() {
  vUV = aCorner;
  vWorld = vec3(uOrigin.x + aCorner.x * uSize.x, uY, uOrigin.z + aCorner.y * uSize.y);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

const FS_HEAD = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vWorld;
uniform vec3 uEye;
uniform vec3 uForward;
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oDepth;
float viewDepth() { return dot(vWorld - uEye, uForward); }
float sdRoundRect(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
`;

const FLOOR_FS = `${FS_HEAD}
uniform vec2 uResolution;
uniform vec3 uCenter;
uniform vec3 uCorner;
void main() {
  vec2 p = (gl_FragCoord.xy / uResolution - 0.5) * 2.0;
  float d = clamp(length(p) / 1.41421, 0.0, 1.0);
  oColor = vec4(mix(uCenter, uCorner, smoothstep(0.0, 1.0, d)), 1.0);
  oDepth = vec4(viewDepth(), 0.0, 0.0, 1.0);
}`;

const TEXTURED_FS = `${FS_HEAD}
uniform sampler2D uTexture;
uniform float uOpacity;
// Page tiles clip to the page's rounded outline; layers carry their own alpha.
uniform vec4 uClipRect;
uniform float uClipRadius;
void main() {
  vec4 c = texture(uTexture, vUV) * uOpacity;
  if (uClipRadius > 0.0) {
    float sd = sdRoundRect(vWorld.xz - uClipRect.xy, uClipRect.zw, uClipRadius);
    c *= clamp(0.5 - sd / max(fwidth(sd), 1e-3), 0.0, 1.0);
  }
  oColor = c;
  oDepth = vec4(viewDepth() * c.a, 0.0, 0.0, c.a);
}`;

// A Gaussian-blurred rounded rectangle, integrated analytically: shadows are
// shapes, not shadow-map lookups, so they stay soft at any distance.
const SHADOW_FS = `${FS_HEAD}
uniform vec4 uRect;
uniform float uRadius;
uniform float uSigma;
uniform float uStrength;
float erfApprox(float x) {
  float x2 = x * x;
  float a = 0.147;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.27324 + a * x2) / (1.0 + a * x2)));
}
void main() {
  float d = sdRoundRect(vWorld.xz - uRect.xy, uRect.zw, uRadius);
  float a = uStrength * 0.5 * (1.0 - erfApprox(d / (uSigma * 1.41421)));
  oColor = vec4(0.0, 0.0, 0.0, a);
  oDepth = vec4(0.0);
}`;

const FULLSCREEN_VS = `#version 300 es
in vec2 aCorner;
out vec2 vUV;
void main() {
  vUV = aCorner;
  gl_Position = vec4(aCorner * 2.0 - 1.0, 0.0, 1.0);
}`;

const DOF_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uFocus;
uniform float uAperture;
uniform float uWeight;
uniform float uRotation;
out vec4 oColor;
float coc(vec2 uv) {
  vec4 d = texture(uDepth, uv);
  float depth = d.a > 0.0 ? d.r / d.a : uFocus;
  return min(uAperture * abs(1.0 - uFocus / max(depth, 1.0)), ${MAX_COC.toFixed(1)});
}
void main() {
  vec4 sum = texture(uColor, vUV);
  float c0 = coc(vUV);
  float total = 1.0;
  if (c0 > 0.5) {
    for (int i = 0; i < ${DOF_TAPS}; i++) {
      float fi = float(i);
      float r = c0 * sqrt((fi + 0.5) / ${DOF_TAPS.toFixed(1)});
      float a = fi * 2.39996 + uRotation;
      vec2 uv = vUV + vec2(cos(a), sin(a)) * r * uTexel;
      float w = clamp(coc(uv) - r + 1.0, 0.0, 1.0);
      sum += texture(uColor, uv) * w;
      total += w;
    }
  }
  oColor = sum / total * uWeight;
}`;

const PRESENT_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uAccum;
out vec4 oColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture(uAccum, vUV).rgb;
  // Triangular one-step dither, independent per channel: the floor gradient
  // spans five to eight levels per channel, and undithered channels step at
  // different radii into tinted rings. H.264 still smooths most of it away;
  // the 10-bit HEVC master keeps it.
  vec2 p = gl_FragCoord.xy;
  vec3 a = vec3(hash(p), hash(p + 31.0), hash(p + 67.0));
  vec3 b = vec3(hash(p.yx + 17.0), hash(p.yx + 43.0), hash(p.yx + 89.0));
  c += (a + b - 1.0) / 255.0;
  oColor = vec4(c, 1.0);
}`;

function halton(index, base) {
  let result = 0;
  let f = 1 / base;
  let i = index + 1;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) {
        s += a[k * 4 + r] * b[c * 4 + k];
      }
      out[c * 4 + r] = s;
    }
  }
  return out;
}

function viewProjection(cam, basis, size, jitter) {
  const f = 1 / Math.tan(cam.fovY / 2);
  const aspect = size.width / size.height;
  const proj = new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    (2 * jitter[0]) / size.width, (2 * jitter[1]) / size.height, (FAR + NEAR) / (NEAR - FAR), -1,
    0, 0, (2 * FAR * NEAR) / (NEAR - FAR), 0,
  ]);
  const { eye, up, right, forward } = basis;
  const back = forward.map((v) => -v);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const view = new Float32Array([
    right[0], up[0], back[0], 0,
    right[1], up[1], back[1], 0,
    right[2], up[2], back[2], 0,
    -dot(right, eye), -dot(up, eye), -dot(back, eye), 1,
  ]);
  return multiply(proj, view);
}

function compile(gl, vs, fs) {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
    }
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, "aCorner");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i += 1) {
    const { name } = gl.getActiveUniform(program, i);
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
}

function renderTarget(gl, width, height, formats) {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const textures = formats.map((format, i) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0);
    return texture;
  });
  gl.drawBuffers(formats.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Render target is incomplete.");
  }
  return { framebuffer, textures };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} assets
 * @param {{ width: number, height: number }} assets.page
 * @param {{ image: ImageBitmap | HTMLCanvasElement, y: number, height: number }[]} assets.tiles
 * @param {object[]} assets.layers manifest layers, each with an `image`
 * @param {(ImageBitmap | HTMLCanvasElement)[]} assets.logoTiles
 * @param {Record<string, { image: HTMLCanvasElement, width: number, height: number,
 *   radius?: number, shadow?: boolean }>} assets.title
 */
export function createScene(canvas, assets) {
  const size = { width: canvas.width, height: canvas.height };
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    throw new Error("WebGL2 is unavailable.");
  }
  if (!gl.getExtension("EXT_color_buffer_float")) {
    throw new Error("EXT_color_buffer_float is unavailable.");
  }

  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const programs = {
    floor: compile(gl, QUAD_VS, FLOOR_FS),
    textured: compile(gl, QUAD_VS, TEXTURED_FS),
    shadow: compile(gl, QUAD_VS, SHADOW_FS),
    dof: compile(gl, FULLSCREEN_VS, DOF_FS),
    present: compile(gl, FULLSCREEN_VS, PRESENT_FS),
  };
  const scene = renderTarget(gl, size.width, size.height, [gl.RGBA8, gl.RGBA16F]);
  const accum = renderTarget(gl, size.width, size.height, [gl.RGBA16F]);

  function upload(image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Premultiplied before mipmapping, or transparent edges fringe dark.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) {
      gl.texParameterf(
        gl.TEXTURE_2D,
        aniso.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
      );
    }
    return texture;
  }

  const { page } = assets;
  const tiles = assets.tiles.map((tile) => ({ ...tile, texture: upload(tile.image) }));
  const layers = assets.layers.map((layer) => ({ ...layer, texture: upload(layer.image) }));
  const hero = layers.find((layer) => layer.kind === "window");
  const logoTextures = assets.logoTiles.map(upload);
  const title = Object.fromEntries(
    Object.entries(assets.title).map(([id, item]) => [id, { ...item, texture: upload(item.image) }]),
  );

  let frameUniforms = null;

  function useProgram(p) {
    gl.useProgram(p.program);
    gl.uniformMatrix4fv(p.uniforms.uViewProj, false, frameUniforms.viewProj);
    gl.uniform3fv(p.uniforms.uEye, frameUniforms.eye);
    gl.uniform3fv(p.uniforms.uForward, frameUniforms.forward);
    return p.uniforms;
  }

  function drawPlane(u, x, z, width, depth, y) {
    gl.uniform3f(u.uOrigin, x, 0, z);
    gl.uniform2f(u.uSize, width, depth);
    gl.uniform1f(u.uY, y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Key and ambient shadow of a rounded rect floating `lift` above the page. */
  function drawShadow(u, rect, radius, lift, strength = 1) {
    const passes = [
      { dx: 0.16 * lift, dz: 0.36 * lift, sigma: 2 + 0.36 * lift, alpha: 0.3 },
      { dx: 0, dz: 0.1 * lift, sigma: 4 + 0.6 * lift, alpha: 0.14 },
    ];
    // A higher object casts a fainter shadow, not just a softer one.
    const fade = strength / (1 + lift / 140);
    for (const pass of passes) {
      const cx = rect.x + rect.width / 2 + pass.dx;
      const cz = rect.z + rect.depth / 2 + pass.dz;
      const pad = pass.sigma * 3;
      gl.uniform4f(u.uRect, cx, cz, rect.width / 2, rect.depth / 2);
      gl.uniform1f(u.uRadius, radius);
      gl.uniform1f(u.uSigma, pass.sigma);
      gl.uniform1f(u.uStrength, pass.alpha * fade);
      drawPlane(u, cx - rect.width / 2 - pad, cz - rect.depth / 2 - pad,
        rect.width + pad * 2, rect.depth + pad * 2, PAGE_Y + 0.2);
    }
  }

  /** Everything that floats this instant, as drawable rectangles. */
  function floatingAt(t, cam, eye) {
    const items = [];
    const card = heroCardAt(t, hero);

    for (const layer of layers) {
      const isHero = layer === hero;
      const { rest, lift } = isHero ? { rest: card.lift, lift: card.lift } : layerLift(layer, t, cam);
      const z = layer.rect.y + (isHero ? card.offsetZ : 0);
      const shift = towardCamera(
        layer.rect.x + layer.rect.width / 2,
        z + layer.rect.height / 2,
        rest,
        eye,
        t,
      );
      items.push({
        texture: layer.texture,
        rect: {
          x: layer.rect.x + shift.dx,
          z: z + shift.dz,
          width: layer.rect.width,
          depth: layer.rect.height,
        },
        radius: layer.radius,
        lift,
        opacity: 1,
        shadow: true,
      });
    }

    const heroCenterX = hero.rect.x + hero.rect.width / 2;
    const heroCenterZ = hero.rect.y + hero.rect.height / 2 + card.offsetZ;

    LOGO_TILES.forEach((tile, i) => {
      const at = logoTileAt(tile, t, card);
      const x = heroCenterX + at.dx;
      const z = heroCenterZ + at.dz;
      const shift = towardCamera(x, z, at.lift, eye, t);
      items.push({
        texture: logoTextures[i % logoTextures.length],
        rect: {
          x: x + shift.dx - tile.size / 2,
          z: z + shift.dz - tile.size / 2,
          width: tile.size,
          depth: tile.size,
        },
        radius: tile.size * 0.24,
        lift: at.lift,
        opacity: 1,
        shadow: true,
      });
    });

    const cardTop = heroCenterZ - hero.rect.height / 2;
    for (const spec of TITLE_ITEMS) {
      const item = title[spec.id];
      const state = titleItemAt(spec, t);
      if (!item || state.opacity <= 0) {
        continue;
      }
      items.push({
        texture: item.texture,
        rect: {
          x: heroCenterX - item.width / 2,
          z: cardTop - spec.gapAboveCard - item.height / 2,
          width: item.width,
          depth: item.height,
        },
        radius: item.radius ?? 0,
        lift: card.lift - state.rise,
        opacity: state.opacity,
        shadow: item.shadow === true,
      });
    }

    return items.sort((a, b) => a.lift - b.lift);
  }

  function drawScene(t, jitter) {
    const cam = cameraAt(t, { page, hero });
    const basis = cameraBasis(cam);
    frameUniforms = {
      viewProj: viewProjection(cam, basis, size, jitter),
      eye: basis.eye,
      forward: basis.forward,
    };

    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer);
    gl.viewport(0, 0, size.width, size.height);
    gl.disable(gl.BLEND);

    let u = useProgram(programs.floor);
    gl.uniform2f(u.uResolution, size.width, size.height);
    gl.uniform3fv(u.uCenter, FLOOR_CENTER);
    gl.uniform3fv(u.uCorner, FLOOR_CORNER);
    drawPlane(u, -FAR / 2, -FAR / 2, FAR, FAR, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const items = floatingAt(t, cam, basis.eye);

    u = useProgram(programs.shadow);
    const pageRect = { x: 0, z: 0, width: page.width, depth: page.height };
    drawShadow(u, pageRect, PAGE_RADIUS, 10, 0.9);
    // The page's own shadow lands on the floor, the rest on the page; both
    // planes are within a pixel of each other, so one pass draws them all.
    for (const item of items) {
      if (item.shadow) {
        drawShadow(u, item.rect, item.radius, item.lift, item.opacity);
      }
    }

    u = useProgram(programs.textured);
    gl.uniform4f(u.uClipRect, page.width / 2, page.height / 2, page.width / 2, page.height / 2);
    gl.uniform1f(u.uClipRadius, PAGE_RADIUS);
    gl.uniform1f(u.uOpacity, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u.uTexture, 0);
    for (const tile of tiles) {
      gl.bindTexture(gl.TEXTURE_2D, tile.texture);
      drawPlane(u, 0, tile.y, page.width, tile.height, PAGE_Y);
    }

    gl.uniform1f(u.uClipRadius, 0);
    for (const item of items) {
      gl.uniform1f(u.uOpacity, item.opacity);
      gl.bindTexture(gl.TEXTURE_2D, item.texture);
      drawPlane(u, item.rect.x, item.rect.z, item.rect.width, item.rect.depth, PAGE_Y + item.lift);
    }

    return cam;
  }

  function fullscreen(p) {
    gl.useProgram(p.program);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Paint frame time `t`. `subframes: 1` skips motion blur (the 30fps flow
   * preview); the default averages SUBFRAMES across the shutter.
   */
  function render(t, { subframes = SUBFRAMES } = {}) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, accum.framebuffer);
    gl.viewport(0, 0, size.width, size.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let s = 0; s < subframes; s += 1) {
      const offset = subframes === 1 ? 0 : ((s + 0.5) / subframes - 0.5) * SHUTTER;
      const jitter = subframes === 1 ? [0, 0] : [halton(s, 2) - 0.5, halton(s, 3) - 0.5];
      const cam = drawScene(t + offset, jitter);

      gl.bindFramebuffer(gl.FRAMEBUFFER, accum.framebuffer);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const u = programs.dof.uniforms;
      gl.useProgram(programs.dof.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene.textures[0]);
      gl.uniform1i(u.uColor, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, scene.textures[1]);
      gl.uniform1i(u.uDepth, 1);
      gl.uniform2f(u.uTexel, 1 / size.width, 1 / size.height);
      gl.uniform1f(u.uFocus, cam.focus);
      gl.uniform1f(u.uAperture, cam.aperture);
      gl.uniform1f(u.uWeight, 1 / subframes);
      gl.uniform1f(u.uRotation, s * 0.7853);
      fullscreen(programs.dof);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, accum.textures[0]);
    gl.useProgram(programs.present.program);
    gl.uniform1i(programs.present.uniforms.uAccum, 0);
    fullscreen(programs.present);
    gl.finish();
  }

  return { render, size };
}
