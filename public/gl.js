/* ===========================================================================
   GL — le batcher de quads textures.

   Ecrit a la main, en WebGL2, sans bibliotheque. La raison n'est pas
   ideologique, elle est architecturale : PixiJS et ses equivalents sont des
   moteurs a GRAPHE DE SCENE, en mode retenu — on cree des objets persistants
   qu'on modifie. Le jeu, lui, est en MODE IMMEDIAT : il redessine tout a chaque
   image a partir d'un instantane interpole, sans aucun etat de rendu
   persistant. Marier les deux voudrait dire maintenir un objet d'affichage par
   entite, gerer sa creation et sa destruction au rythme des identifiants du
   serveur, et synchroniser deux sources de verite — plus de travail que le
   batcher lui-meme, et toute une classe de bugs (objets fantomes, fuites) qui
   n'existe pas aujourd'hui.

   Les besoins sont etroits : des quads textures, une teinte, un eclair blanc,
   deux modes de melange. Ce fichier, et rien de plus.

   CE QUE LA BASCULE N'APPORTE PAS : de la fluidite. A ~800 sprites par image le
   canvas 2D accelere tient largement. Ce qu'elle apporte, ce sont des CAPACITES
   que le 2D ne sait pas produire — teinte par sprite gratuite, melange additif,
   et des milliers de particules la ou on en plafonnait trois cents.
   =========================================================================== */

/* Plafond de quads par lot. Les indices sont en Uint16, donc la limite dure est
   16 383 quads (65 536 / 4 sommets) : au-dela les indices debordent et la
   geometrie se corrompt en silence. On se tient tres en dessous — 800 sprites
   plus 3 000 particules au pire cas — et on vide le lot avant d'atteindre le
   plafond plutot que de le decouvrir. */
const MAX_QUADS = 8192;
const VERT_STRIDE = 24;          // 2 f32 position + 2 f32 uv + 4 u8 teinte + 4 u8 eclair

export const BLEND_NORMAL = 0;
export const BLEND_ADD = 1;

/* Le retournement de l'axe Y est ABSORBE PAR LA PROJECTION : WebGL a Y vers le
   haut, le canvas 2D vers le bas. Le code de jeu continue donc de travailler en
   coordonnees monde 1600 x 900 avec Y vers le bas, et pas un appelant ne
   change. Une paire (echelle, decalage) plutot qu'une matrice 4x4 : c'est la
   meme transformation, en deux uniformes au lieu de seize. */
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
void main() {
  vUV = aUV;
  vTint = aTint;
  vFlash = aFx.x;
  gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0);
}`;

/* `mediump` suffit et reste rapide sur les GPU integres ; `highp` n'apporte
   rien ici.

   La teinte est MULTIPLICATIVE sur une texture premultipliee : le canal alpha
   module deja rgb, on multiplie donc les quatre canaux. Ecrite autrement, la
   teinte donne un additif deux fois trop lumineux — c'est le piege le plus
   frequent de la bascule, avec l'alpha non premultiplie lui-meme.

   L'ECLAIR BLANC ne peut pas venir de la teinte : un multiplicatif ne sait pas
   eclaircir. Il est donc un attribut de sommet et un `mix` — un attribut de
   plus, mais qui reste dans le MEME appel de dessin. L'autre option (redessiner
   le sprite en additif) doublait le nombre de quads pour les entites touchees,
   c'est-a-dire des dizaines a la fois pendant une nova. */
const FS = `#version 300 es
precision mediump float;
in vec2 vUV;
in vec4 vTint;
in float vFlash;
uniform sampler2D uAtlas;
uniform vec3 uFlashColor;
out vec4 fragColor;
void main() {
  vec4 c = texture(uAtlas, vUV) * vTint;
  // Melange vers la couleur d'eclair, en gardant l'alpha premultiplie : la
  // cible est donc uFlashColor * c.a et non uFlashColor tel quel.
  fragColor = vec4(mix(c.rgb, uFlashColor * c.a, vFlash), c.a);
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

/* Cree le renderer, ou rend `null` si WebGL2 n'est pas disponible. Le repli
   vers le chemin canvas 2D n'est PAS optionnel et il est de toute facon
   gratuit : le chemin 2D existe deja et reste vivant. */
export function createGL(canvas, opts = {}) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    // Le canvas WebGL est la couche du DESSOUS : il porte le fond de l'arene,
    // donc il n'a pas besoin d'etre transparent au compositeur — mais on le
    // laisse en alpha pour que le fond reste une couleur de la charte et non
    // une valeur figee dans le contexte.
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    /* Pas de `desynchronized` : il decouple la presentation du canvas de celle
       de la page, ce qui est exactement ce qu'on ne veut pas quand trois
       canvas empiles doivent montrer la MEME image de jeu. */
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const r = {
    gl,
    canvas,
    ok: false,
    lost: false,
    onRestore: opts.onRestore ?? null,
    // mesures, lues par `?perf` : un rendu qui vide son lot a chaque sprite
    // fait des centaines d'appels de dessin, et rien ne le dit a l'ecran.
    draws: 0,
    quads: 0,
  };

  /* --- perte de contexte ---------------------------------------------------
     Ce n'est pas un cas d'ecole : bascule de GPU sur un portable, mise en
     veille, redemarrage de pilote. Non gere, c'est un ECRAN NOIR DEFINITIF et
     le joueur doit recharger la page.

     `preventDefault` n'est pas facultatif — sans lui le contexte n'est JAMAIS
     restaure, et l'evenement de restauration n'arrive pas. */
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
  let uScale = null, uOffset = null, uAtlas = null, uFlashColor = null;

  // Un seul tampon dynamique, attributs entrelaces. Deux vues sur le MEME
  // ArrayBuffer : les flottants pour la position et les coordonnees de texture,
  // les octets pour la teinte et l'eclair. Deux tableaux separes auraient
  // demande deux tampons et deux transferts.
  const bytes = new ArrayBuffer(MAX_QUADS * 4 * VERT_STRIDE);
  const f32 = new Float32Array(bytes);
  const u8 = new Uint8Array(bytes);

  let n = 0;                 // quads dans le lot courant
  let blend = BLEND_NORMAL;
  let flashColor = [1, 1, 1];

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
    uFlashColor = gl.getUniformLocation(prog, "uFlashColor");

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

    /* Indices STATIQUES : quatre sommets et six indices par quad, toujours les
       memes. Les televerser une fois pour toutes evite de les repousser a
       chaque image — c'est la moitie du trafic du batcher, pour une geometrie
       qui ne change jamais. */
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

  /* Atlas. `UNPACK_PREMULTIPLY_ALPHA_WEBGL` est le point de defaillance visuelle
     le plus frequent de la bascule : sans lui, chaque sprite obtient un LISERE
     SOMBRE sur ses bords transparents et le melange additif est faux. Le canvas
     2D est premultiplie en interne, mais `texImage2D` le lit demultiplie — il
     faut donc redemander la premultiplication ici.

     `CLAMP_TO_EDGE` sur les deux axes et `LINEAR` dans les deux sens. Pas de
     mipmaps : les sprites sont dessines a leur echelle native ou tout pres, et
     une chaine de mipmaps melangerait en plus les cases voisines. */
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

  r.setFlashColor = (cr, cg, cb) => { flashColor = [cr, cg, cb]; };

  /* Le viewport est en pixels PHYSIQUES, donc deja multiplies par la densite —
     l'oublier donne le symptome classique du rendu tasse dans un coin. Les
     coordonnees monde, elles, restent en 1600 x 900 : c'est la projection qui
     absorbe tout, et le facteur de densite avec. */
  r.resize = (pxW, pxH, worldW, worldH) => {
    if (!r.ok) return;
    canvas.width = pxW;
    canvas.height = pxH;
    gl.viewport(0, 0, pxW, pxH);
    r.world = { w: worldW, h: worldH };
  };

  r.begin = (bg = null) => {
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
    gl.uniform3f(uFlashColor, flashColor[0], flashColor[1], flashColor[2]);
    const w = r.world?.w ?? 1600, h = r.world?.h ?? 900;
    gl.uniform2f(uScale, 2 / w, -2 / h);
    gl.uniform2f(uOffset, -1, 1);
    applyBlend();
    return true;
  };

  function applyBlend() {
    // Alpha PREMULTIPLIE des deux cotes : c'est ce qui rend le mode additif
    // simplement `ONE, ONE` au lieu d'une formule qui depend de l'alpha source.
    if (blend === BLEND_ADD) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /* Un lot ne se vide QUE sur un changement d'etat : mode de melange, plafond
     atteint, fin d'image. Le vider a chaque sprite donnerait des centaines
     d'appels de dessin pour le meme resultat — c'est le piege qui annule tout
     l'interet du batcher, et il ne se voit pas a l'ecran. En pratique on tient
     l'image en deux appels, un normal et un additif. */
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

  /* Ecriture d'un quad. La rotation et l'echelle sont appliquees COTE CPU, a
     l'ecriture des quatre sommets : c'est plus rapide que de passer une matrice
     par sprite, et ca garde le shader trivial.

     `halfW`/`halfH` sont les demi-cotes en unites monde, `cr/cg/cb/ca` la teinte
     en 0..255 DEJA premultipliee par l'alpha (voir le commentaire du shader). */
  r.quad = (u0, v0, u1, v1, x, y, halfW, halfH, angle, cr, cg, cb, ca, flash) => {
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

    // sommet 0 — haut gauche
    f32[fo] = x0; f32[fo + 1] = y0; f32[fo + 2] = u0; f32[fo + 3] = v0;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl;
    // sommet 1 — haut droite
    o += VERT_STRIDE; fo = o >> 2;
    f32[fo] = x1; f32[fo + 1] = y1; f32[fo + 2] = u1; f32[fo + 3] = v0;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl;
    // sommet 2 — bas droite
    o += VERT_STRIDE; fo = o >> 2;
    f32[fo] = x2; f32[fo + 1] = y2; f32[fo + 2] = u1; f32[fo + 3] = v1;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl;
    // sommet 3 — bas gauche
    o += VERT_STRIDE; fo = o >> 2;
    f32[fo] = x3; f32[fo + 1] = y3; f32[fo + 2] = u0; f32[fo + 3] = v1;
    u8[o + 16] = cr; u8[o + 17] = cg; u8[o + 18] = cb; u8[o + 19] = ca;
    u8[o + 20] = fl;

    n++;
  };

  init();
  return r.ok || r.lost ? r : null;
}

/* Conversion d'une couleur CSS en trois octets, MEMORISEE. Les teintes du jeu
   sont une poignee de chaines constantes (quatre couleurs de joueur, cinq
   types, une poignee de signaux) relues a chaque sprite et a chaque image :
   les reparser soixante fois par seconde pour deux cents entites serait le seul
   endroit du rendu ou l'on paierait une analyse de chaine. */
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
      // `rgba(r, g, b, a)` : la seule autre forme produite par `alpha()` dans la
      // charte. L'alpha y est deja porte par le parametre `alpha` de
      // `drawSprite`, on ne lit donc que les trois premieres composantes.
      const m = s.match(/-?\d+(\.\d+)?/g);
      if (m && m.length >= 3) v = [+m[0] | 0, +m[1] | 0, +m[2] | 0];
    }
  }
  colorCache.set(css, v);
  return v;
}
