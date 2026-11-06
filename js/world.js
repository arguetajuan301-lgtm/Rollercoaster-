/* Chart Coaster: the world around the track. Sky, terrain, cities, scenery,
   floating particles and story billboards, all themed to the place and era. */
window.CC = window.CC || {};
(() => {
"use strict";
const T = THREE;

/* ---------- small helpers ---------- */
const col = h => new T.Color(h);
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
function disposeTree(o) {
  o.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
}

/* ---------- sky: gradient, nebula clouds, aurora, twinkling stars, moon or synthwave sun ---------- */
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = `
uniform vec3 top, mid, hor, glow, aurora, cloud, sunCol, sunDir;
uniform float time, auroraAmt, cloudAmt, starAmt, sunSize, stripes, flash;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a*noise(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.28, h)), top, smoothstep(0.28, 0.95, h));
  if (h < 0.0) c = hor * 0.55;
  vec3 sd3 = normalize(sunDir);
  float sd = max(dot(d, sd3), 0.0);
  c += glow * pow(sd, 5.0) * 0.55 * (1.0 - smoothstep(0.0, 0.6, h));
  c += glow * exp(-abs(h) * 12.0) * 0.32;
  // drifting nebula clouds and a milky band
  float n = fbm(d * 2.6 + vec3(time * 0.004, 0.0, time * 0.003));
  float n2 = fbm(d * 7.0 - vec3(0.0, time * 0.006, 0.0));
  float band = exp(-pow(dot(d, normalize(vec3(0.25, 0.55, 0.8))), 2.0) * 9.0);
  float above = smoothstep(-0.02, 0.25, h);
  c += cloud * smoothstep(0.42, 0.85, n) * cloudAmt * above * (0.6 + 0.6 * n2);
  c += cloud * 0.55 * band * n2 * starAmt * above;
  // aurora curtains
  float az = atan(d.z, d.x);
  float a1 = fbm(vec3(az * 2.5, h * 3.0, time * 0.05));
  float curtain = smoothstep(0.06, 0.22, h) * (1.0 - smoothstep(0.35, 0.75, h));
  float rays = pow(abs(sin(az * 18.0 + a1 * 7.0 + time * 0.15)), 4.0);
  c += aurora * curtain * auroraAmt * a1 * 1.6 * (0.35 + 0.65 * rays);
  // twinkling stars
  vec3 sp = d * 240.0; vec3 cell = floor(sp); float r = hash(cell);
  if (r > 0.982) {
    vec3 cc = cell + 0.5 + (vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 3.1)) - 0.5) * 0.6;
    float dist = length(sp - cc);
    float tw = 0.55 + 0.45 * sin(time * (1.0 + r * 6.0) + r * 80.0);
    vec3 sc = mix(vec3(1.0, 0.92, 0.85), vec3(0.8, 0.9, 1.0), hash(cell + 9.0));
    c += sc * smoothstep(0.42, 0.0, dist) * tw * starAmt * smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.6, 0.95, n) * cloudAmt * 0.7);
  }
  // moon, or a striped synthwave sun
  float ang = acos(clamp(dot(d, sd3), -1.0, 1.0));
  float disc = 1.0 - smoothstep(sunSize * 0.97, sunSize, ang);
  vec3 dc = sunCol * (0.8 + 0.2 * noise(d * 70.0)) * (0.85 + 0.15 * noise(d * 220.0));
  if (stripes > 0.0) {
    float sy = (d.y - sd3.y) / sunSize;
    float b = fract(sy * stripes * 0.5 + time * 0.08);
    float cut = step(sy, 0.25) * step(b, 0.5 * clamp(0.35 - sy, 0.0, 1.0));
    disc *= 1.0 - cut;
    dc = mix(sunCol, hor * 1.25, clamp(0.5 - sy * 0.8, 0.0, 1.0));
  }
  c += sunCol * exp(-ang / (sunSize * 1.4)) * 0.22;
  c = mix(c, dc, disc);
  c += vec3(0.65, 0.72, 1.0) * flash;
  gl_FragColor = vec4(c, 1.0);
}`;

function createSky(scene) {
  const uniforms = {
    top: { value: col("#000") }, mid: { value: col("#000") }, hor: { value: col("#000") }, glow: { value: col("#000") },
    aurora: { value: col("#000") }, cloud: { value: col("#000") }, sunCol: { value: col("#fff") }, sunDir: { value: new T.Vector3(1, 0.2, 0) },
    time: { value: 0 }, auroraAmt: { value: 0 }, cloudAmt: { value: 0 }, starAmt: { value: 1 }, sunSize: { value: 0.05 }, stripes: { value: 0 }, flash: { value: 0 }
  };
  const mat = new T.ShaderMaterial({ uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: T.BackSide, depthWrite: false, fog: false });
  const mesh = new T.Mesh(new T.SphereGeometry(2600, 64, 32), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1;
  scene.add(mesh);
  return { mesh, uniforms };
}
function applySky(sky, theme) {
  const s = theme.sky, u = sky.uniforms;
  ["top", "mid", "hor", "glow", "aurora", "cloud"].forEach(k => u[k].value.set(s[k]));
  u.sunCol.value.set(s.sun); u.sunDir.value.set(s.sunDir[0], s.sunDir[1], s.sunDir[2]).normalize();
  u.auroraAmt.value = s.auroraAmt; u.cloudAmt.value = s.cloudAmt; u.starAmt.value = s.starAmt; u.sunSize.value = s.sunSize; u.stripes.value = s.stripes || 0;
}

/* ---------- buildings: lit windows drawn in the shader, so any size of tower looks right ---------- */
const BLD_VERT = `
varying vec3 vW; varying vec3 vN; varying float vSeed;
#include <fog_pars_vertex>
void main(){
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = wp.xyz; vN = normalize(mat3(instanceMatrix) * normal);
  vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const BLD_FRAG = `
uniform vec3 base, win, win2; uniform float lit, winW, winH;
varying vec3 vW; varying vec3 vN; varying float vSeed;
#include <fog_pars_fragment>
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 c = base;
  float shade = 0.75 + 0.25 * max(dot(vN, normalize(vec3(-0.3, 0.8, 0.5))), 0.0);
  if (abs(vN.y) < 0.5) {
    float u = abs(vN.x) > 0.5 ? vW.z : vW.x;
    vec2 g = vec2(u / winW, vW.y / winH); vec2 cl = floor(g), f = fract(g);
    float isWin = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.78);
    float floorLit = step(1.0 - lit, h2(vec2(cl.y, vSeed * 51.0)) * 0.5 + h2(cl + vSeed * 91.0) * 0.5);
    vec3 wc = mix(win, win2, h2(cl * 1.7 + vSeed)) * (0.55 + 0.6 * h2(cl + 3.0));
    c = mix(base * shade, wc, isWin * floorLit);
    c = mix(c, base * 0.5, smoothstep(6.0, 0.0, vW.y) * 0.6);
  } else c = base * 0.6;
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;
function buildingMaterial(theme, winW = 3.2, winH = 3.8, litMul = 1) {
  return new T.ShaderMaterial({
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {
      base: { value: col(theme.bld || "#141420") }, win: { value: col(theme.win || "#ffd27a") }, win2: { value: col(theme.win2 || "#ffffff") },
      lit: { value: (theme.lit == null ? 0.4 : theme.lit) * litMul }, winW: { value: winW }, winH: { value: winH }
    }]),
    vertexShader: BLD_VERT, fragmentShader: BLD_FRAG, fog: true
  });
}

/* ---------- terrain shapes per place ---------- */
function heightFn(biome, L) {
  const far = z => smooth(110, 380, Math.abs(z));
  switch (biome) {
    case "nyc": case "tokyo": {
      const fuji = biome === "tokyo";
      return (x, z) => {
        if (!fuji && z > 270 && z < 430) return -8; // the river
        let h = far(z) * fbm(x * 0.003, z * 0.003) * 6;
        if (fuji) { const d = Math.hypot(x - L * 0.55, z + 1250); if (d < 800) h += 430 * Math.pow(1 - d / 800, 1.7); }
        return h;
      };
    }
    case "valley": return (x, z) => z > 650 ? -8 : far(z) * Math.max(0, fbm(x * 0.0025, z * 0.0025) - 0.28) * 330;
    case "dream": return (x, z) => far(z) * Math.max(0, fbm(x * 0.002, z * 0.0024) - 0.22) * 300;
    case "suburb": return (x, z) => far(z) * fbm(x * 0.004, z * 0.004) * 16;
    case "cyber": return (x, z) => { const f = smooth(320, 700, Math.abs(z)); const r = 1 - Math.abs(2 * vnoise(x * 0.004, z * 0.004) - 1); return f * Math.pow(r, 2) * 380 * (0.5 + fbm(x * 0.002, z * 0.002)); };
    case "texas": return (x, z) => { const n = fbm(x * 0.0035, z * 0.0035); return far(z) * (smooth(0.5, 0.54, n) * 60 + n * 8); };
    case "hawaii": return (x, z) => {
      if (z > 200) return -6 - (z - 200) * 0.06;
      if (z < -120) { const d = -z - 120; return Math.min(420, d * 0.42) * (0.85 + 0.3 * fbm(x * 0.003, z * 0.003)); }
      return 0;
    };
  }
  return () => 0;
}
const HAS_WATER = { nyc: true, valley: true, hawaii: true };

/* ---------- canvas textures ---------- */
function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
function particleTexture(kind) {
  return canvasTex(64, 64, (g, w, h) => {
    g.translate(32, 32);
    if (kind === "paper") { g.fillStyle = "#f6f0e0"; g.fillRect(-26, -7, 52, 14); g.fillStyle = "#9a8f78"; for (let i = -22; i < 22; i += 7) g.fillRect(i, -2, 4, 3); }
    else if (kind === "dot") { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(-32, -32, 64, 64); }
    else if (kind === "streak") { const gr = g.createLinearGradient(0, -30, 0, 30); gr.addColorStop(0, "rgba(200,220,255,0)"); gr.addColorStop(1, "rgba(200,220,255,.9)"); g.fillStyle = gr; g.fillRect(-1.5, -30, 3, 60); }
    else if (kind === "coin") { g.fillStyle = "#c98a12"; g.beginPath(); g.arc(0, 0, 28, 0, 7); g.fill(); g.fillStyle = "#ffcf4a"; g.beginPath(); g.arc(0, 0, 23, 0, 7); g.fill(); g.fillStyle = "#b5730a"; g.font = "bold 34px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("₿", 0, 2); }
    else if (kind === "petal") { g.rotate(0.6); g.fillStyle = "#ffc4dc"; g.beginPath(); g.ellipse(0, 0, 26, 14, 0, 0, 7); g.fill(); g.fillStyle = "#ff9cc4"; g.beginPath(); g.ellipse(-8, 0, 10, 5, 0, 0, 7); g.fill(); }
    else if (kind === "star") { g.fillStyle = "#fff"; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 30, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); }
    else if (kind === "rocket") {
      g.rotate(-0.5); g.fillStyle = "#ff8a2a"; g.beginPath(); g.moveTo(-7, 14); g.lineTo(0, 30); g.lineTo(7, 14); g.fill();
      g.fillStyle = "#e8ecf8"; g.fillRect(-8, -14, 16, 28); g.fillStyle = "#ff3d5a"; g.beginPath(); g.moveTo(-8, -14); g.lineTo(0, -30); g.lineTo(8, -14); g.fill();
      g.beginPath(); g.moveTo(-8, 6); g.lineTo(-16, 16); g.lineTo(-8, 14); g.fill(); g.beginPath(); g.moveTo(8, 6); g.lineTo(16, 16); g.lineTo(8, 14); g.fill();
      g.fillStyle = "#59d0ff"; g.beginPath(); g.arc(0, -4, 4, 0, 7); g.fill();
    }
    else if (kind === "diamond") { g.fillStyle = "#8ff3ff"; g.beginPath(); g.moveTo(0, -26); g.lineTo(22, -6); g.lineTo(0, 28); g.lineTo(-22, -6); g.closePath(); g.fill(); g.fillStyle = "#e8fdff"; g.beginPath(); g.moveTo(0, -26); g.lineTo(10, -6); g.lineTo(-10, -6); g.fill(); }
    else { // text glyphs for the dot-com era
      g.font = "bold " + (kind.length > 2 ? 22 : 40) + "px Verdana, Tahoma, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.shadowColor = "#4fd2ff"; g.shadowBlur = 10; g.fillStyle = kind === "@" ? "#a6ff4d" : "#bff1ff"; g.fillText(kind, 0, 2);
    }
  });
}

/* ---------- floating particles that drift past the rider ---------- */
const PARTICLES = {
  ticker: { tex: ["paper"], n: 700, size: 1.1, vel: [0.4, -2.4, 0], wob: 1.2, box: [170, 80, 120] },
  glyphs: { tex: ["@", ".com", "www", "e-"], n: 160, size: 5, vel: [0, 0.4, 0], wob: 0.8, add: true, box: [260, 120, 200] },
  rain: { tex: ["streak"], n: 1800, size: 1.8, vel: [-2, -38, 0], wob: 0, add: true, opacity: 0.45, box: [130, 70, 100] },
  dust: { tex: ["dot"], n: 600, size: 0.7, vel: [0, -0.15, 0], wob: 0.5, add: true, opacity: 0.7, tint: "#bff7ea", box: [150, 70, 110] },
  coins: { tex: ["coin"], n: 220, size: 3.2, vel: [0, -1.2, 0], wob: 0.6, box: [220, 110, 180] },
  rocket: { tex: ["rocket", "diamond"], n: 170, size: 3.6, vel: [0, 4, 0], wob: 0.4, box: [240, 120, 200] },
  petals: { tex: ["petal"], n: 900, size: 1.15, vel: [-1.2, -1.5, 0.5], wob: 1.6, box: [150, 80, 110] },
  glitter: { tex: ["star"], n: 520, size: 1.6, vel: [0, -0.5, 0], wob: 0.5, add: true, box: [170, 90, 130] },
  embers: { tex: ["dot"], n: 450, size: 1.0, vel: [0, 1.3, 0], wob: 0.7, add: true, tint: "#ffb070", box: [150, 80, 110] }
};
function makeParticles(kind) {
  const spec = PARTICLES[kind]; if (!spec) return null;
  const group = new T.Group(), systems = [];
  spec.tex.forEach(tk => {
    const n = Math.floor(spec.n / spec.tex.length), pos = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * spec.box[0]; pos[i * 3 + 1] = Math.random() * spec.box[1]; pos[i * 3 + 2] = (Math.random() - 0.5) * spec.box[2]; ph[i] = Math.random() * 100; }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const mat = new T.PointsMaterial({ map: particleTexture(tk), size: spec.size, sizeAttenuation: true, transparent: true, depthWrite: false, opacity: spec.opacity || 1, color: col(spec.tint || "#ffffff"), blending: spec.add ? T.AdditiveBlending : T.NormalBlending, alphaTest: spec.add ? 0 : 0.05 });
    const pts = new T.Points(geo, mat); pts.frustumCulled = false; group.add(pts);
    systems.push({ pos, ph, n, geo, seeded: false });
  });
  return {
    group,
    update(dt, time, center) {
      const [bx, by, bz] = spec.box, [vx, vy, vz] = spec.vel, w = spec.wob;
      systems.forEach(s => {
        const p = s.pos;
        for (let i = 0; i < s.n; i++) {
          const k = i * 3;
          if (!s.seeded) { p[k] += center.x; p[k + 1] += center.y - by * 0.4; p[k + 2] += center.z; }
          const ph = s.ph[i];
          p[k] += (vx + Math.sin(time * 0.7 + ph) * w) * dt;
          p[k + 1] += vy * dt;
          p[k + 2] += (vz + Math.cos(time * 0.6 + ph * 1.3) * w) * dt;
          let lx = p[k] - center.x, ly = p[k + 1] - (center.y - by * 0.4), lz = p[k + 2] - center.z;
          if (lx > bx / 2) p[k] -= bx; else if (lx < -bx / 2) p[k] += bx;
          if (ly > by) p[k + 1] -= by; else if (ly < 0) p[k + 1] += by;
          if (lz > bz / 2) p[k + 2] -= bz; else if (lz < -bz / 2) p[k + 2] += bz;
        }
        s.seeded = true;
        s.geo.attributes.position.needsUpdate = true;
      });
    }
  };
}

/* ---------- story billboards ---------- */
function wrap(g, text, maxW) {
  const words = text.split(" "), lines = []; let line = "";
  words.forEach(wd => { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > maxW && line) { lines.push(line); line = wd; } else line = t; });
  if (line) lines.push(line); return lines;
}
function drawBoard(g, W, H, st, kicker, title, body) {
  g.fillStyle = st.bg; g.fillRect(0, 0, W, H);
  if (st.grid) { g.strokeStyle = st.accent + "22"; g.lineWidth = 1; for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
  if (st.bevel) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#c9d6f2"); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = st.accent; g.fillRect(0, 0, W, 56); g.fillStyle = "#fff"; g.font = '700 26px Verdana, sans-serif'; g.textBaseline = "middle"; g.fillText("●  ●  ●   " + kicker, 24, 29); }
  if (st.breaking) { g.fillStyle = st.accent; g.fillRect(0, H - 92, 260, 60); g.fillStyle = "#fff"; g.font = '700 34px "Instrument Sans", Arial, sans-serif'; g.textBaseline = "middle"; g.fillText("BREAKING", 26, H - 61); }
  const pad = 54; let y = st.bevel ? 120 : 92;
  g.textBaseline = "alphabetic";
  if (!st.bevel) { g.fillStyle = st.accent; g.font = st.kicker; g.fillText(kicker.toUpperCase(), pad, y - 22); }
  if (st.rule) { g.fillStyle = st.fg; g.fillRect(pad, y - 8, W - pad * 2, 3); g.fillRect(pad, y - 2, W - pad * 2, 1); }
  // title: shrink until it fits in two lines
  let size = parseInt(/(\d+)px/.exec(st.title)[1], 10), lines;
  for (;;) { g.font = st.title.replace(/\d+px/, size + "px"); lines = wrap(g, title, W - pad * 2); if (lines.length <= 2 || size < 40) break; size -= 4; }
  if (st.glow) { g.shadowColor = st.accent; g.shadowBlur = 24; }
  g.fillStyle = st.fg;
  lines.slice(0, 2).forEach(l => { y += size * 0.98; g.fillText(l, pad, y); });
  g.shadowBlur = 0;
  y += 22;
  if (st.rule) { g.fillStyle = st.fg; g.fillRect(pad, y - 6, W - pad * 2, 1); y += 10; }
  g.font = st.body; g.fillStyle = st.fg; g.globalAlpha = 0.92;
  const bs = parseInt(/(\d+)px/.exec(st.body)[1], 10);
  wrap(g, body, W - pad * 2).slice(0, 5).forEach(l => { y += bs * 1.3; g.fillText(l, pad, y); });
  g.globalAlpha = 1;
  if (st.scan) { g.fillStyle = "rgba(0,0,0,.25)"; for (let s = 0; s < H; s += 4) g.fillRect(0, s, W, 2); }
  g.strokeStyle = st.accent; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
}
function makeBoard(styleKey, kicker, title, body) {
  const st = CC.BOARDS[styleKey] || CC.BOARDS.neon;
  const tex = canvasTex(1024, 600, (g, W, H) => drawBoard(g, W, H, st, kicker, title, body));
  const mat = new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide, fog: true });
  const m = new T.Mesh(new T.PlaneGeometry(17, 10), mat);
  return m;
}

/* ---------- scenery pieces ---------- */
function instanced(geo, mat, list, group) {
  if (!list.length) return null;
  const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  list.forEach((b, i) => { e.set(0, b.ry || 0, 0); q.setFromEuler(e); m4.compose(new T.Vector3(b.x, b.y, b.z), q, new T.Vector3(b.sx, b.sy, b.sz)); im.setMatrixAt(i, m4); });
  im.instanceMatrix.needsUpdate = true; group.add(im); return im;
}
const boxBase = () => new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
function okSpot(z) { return Math.abs(z) > 50 && !(z < -52 && z > -88); }

function cityBlocks(rng, h, X0, X1, regions, deco) {
  const list = [], tops = [], spires = [], beacons = [];
  regions.forEach(r => {
    for (let i = 0; i < r.n; i++) {
      const x = X0 + rng() * (X1 - X0), z = r.z0 + rng() * (r.z1 - r.z0);
      if (!okSpot(z)) continue;
      const gh = h(x, z); if (gh < -1) continue;
      const boost = 0.45 + 1.3 * fbm(x * 0.004 + 3, z * 0.004 - 2);
      const H = (r.hMin + (r.hMax - r.hMin) * Math.pow(rng(), 2.2)) * boost;
      const w = r.wMin + rng() * (r.wMax - r.wMin), d = r.wMin + rng() * (r.wMax - r.wMin);
      list.push({ x, y: gh - 1, z, sx: w, sy: H, sz: d });
      if (deco && H > 60) {
        tops.push({ x, y: gh - 1 + H, z, sx: w * 0.62, sy: H * 0.16, sz: d * 0.62 });
        if (rng() < 0.6) spires.push({ x, y: gh - 1 + H * 1.16, z, sx: w * 0.14, sy: H * 0.28, sz: w * 0.14 });
      }
      if (H > 85) beacons.push(x, gh + H * (deco ? 1.2 : 1) + 1, z);
    }
  });
  return { list, tops, spires, beacons };
}

function stationProp(kind, group, tr) {
  const LEAD = CC.LEAD;
  if (kind === "exchange") {
    // a columned stone exchange hall beside the station
    const g = new T.Group(), stone = new T.MeshStandardMaterial({ color: 0xd9d2c2, roughness: 0.8, emissive: 0x2a2418 });
    const steps = new T.Mesh(new T.BoxGeometry(46, 3, 16), stone); steps.position.y = 1.5; g.add(steps);
    const back = new T.Mesh(new T.BoxGeometry(44, 26, 8), stone); back.position.set(0, 16, 4); g.add(back);
    for (let i = 0; i < 6; i++) { const c = new T.Mesh(new T.CylinderGeometry(1.1, 1.3, 20, 12), stone); c.position.set(-17.5 + i * 7, 13, -3); g.add(c); }
    const ent = new T.Mesh(new T.BoxGeometry(46, 3, 12), stone); ent.position.set(0, 24.5, 0); g.add(ent);
    const ped = new T.Mesh(new T.CylinderGeometry(1, 1, 46, 3), stone); ped.rotation.z = Math.PI / 2; ped.scale.set(6, 1, 1.6); ped.position.set(0, 29, -1); g.add(ped);
    const flag = new T.Mesh(new T.PlaneGeometry(5, 3), new T.MeshBasicMaterial({ color: 0xb22234, side: T.DoubleSide })); flag.position.set(0, 38, 0); g.add(flag);
    const pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 9), stone); pole.position.set(-2.5, 34.5, 0); g.add(pole);
    g.position.set(-LEAD * 0.55, 0, 38); g.rotation.y = Math.PI; group.add(g);
    const lamp = new T.PointLight(0xffd59a, 1.2, 80); lamp.position.set(-LEAD * 0.55, 10, 20); group.add(lamp);
  } else if (kind === "torii") {
    const red = new T.MeshStandardMaterial({ color: 0xd8321e, roughness: 0.6, emissive: 0x3a0800 }), dark = new T.MeshStandardMaterial({ color: 0x1a1414 });
    const g = new T.Group(), y0 = tr.py[0] - 1.2;
    [-3.6, 3.6].forEach(z => { const p = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 10, 12), red); p.position.set(0, 5, z); g.add(p); });
    const kasagi = new T.Mesh(new T.BoxGeometry(1, 0.8, 11), dark); kasagi.position.y = 10.4; g.add(kasagi);
    const shimaki = new T.Mesh(new T.BoxGeometry(0.9, 0.7, 10.2), red); shimaki.position.y = 9.7; g.add(shimaki);
    const nuki = new T.Mesh(new T.BoxGeometry(0.6, 0.6, 9.4), red); nuki.position.y = 7.6; g.add(nuki);
    g.position.set(-LEAD * 0.15, y0, 0); group.add(g);
  } else if (kind === "observatory") {
    const white = new T.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.4, emissive: 0x1a1c22 });
    [[-LEAD * 0.4, 34, 7], [10, -40, 5], [60, 44, 4]].forEach(([x, z, r]) => {
      const base = new T.Mesh(new T.CylinderGeometry(r, r, r * 0.9, 20), white); base.position.set(x, r * 0.45, z); group.add(base);
      const dome = new T.Mesh(new T.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.position.set(x, r * 0.9, z); group.add(dome);
    });
    const mast = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 30), white); mast.position.set(-LEAD * 0.4 + 14, 15, 30); group.add(mast);
  }
}

/* ---------- build the whole world for a theme ---------- */
function buildWorld(theme, tr) {
  const group = new T.Group(), animators = [], rng = mulberry(tr.L * 7 + theme.biome.length * 101);
  const L = tr.L, X0 = -CC.LEAD - 650, X1 = L + CC.RUNOUT + 650, scale = L / 2000;
  const h = heightFn(theme.biome, L);

  // terrain
  {
    const W = X1 - X0, D = 3200, sx = Math.min(320, Math.round(W / 20)), sz = 160;
    const geo = new T.PlaneGeometry(W, D, sx, sz); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, 0);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
    const lo = col(theme.ground[0]), hi = col(theme.ground[1]), snow = col("#e9eef8"), tmp = new T.Color();
    const snowLine = theme.biome === "tokyo" ? 250 : theme.biome === "hawaii" ? 360 : 9999;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = h(x, z);
      pos.setY(i, y);
      const t = clamp01(y / 120) * 0.75 + fbm(x * 0.01, z * 0.01) * 0.35;
      tmp.copy(lo).lerp(hi, clamp01(t));
      if (y > snowLine) tmp.lerp(snow, smooth(snowLine, snowLine + 40, y));
      if (y < -1) tmp.multiplyScalar(0.5);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    group.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
    if (theme.grid) {
      const wire = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col(theme.grid), wireframe: true, transparent: true, opacity: 0.28, fog: true }));
      wire.position.y = 0.15; group.add(wire);
    }
    if (HAS_WATER[theme.biome]) {
      const water = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshPhongMaterial({ color: col(theme.water || "#0b2240"), emissive: col(theme.sky.hor).multiplyScalar(0.12), specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.92 }));
      water.rotation.x = -Math.PI / 2; water.position.set((X0 + X1) / 2, -1.5, 0); group.add(water);
    }
  }

  // cities
  const city = (regions, deco, litMul) => {
    const c = cityBlocks(rng, h, X0, X1, regions, deco), mat = buildingMaterial(theme, 3.2, 3.8, litMul);
    instanced(boxBase(), mat, c.list, group);
    if (c.tops.length) instanced(boxBase(), mat, c.tops, group);
    if (c.spires.length) instanced(new T.ConeGeometry(0.5, 1, 4).translate(0, 0.5, 0), new T.MeshStandardMaterial({ color: 0xc9ccd6, metalness: 0.8, roughness: 0.3, emissive: 0x222018 }), c.spires, group);
    if (c.beacons.length) {
      const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(c.beacons, 3));
      const m = new T.PointsMaterial({ color: 0xff3344, size: 3, sizeAttenuation: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, map: particleTexture("dot") });
      group.add(new T.Points(g, m));
      animators.push((dt, t) => { m.opacity = 0.25 + 0.75 * (Math.sin(t * 3) > 0.2 ? 1 : 0.15); });
    }
  };
  const b = theme.biome;
  if (b === "nyc" || b === "tokyo") {
    const n = k => Math.round(k * scale);
    city([
      { z0: 55, z1: 105, n: n(150), hMin: 6, hMax: 26, wMin: 8, wMax: 16 },
      { z0: 110, z1: 255, n: n(700), hMin: 15, hMax: 150, wMin: 10, wMax: 26 },
      { z0: 440, z1: 900, n: n(450), hMin: 12, hMax: 80, wMin: 12, wMax: 30 },
      { z0: -540, z1: -100, n: n(900), hMin: 25, hMax: 230, wMin: 12, wMax: 30 },
      { z0: -900, z1: -540, n: n(250), hMin: 20, hMax: 110, wMin: 14, wMax: 30 }
    ], !!theme.deco, 1);
  } else if (b === "valley") {
    city([{ z0: 90, z1: 560, n: Math.round(120 * scale), hMin: 6, hMax: 24, wMin: 25, wMax: 60 }, { z0: -520, z1: -100, n: Math.round(110 * scale), hMin: 6, hMax: 30, wMin: 25, wMax: 60 }], false, 1);
  } else if (b === "suburb") {
    const houses = [], roofs = [], signs = [];
    for (let x = X0 + 200; x < X1 - 200; x += 20) {
      [70, 94, 118, 142, 166, 190, 214, 238, -110, -134, -158, -182, -206].forEach(z => {
        if (rng() < 0.12) return;
        const xx = x + (rng() - 0.5) * 5, zz = z + (rng() - 0.5) * 4, gh = h(xx, zz), w = 9 + rng() * 4, d = 7 + rng() * 3, hh = 5 + rng() * 3;
        houses.push({ x: xx, y: gh - 0.5, z: zz, sx: w, sy: hh, sz: d });
        roofs.push({ x: xx, y: gh - 0.5 + hh, z: zz, sx: w * 1.05, sy: 3 + rng() * 2, sz: d * 1.1 });
        if (theme.signs && z === 70 && rng() < 0.35 && x > 0 && x < L) signs.push([xx, gh, zz - 6]);
      });
    }
    instanced(boxBase(), buildingMaterial(theme, 2.6, 2.8, 1), houses, group);
    instanced(new T.ConeGeometry(0.7071, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), new T.MeshStandardMaterial({ color: 0x2a2226, roughness: 0.9 }), roofs, group);
    if (signs.length) {
      const sTex = ["FORECLOSURE", "BANK OWNED", "FOR SALE"].map(txt => canvasTex(256, 128, (g) => { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#c4161c"; g.fillRect(0, 0, 256, 34); g.fillStyle = "#fff"; g.font = "700 24px Arial, sans-serif"; g.textAlign = "center"; g.fillText("NOTICE", 128, 26); g.fillStyle = "#1a1a1a"; g.font = "800 " + (txt.length > 10 ? 28 : 34) + "px Arial, sans-serif"; g.fillText(txt, 128, 90); }));
      const post = new T.MeshStandardMaterial({ color: 0xf0f0f0 });
      signs.forEach(([x, gy, z], i) => {
        const sp = new T.Mesh(new T.PlaneGeometry(3.4, 1.7), new T.MeshBasicMaterial({ map: sTex[i % 3], side: T.DoubleSide, fog: true }));
        sp.position.set(x, gy + 2.6, z); sp.rotation.y = -Math.PI / 2 + 0.6; group.add(sp);
        const p = new T.Mesh(new T.BoxGeometry(0.15, 2, 0.15), post); p.position.set(x, gy + 1, z); group.add(p);
      });
    }
    if (theme.city) city([{ z0: -950, z1: -480, n: Math.round(320 * scale), hMin: 30, hMax: 200, wMin: 14, wMax: 30 }], false, 1);
    if (theme.rockets) {
      // little rockets lifting off from the suburbs: to the moon
      const body = new T.CylinderGeometry(1.2, 1.2, 8, 12), nose = new T.ConeGeometry(1.2, 3, 12), fin = new T.BoxGeometry(0.2, 2.4, 2.2);
      const white = new T.MeshStandardMaterial({ color: 0xeef1f8, roughness: 0.5, emissive: 0x222630 }), red = new T.MeshStandardMaterial({ color: 0xff3d5a, emissive: 0x400010 });
      const flameTex = particleTexture("dot");
      for (let i = 0; i < 14; i++) {
        const r = new T.Group();
        r.add(new T.Mesh(body, white));
        const nc = new T.Mesh(nose, red); nc.position.y = 5.5; r.add(nc);
        [0, 1, 2].forEach(k => { const f = new T.Mesh(fin, red); f.position.set(Math.cos(k * 2.1) * 1.3, -3, Math.sin(k * 2.1) * 1.3); f.rotation.y = -k * 2.1; r.add(f); });
        const fl = new T.Sprite(new T.SpriteMaterial({ map: flameTex, color: 0xff9a3a, blending: T.AdditiveBlending, transparent: true, depthWrite: false })); fl.scale.set(6, 12, 1); fl.position.y = -8; r.add(fl);
        const x0 = rng() * L, z0 = (rng() < 0.5 ? -1 : 1) * (130 + rng() * 380), sp = 10 + rng() * 14;
        r.position.set(x0, rng() * 500, z0); group.add(r);
        animators.push((dt, t) => { r.position.y += sp * dt; r.rotation.y += dt * 0.4; fl.scale.y = 10 + Math.sin(t * 30 + i) * 3; if (r.position.y > 700) r.position.y = -10; });
      }
    }
  } else if (b === "cyber") {
    // floating blockchains: glowing linked cubes
    [[-300, "#4dffb0", 0], [320, "#ff5ccf", 1.7]].forEach(([zc, c, off]) => {
      const pts = [], cubeGeo = new T.BoxGeometry(14, 14, 14), edge = new T.EdgesGeometry(cubeGeo);
      const lm = new T.LineBasicMaterial({ color: col(c), transparent: true, opacity: 0.9 }), fm = new T.MeshBasicMaterial({ color: col(c), transparent: true, opacity: 0.12, depthWrite: false });
      for (let x = X0 + 300; x < X1 - 300; x += 70) {
        const y = 110 + Math.sin(x * 0.01 + off) * 40, z = zc + Math.sin(x * 0.006 + off) * 60;
        const cube = new T.Group(); cube.add(new T.LineSegments(edge, lm)); cube.add(new T.Mesh(cubeGeo, fm));
        cube.position.set(x, y, z); group.add(cube); pts.push(new T.Vector3(x, y, z));
        const ph = x * 0.03; animators.push((dt, t) => { cube.rotation.y = t * 0.3 + ph; cube.rotation.x = t * 0.2 + ph; });
      }
      group.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: col(c), transparent: true, opacity: 0.5 })));
    });
    // data pillars
    const pillars = [];
    for (let i = 0; i < 260 * scale; i++) { const x = X0 + rng() * (X1 - X0), z = (rng() < 0.5 ? -1 : 1) * (120 + rng() * 700); if (!okSpot(z)) continue; pillars.push({ x, y: 0, z, sx: 2 + rng() * 3, sy: 20 + Math.pow(rng(), 2) * 220, sz: 2 + rng() * 3 }); }
    instanced(boxBase(), new T.MeshBasicMaterial({ color: 0x8a5cff, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false }), pillars, group);
  } else if (b === "texas") {
    const derricks = [];
    for (let i = 0; i < 110 * scale; i++) { const x = X0 + rng() * (X1 - X0), z = (rng() < 0.5 ? -1 : 1) * (95 + rng() * 650); if (!okSpot(z)) continue; derricks.push({ x, y: h(x, z) - 0.5, z, sx: 5, sy: 26 + rng() * 14, sz: 5, ry: rng() }); }
    instanced(new T.ConeGeometry(1, 1, 4, 4, true).translate(0, 0.5, 0), new T.MeshBasicMaterial({ color: 0xffb070, wireframe: true, fog: true }), derricks, group);
    city([{ z0: -980, z1: -700, n: Math.round(60 * scale), hMin: 30, hMax: 160, wMin: 14, wMax: 30 }], false, 1);
  }

  // trees and plants along the line
  const trees = (kind, every, zMin, zMax) => {
    const trunks = [], crowns = [];
    for (let x = X0 + 400; x < X1 - 400; x += every) {
      [1, -1].forEach(sgn => {
        if (rng() < 0.35) return;
        const z = sgn * (zMin + rng() * (zMax - zMin)), xx = x + (rng() - 0.5) * every, gy = h(xx, z);
        if (gy < -0.5) return;
        const th = kind === "palm" ? 9 + rng() * 6 : kind === "cactus" ? 3 + rng() * 4 : 4 + rng() * 2;
        trunks.push({ x: xx, y: gy, z, sx: 1, sy: th, sz: 1 });
        if (kind === "palm") crowns.push({ x: xx, y: gy + th, z, sx: 4.5, sy: 1.4, sz: 4.5, ry: rng() * 3 });
        if (kind === "cherry") crowns.push({ x: xx, y: gy + th + 1.5, z, sx: 4.5 + rng(), sy: 3.4, sz: 4.5 + rng() });
      });
    }
    const trunkMat = new T.MeshLambertMaterial({ color: kind === "cactus" ? 0x2f6b3a : 0x3a2a22 });
    instanced(new T.CylinderGeometry(kind === "cactus" ? 0.55 : 0.25, kind === "cactus" ? 0.6 : 0.4, 1, 6).translate(0, 0.5, 0), trunkMat, trunks, group);
    if (crowns.length) {
      const cm = kind === "palm" ? new T.MeshLambertMaterial({ color: 0x1f5a3a, emissive: 0x06140c }) : new T.MeshLambertMaterial({ color: 0xffb6d5, emissive: 0x6a2440 });
      instanced(new T.IcosahedronGeometry(1, kind === "palm" ? 0 : 1), cm, crowns, group);
    }
  };
  if (b === "valley" || b === "hawaii") trees("palm", 22, 26, 48);
  if (b === "tokyo" || b === "dream") trees("cherry", 16, 24, 48);
  if (b === "texas") trees("cactus", 14, 24, 48);

  if (theme.station) stationProp(theme.station, group, tr);

  if (theme.disco) {
    // a disco ball hanging in the sky, always ahead and to the side
    const geo = new T.IcosahedronGeometry(30, 2).toNonIndexed(), n = geo.attributes.position.count, cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) { const v = 0.45 + Math.random() * 0.55; for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = v; cols[(i + k) * 3 + 1] = v * 0.97; cols[(i + k) * 3 + 2] = v * 1.05; } }
    geo.setAttribute("color", new T.BufferAttribute(cols, 3));
    const ball = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, fog: false }));
    ball.userData.follow = new T.Vector3(520, 240, -260); group.add(ball);
    animators.push((dt, t) => { ball.rotation.y = t * 0.35; });
    const rays = new T.Group();
    for (let i = 0; i < 6; i++) {
      const ray = new T.Mesh(new T.ConeGeometry(16, 420, 16, 1, true).translate(0, -210, 0), new T.MeshBasicMaterial({ color: [0xff6ad5, 0x6ad5ff, 0xffd56a][i % 3], transparent: true, opacity: 0.06, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
      ray.rotation.set(0.5 + (i % 3) * 0.25, 0, i * 1.05); rays.add(ray);
    }
    ball.add(rays);
  }

  return { group, animators };
}

CC.World = { createSky, applySky, buildWorld, makeParticles, makeBoard, disposeTree, particleTexture };
})();
