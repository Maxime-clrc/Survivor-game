
const MAX_QUADS = 8192;
const VERT_STRIDE = 24;

export const BLEND_NORMAL = 0;
export const BLEND_ADD = 1;

const VS = `#version 300 es
in vec2 aPos;
in vec2 aUV;
in vec4 aTint;
in vec4 aFx;
uniform vec2 uScale;
uniform vec2 uOffset;
out vec2 vUV;
out vec4 vTint;
out float vFlash;
out vec3 vFlashCol;
void main() {
  vUV = aUV;
  vTint = aTint;
  vFlash = aFx.x;
  vFlashCol = aFx.yzw;
  gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 vUV;
in vec4 vTint;
in float vFlash;
in vec3 vFlashCol;
uniform sampler2D uAtlas;
out vec4 fragColor;
void main() {
  vec4 c = texture(uAtlas, vUV) * vTint;
  // Melange vers la couleur d'eclair, en gardant l'alpha premultiplie : la
  // cible est donc vFlashCol * c.a et non vFlashCol tel quel.
  fragColor = vec4(mix(c.rgb, vFlashCol * c.a, vFlash), c.a);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function createGL(canvas, opts = {}) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const r = {
    gl,
    canvas,
    ok: false,
    lost: false,
    onRestore: opts.onRestore ?? null,
    draws: 0,
    quads: 0,
  };

  canvas.addEventListener("webglcontextlost", e => {
    e.preventDefault();
    r.lost = true;
    r.ok = false;
    console.warn("contexte WebGL perdu — repli sur le canvas 2D");
  });

  canvas.addEventListener("webglcontextrestored", () => {
    r.lost = false;
    init();
    r.onRestore?.();
    console.warn("contexte WebGL restaure");
  });

  let prog = null, vao = null, vbo = null, ibo = null, tex = null;
  let uScale = null, uOffset = null, uAtlas = null;

  const bytes = new ArrayBuffer(MAX_QUADS * 4 * VERT_STRIDE);
  const f32 = new Float32Array(bytes);
  const u8 = new Uint8Array(bytes);

  let n = 0;
  let blend = BLEND_NORMAL;
  let fdr = 255, fdg = 255, fdb = 255;

  function init() {
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("programme:", gl.getProgramInfoLog(prog));
      return;
    }

    uScale = gl.getUniformLocation(prog, "uScale");
    uOffset = gl.getUniformLocation(prog, "uOffset");
    uAtlas = gl.getUniformLocation(prog, "uAtlas");

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, bytes.byteLength, gl.DYNAMIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "aPos");
    const aUV = gl.getAttribLocation(prog, "aUV");
    const aTint = gl.getAttribLocation(prog, "aTint");
    const aFx = gl.getAttribLocation(prog, "aFx");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, VERT_STRIDE, 0);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, VERT_STRIDE, 8);
    gl.enableVertexAttribArray(aTint);
    gl.vertexAttribPointer(aTint, 4, gl.UNSIGNED_BYTE, true, VERT_STRIDE, 16);
    gl.enableVertexAttribArray(aFx);
    gl.vertexAttribPointer(aFx, 4, gl.UNSIGNED_BYTE, true, VERT_STRIDE, 20);

    const idx = new Uint16Array(MAX_QUADS * 6);
    for (let i = 0, v = 0; i < MAX_QUADS; i++, v += 4) {
      const o = i * 6;
      idx[o] = v; idx[o + 1] = v + 1; idx[o + 2] = v + 2;
      idx[o + 3] = v; idx[o + 4] = v + 2; idx[o + 5] = v + 3;
    }
    ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    tex = null;
    r.ok = true;
  }

  r.setAtlas = img => {
    if (!r.ok || !img) return;
    if (!tex) tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  // teinte d'eclair par DEFAUT : un quad qui n'en passe pas la reprend. Elle est
  // un attribut de sommet et non un uniforme — deux couleurs d'eclair dans la
  // meme image ne coutent donc aucun vidage supplementaire.
  r.setFlashColor = (cr, cg, cb) => {
    fdr = (cr * 255) | 0; fdg = (cg * 255) | 0; fdb = (cb * 255) | 0;
  };

  // la PROJECTION prend une echelle, pas une taille de monde : c'est le seul
  // moyen que la couche GL et les couches 2D derivent leurs pixels-par-unite du
  // MEME nombre. Une taille de monde les faisait diverger des que le rapport de
  // la zone de dessin s'ecartait du sien.
  r.resize = (pxW, pxH, scale) => {
    if (!r.ok) return;
    canvas.width = pxW;
    canvas.height = pxH;
    gl.viewport(0, 0, pxW, pxH);
    r.px = { w: pxW, h: pxH, s: scale };
  };

  r.begin = (bg = null, camX = 0, camY = 0) => {
    if (!r.ok) return false;
    n = 0;
    blend = BLEND_NORMAL;
    r.draws = 0;
    r.quads = 0;
    if (bg) gl.clearColor(bg[0], bg[1], bg[2], 1);
    else gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uAtlas, 0);
    const px = r.px ?? { w: canvas.width, h: canvas.height, s: 1 };
    const sx = 2 * px.s / px.w, sy = -2 * px.s / px.h;
    gl.uniform2f(uScale, sx, sy);
    gl.uniform2f(uOffset, -1 - camX * sx, 1 - camY * sy);
    applyBlend();
    return true;
  };

  function applyBlend() {
    if (blend === BLEND_ADD) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  r.setBlend = mode => {
    if (mode === blend) return;
    r.flush();
    blend = mode;
    applyBlend();
  };

  r.flush = () => {
    if (!r.ok || n === 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, u8.subarray(0, n * 4 * VERT_STRIDE));
    gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
    r.draws++;
    r.quads += n;
    n = 0;
  };

  r.end = () => {
    if (!r.ok) return;
    r.flush();
    gl.bindVertexArray(null);
  };

  r.quad = (u0, v0, u1, v1, x, y, halfW, halfH, angle, cr, cg, cb, ca, flash,
            fr, fg, fb) => {
    if (!r.ok) return;
    if (n >= MAX_QUADS) r.flush();

    const hx = halfW, hy = halfH;
    let x0, y0, x1, y1, x2, y2, x3, y3;
    if (angle) {
      const c = Math.cos(angle), s = Math.sin(angle);
      const cx = c * hx, sx = s * hx, cy = c * hy, sy = s * hy;
      x0 = x - cx + sy; y0 = y - sx - cy;
      x1 = x + cx + sy; y1 = y + sx - cy;
      x2 = x + cx - sy; y2 = y + sx + cy;
      x3 = x - cx - sy; y3 = y - sx + cy;
    } else {
      x0 = x - hx; y0 = y - hy;
      x1 = x + hx; y1 = y0;
      x2 = x1;     y2 = y + hy;
      x3 = x0;     y3 = y2;
    }

    let o = n * 4 * VERT_STRIDE;
    let fo = o >> 2;
    const fl = flash;
    const kr = fr === undefined ? fdr : fr;
    const kg = fg === undefined ? fdg : fg;
    const kb = fb === undefined ? fdb : fb;

    f32[fo] = x0; f32[fo + 1] = y0; f32[fo + 2] = u0; f32[fo + 3] = v0;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl; u8[o + 21] = kr; u8[o + 22] = kg; u8[o + 23] = kb;
    o += VERT_STRIDE; fo = o >> 2;
    f32[fo] = x1; f32[fo + 1] = y1; f32[fo + 2] = u1; f32[fo + 3] = v0;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl; u8[o + 21] = kr; u8[o + 22] = kg; u8[o + 23] = kb;
    o += VERT_STRIDE; fo = o >> 2;
    f32[fo] = x2; f32[fo + 1] = y2; f32[fo + 2] = u1; f32[fo + 3] = v1;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl; u8[o + 21] = kr; u8[o + 22] = kg; u8[o + 23] = kb;
    o += VERT_STRIDE; fo = o >> 2;
    f32[fo] = x3; f32[fo + 1] = y3; f32[fo + 2] = u0; f32[fo + 3] = v1;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl; u8[o + 21] = kr; u8[o + 22] = kg; u8[o + 23] = kb;

    n++;
  };

  init();
  return r.ok || r.lost ? r : null;
}

const colorCache = new Map();

export function parseColor(css) {
  let v = colorCache.get(css);
  if (v) return v;
  v = [255, 255, 255];
  if (typeof css === "string") {
    const s = css.trim();
    if (s[0] === "#") {
      if (s.length === 7) {
        v = [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
      } else if (s.length === 4) {
        v = [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16)];
      }
    } else {
      const m = s.match(/-?\d+(\.\d+)?/g);
      if (m && m.length >= 3) v = [+m[0] | 0, +m[1] | 0, +m[2] | 0];
    }
  }
  colorCache.set(css, v);
  return v;
}
