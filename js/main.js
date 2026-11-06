/* Chart Coaster: track building, ride physics, HUD and controls. */
(() => {
"use strict";

const DAY = 86400000;
const parseDate = s => { const t = Date.parse(s.trim().length <= 10 ? s.trim() + "T00:00:00Z" : s.trim()); return isNaN(t) ? null : t / DAY; };
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = (day, coarse) => {
  const d = new Date(day * DAY);
  return coarse ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};
function fmtVal(v, unit) {
  const abs = Math.abs(v);
  const dp = abs < 10 ? 2 : abs < 1000 ? (unit === "ppm" ? 1 : 1) : 0;
  const n = v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  if (unit === "$") return "$" + n;
  if (unit === "¥") return "¥" + n;
  if (unit === "ppm") return n + " ppm";
  if (unit === "pts") return n;
  return n + (unit ? " " + unit : "");
}
const maxDrawdown = vals => { let pk = -Infinity, dd = 0; for (const v of vals) { pk = Math.max(pk, v); dd = Math.min(dd, v / pk - 1); } return dd; };
const pct = v => (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1) + "%";

/* ------------------------------------------------------------------ */
/* Track building                                                      */
/* ------------------------------------------------------------------ */
const H = 130, BASE = 16, LEAD = 50, RUNOUT = 70, DS = 0.5;
CC.LEAD = LEAD; CC.RUNOUT = RUNOUT;
const DATASETS = CC.DATASETS, THEMES = CC.THEMES, World = CC.World, Music = CC.Music;
const themeOf = ds => THEMES[ds.theme] || THEMES.dream;

// Monotone cubic (Fritsch–Carlson): smooth, but never overshoots the data.
function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    let lo = 0, hi = n - 1;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] > x) hi = mid; else lo = mid; }
    const h = xs[hi] - xs[lo], t = (x - xs[lo]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * m[lo] + (-2 * t3 + 3 * t2) * ys[hi] + (t3 - t2) * h * m[hi];
  };
}

function buildTrack(ds, useLog) {
  const L = ds.len || 2000;
  const raw = ds.pts.map((p, i) => [ds.dated === false ? i : parseDate(p[0]), p[1]]);
  const t0 = raw[0][0], t1 = raw[raw.length - 1][0], span = Math.max(1e-9, t1 - t0);
  const vals = raw.map(p => p[1]);
  const vMin = Math.min(...vals), vMax = Math.max(...vals);
  const canLog = useLog && vMin > 0;
  const tf = v => canLog ? Math.log(v) : v;
  const lo = tf(vMin), hi = tf(vMax), rng = Math.max(1e-9, hi - lo);
  const toY = v => BASE + (tf(v) - lo) / rng * H;
  const fromY = y => { const u = (y - BASE) / H * rng + lo; return canLog ? Math.exp(u) : u; };

  // keypoints in world x/y (dedupe identical x)
  const xs = [-LEAD], ys = [toY(vals[0])];
  raw.forEach(([t, v]) => {
    const x = (t - t0) / span * L;
    if (x - xs[xs.length - 1] < 1e-6) { ys[ys.length - 1] = toY(v); return; }
    xs.push(x); ys.push(toY(v));
  });
  xs.push(L + RUNOUT); ys.push(ys[ys.length - 1]);
  // flat station before the first data point
  xs.splice(1, 0, -LEAD * 0.4); ys.splice(1, 0, ys[0]);
  const f = monotone(xs, ys);

  // dense polyline by x, then resample by arc length
  const gx = [], gy = [], cum = [0];
  for (let x = -LEAD; x <= L + RUNOUT + 1e-6; x += 0.25) { gx.push(x); gy.push(f(x)); }
  for (let i = 1; i < gx.length; i++) cum.push(cum[i - 1] + Math.hypot(gx[i] - gx[i - 1], gy[i] - gy[i - 1]));
  const total = cum[cum.length - 1];
  const N = Math.floor(total / DS) + 1;
  const px = new Float32Array(N), py = new Float32Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = i * DS;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const u = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    px[i] = gx[j] + (gx[j + 1] - gx[j]) * u;
    py[i] = gy[j] + (gy[j + 1] - gy[j]) * u;
  }
  // tangent angle and curvature, lightly smoothed
  const angRaw = new Float32Array(N), ang = new Float32Array(N), kapRaw = new Float32Array(N), kap = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2);
    angRaw[i] = Math.atan2(py[b] - py[a], px[b] - px[a]);
  }
  smooth(angRaw, ang, 4);
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2);
    kapRaw[i] = (ang[b] - ang[a]) / Math.max(DS, (b - a) * DS);
  }
  smooth(kapRaw, kap, 6);

  // locate events and the end of data along s
  const sAtX = x => { let k = 0; while (k < N - 1 && px[k] < x) k++; return k * DS; };
  const events = (ds.events || []).map(([d, label]) => {
    const t = parseDate(d); if (t == null || t < t0 || t > t1) return null;
    const x = (t - t0) / span * L; const k = Math.round(sAtX(x) / DS);
    return { s: k * DS, x, y: py[k], label, date: t };
  }).filter(Boolean);
  const stories = (ds.story || []).map(([d, title, body]) => {
    const t = parseDate(d); if (t == null || t < t0 - 1 || t > t1 + 1) return null;
    const x = Math.max(0, Math.min(L, (t - t0) / span * L)); const k = Math.round(sAtX(x) / DS);
    return { s: k * DS, x, y: py[k], title, body, date: t };
  }).filter(Boolean).sort((a, b) => a.s - b.s);
  // a gate's toast is skipped when a story card covers the same moment
  events.forEach(e => { e.quiet = stories.some(st => Math.abs(st.date - e.date) < 4); });

  return {
    stories, sAtX,
    ds, L, N, px, py, ang, kap, total: (N - 1) * DS, t0, t1, span, vMin, vMax, canLog,
    toY, fromY, events, sDataEnd: sAtX(L), sDataStart: sAtX(0),
    timeAt: x => t0 + Math.min(1, Math.max(0, x / L)) * span,
    dated: ds.dated !== false
  };
}
function smooth(src, dst, r) {
  const N = src.length; let acc = 0, cnt = 0;
  for (let i = -r; i < N + r; i++) {
    const add = i + r, rem = i - r - 1;
    if (add < N && add >= 0) { acc += src[add]; cnt++; }
    if (rem >= 0 && rem < N) { acc -= src[rem]; cnt--; }
    if (i >= 0 && i < N) dst[i] = acc / cnt;
  }
}
function sample(tr, s) {
  const f = Math.min(tr.N - 1.0001, Math.max(0, s / DS)), i = Math.floor(f), u = f - i;
  return {
    x: tr.px[i] + (tr.px[i + 1] - tr.px[i]) * u,
    y: tr.py[i] + (tr.py[i + 1] - tr.py[i]) * u,
    a: tr.ang[i] + (tr.ang[i + 1] - tr.ang[i]) * u,
    k: tr.kap[i] + (tr.kap[i + 1] - tr.kap[i]) * u
  };
}

/* ------------------------------------------------------------------ */
/* Three.js scene                                                      */
/* ------------------------------------------------------------------ */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a1024, 160, 1300);
const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 3200);
const hemi = new THREE.HemisphereLight(0x8fa6ff, 0x1a1020, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b8, 0.7); scene.add(sun); scene.add(sun.target);
const sky = World.createSky(scene);
let world = null, particles = null, theme = null, lightning = 0, nextBolt = 5;

// rider rig: follows the track; camera and car nose are children
const rig = new THREE.Object3D(); scene.add(rig);
const look = new THREE.Object3D(); look.position.set(0, 1.35, 0.2); rig.add(look);
look.add(camera);
{
  const car = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xc8283a, metalness: 0.35, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1e2c, metalness: 0.2, roughness: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce6, metalness: 0.9, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.36, 1.9), red); body.position.set(0, 0.28, -0.95); car.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.6), red); nose.position.set(0, 0.22, -2.1); nose.rotation.x = 0.35; car.add(nose);
  [-0.82, 0.82].forEach(x => { const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.9), dark); side.position.set(x, 0.55, -0.6); car.add(side); });
  const bar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 24, Math.PI), chrome);
  bar.position.set(0, 0.62, -0.25); bar.rotation.x = -1.1; car.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffb547 }));
  lamp.position.set(0, 0.38, -2.4); car.add(lamp);
  rig.add(car);
  const headlight = new THREE.SpotLight(0xffe7c2, 1.2, 90, 0.55, 0.6, 1.2);
  headlight.position.set(0, 1, -2.6); headlight.target.position.set(0, -2, -30);
  rig.add(headlight); rig.add(headlight.target);
}

let trackGroup = null;
const UP_COL = new THREE.Color(0x3ddc97), DOWN_COL = new THREE.Color(0xff5d6c), FLAT_COL = new THREE.Color(0x8f9bbd);

function makeLabel(title, sub, accent) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(7,11,23,0.82)"; roundRect(g, 8, 8, 1008, 240, 28); g.fill();
  g.strokeStyle = accent; g.lineWidth = 6; roundRect(g, 8, 8, 1008, 240, 28); g.stroke();
  g.fillStyle = "#e8ecf8"; g.textAlign = "center"; g.textBaseline = "middle";
  let size = 92; g.font = `900 ${size}px "Big Shoulders Display", Impact, sans-serif`;
  while (g.measureText(title.toUpperCase()).width > 940 && size > 40) { size -= 4; g.font = `900 ${size}px "Big Shoulders Display", Impact, sans-serif`; }
  g.fillText(title.toUpperCase(), 512, sub ? 104 : 128);
  if (sub) { g.fillStyle = accent; g.font = `500 44px "IBM Plex Mono", monospace`; g.fillText(sub, 512, 192); }
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(26, 6.5, 1);
  return sp;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function niceTicks(lo, hi, n) {
  const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

function buildScene(tr) {
  if (trackGroup) { scene.remove(trackGroup); trackGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (o.material.map && o.material.map.dispose()); o.material.dispose(); } }); }
  trackGroup = new THREE.Group(); scene.add(trackGroup);
  const { px, py, ang, N } = tr;

  // rails + spine
  const step = 3, pts = { l: [], r: [], c: [] };
  for (let i = 0; i < N; i += step) {
    const nx = -Math.sin(ang[i]), ny = Math.cos(ang[i]);
    pts.l.push(new THREE.Vector3(px[i], py[i], -0.72));
    pts.r.push(new THREE.Vector3(px[i], py[i], 0.72));
    pts.c.push(new THREE.Vector3(px[i] - nx * 0.42, py[i] - ny * 0.42, 0));
  }
  const railMat = new THREE.MeshStandardMaterial({ color: 0xd9dee8, metalness: 0.85, roughness: 0.3 });
  const spineMat = new THREE.MeshStandardMaterial({ color: 0xffb547, metalness: 0.5, roughness: 0.45 });
  const tube = (arr, r, mat) => {
    const curve = new THREE.CatmullRomCurve3(arr, false, "centripetal");
    trackGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, arr.length * 2, r, 6, false), mat));
  };
  tube(pts.l, 0.1, railMat); tube(pts.r, 0.1, railMat); tube(pts.c, 0.2, spineMat);

  // ties, colored by whether the chart is rising or falling there (candle colors)
  const tieEvery = 1.5 / DS | 0, nTies = Math.floor(N / tieEvery);
  const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.14, 1.9), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 }), nTies);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), zAxis = new THREE.Vector3(0, 0, 1), col = new THREE.Color();
  for (let k = 0; k < nTies; k++) {
    const i = k * tieEvery, nx = -Math.sin(ang[i]), ny = Math.cos(ang[i]);
    q.setFromAxisAngle(zAxis, ang[i]);
    m4.compose(new THREE.Vector3(px[i] - nx * 0.18, py[i] - ny * 0.18, 0), q, sc);
    ties.setMatrixAt(k, m4);
    const inData = px[i] >= 0 && px[i] <= tr.L;
    const sl = Math.sin(ang[i]);
    col.copy(!inData || Math.abs(sl) < 0.015 ? FLAT_COL : sl > 0 ? UP_COL : DOWN_COL);
    ties.setColorAt(k, col);
  }
  ties.instanceMatrix.needsUpdate = true; if (ties.instanceColor) ties.instanceColor.needsUpdate = true;
  trackGroup.add(ties);

  // supports
  const supEvery = 9 / DS | 0, nSup = Math.floor(N / supEvery);
  const sup = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 6), new THREE.MeshStandardMaterial({ color: 0x5a6788, metalness: 0.6, roughness: 0.5 }), nSup);
  for (let k = 0; k < nSup; k++) {
    const i = k * supEvery, nx = -Math.sin(ang[i]), ny = Math.cos(ang[i]);
    const top = py[i] - ny * 0.5, x = px[i] - nx * 0.5;
    m4.compose(new THREE.Vector3(x, top / 2, 0), new THREE.Quaternion(), new THREE.Vector3(1, Math.max(0.1, top), 1));
    sup.setMatrixAt(k, m4);
  }
  sup.instanceMatrix.needsUpdate = true; trackGroup.add(sup);

  // the chart itself as a translucent wall off to the left: you are riding the line
  {
    const pos = [], idx = [];
    const stepW = 4;
    for (let i = 0, k = 0; i < N; i += stepW, k++) {
      pos.push(px[i], 0, -70, px[i], py[i], -70);
      if (k > 0) { const a = (k - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    trackGroup.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })));
    const lp = []; for (let i = 0; i < N; i += stepW) lp.push(new THREE.Vector3(px[i], py[i], -70));
    trackGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0.7 })));
  }

  // price gridlines with labels
  {
    const ticks = tr.canLog
      ? niceLogTicks(tr.vMin, tr.vMax)
      : niceTicks(tr.vMin, tr.vMax, 5);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x8fa6ff, transparent: true, opacity: 0.22 });
    ticks.forEach(v => {
      const y = tr.toY(v); if (y < BASE - 0.5 || y > BASE + H + 0.5) return;
      trackGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-LEAD, y, -69.5), new THREE.Vector3(tr.L + RUNOUT, y, -69.5)]), lineMat));
      for (let x = 0; x <= tr.L; x += 320) {
        const lab = makeLabel(fmtVal(v, tr.ds.unit), "", "#8fa6ff"); lab.scale.set(14, 3.5, 1);
        lab.position.set(x + 20, y + 2.5, -69); trackGroup.add(lab);
      }
    });
  }

  // event gates
  tr.events.forEach(ev => {
    const k = Math.round(ev.s / DS), a = ang[k];
    const gate = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffb547, emissive: 0x6a3a00, metalness: 0.3, roughness: 0.5 });
    const hgt = 5.5;
    [-2.4, 2.4].forEach(z => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, hgt, 0.25), postMat);
      p.position.set(0, hgt / 2 - 0.5, z); gate.add(p);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 5.1), postMat); beam.position.set(0, hgt - 0.5, 0); gate.add(beam);
    gate.position.set(px[k], py[k], 0); gate.rotation.z = a; trackGroup.add(gate);
    const lab = makeLabel(ev.label, fmtDate(ev.date), "#ffb547");
    lab.position.set(px[k], py[k] + 10, -9); trackGroup.add(lab);
  });

  // story billboards on poles, alternating sides so close-together moments don't overlap
  {
    const th = themeOf(tr.ds), postMat = new THREE.MeshStandardMaterial({ color: 0x3a4258, metalness: 0.5, roughness: 0.6 });
    let lastX = { 1: -1e9, "-1": -1e9 }, side = 1;
    tr.stories.forEach(stry => {
      if (stry.x - lastX[side] < 26) side = -side;
      const x = Math.max(stry.x, lastX[side] + 26); lastX[side] = x;
      const k = Math.round(tr.sAtX(x) / DS), ty = py[k];
      const board = World.makeBoard(th.board, fmtDate(stry.date), stry.title, stry.body);
      const z = side * 17, y = Math.max(8, ty + 4);
      board.position.set(x, y, z); board.rotation.y = side > 0 ? -2.09 : -1.05;
      trackGroup.add(board);
      [-6, 6].forEach(o => {
        const px2 = x + o * Math.cos(board.rotation.y) * -1, pz2 = z + o * Math.sin(board.rotation.y);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, y - 5, 0.4), postMat); post.position.set(px2, (y - 5) / 2, pz2); trackGroup.add(post);
      });
      side = -side;
    });
  }

  // station platform + finish banner
  {
    const plat = new THREE.Mesh(new THREE.BoxGeometry(LEAD * 0.7, 0.4, 7), new THREE.MeshStandardMaterial({ color: 0x2a3150, roughness: 0.9 }));
    plat.position.set(-LEAD * 0.65, py[0] - 1.0, 0); trackGroup.add(plat);
    const sLab = makeLabel(tr.ds.name, themeOf(tr.ds).place, "#ffb547");
    sLab.position.set(-LEAD * 0.45, py[0] + 8, -6); trackGroup.add(sLab);
    const end = makeLabel("Brakes", tr.dated ? fmtDate(tr.t1, false) : "End of data", "#ff5d6c");
    end.position.set(tr.L + 25, py[N - 1] + 8, 0); trackGroup.add(end);
  }
}
function niceLogTicks(lo, hi) {
  const out = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++)
    [1, 2, 5].forEach(m => { const v = m * Math.pow(10, e); if (v >= lo && v <= hi) out.push(v); });
  return out.length >= 2 ? out : niceTicks(lo, hi, 5);
}

/* ------------------------------------------------------------------ */
/* Ride state + physics                                                */
/* ------------------------------------------------------------------ */
const G = 9.81, MU = 0.012, DRAG = 0.0009, LIFT = 4.2, BRAKE = 7;
let rides = DATASETS.slice();
let current = rides[0], track = null, useLog = false;
const st = { s: 0, v: 0, mode: "idle", paused: false, mult: 1, stats: null, nextEvent: 0, gSm: 1, onChain: false };
const BASE_PITCH = -0.12;
const lookState = { yaw: 0, pitch: BASE_PITCH, drag: false, lx: 0, ly: 0, idle: 0 };

function resetStats() { return { maxV: 0, maxG: 1, minG: 1, air: 0, drop: 0, dropTop: null, time: 0 }; }

function applyTheme(tr) {
  const th = themeOf(tr.ds); theme = th;
  World.applySky(sky, th);
  const s = th.sky;
  scene.fog.color.set(s.hor).lerp(new THREE.Color(s.mid), 0.45).multiplyScalar(0.8);
  scene.fog.near = th.fog ? th.fog[0] : 160; scene.fog.far = th.fog ? th.fog[1] : 1300;
  hemi.color.set(s.glow).lerp(new THREE.Color("#8fa6ff"), 0.5); hemi.groundColor.set(th.ground[0]);
  sun.color.set(s.sun); sun.position.set(s.sunDir[0] * 600, Math.max(0.25, s.sunDir[1]) * 900, s.sunDir[2] * 600);
  if (world) { scene.remove(world.group); World.disposeTree(world.group); }
  world = World.buildWorld(th, tr); scene.add(world.group);
  if (particles) { scene.remove(particles.group); World.disposeTree(particles.group); }
  particles = World.makeParticles(th.particles); if (particles) scene.add(particles.group);
  Music.setStyle(th.music);
}

function loadRide(ds, keepProgress) {
  const frac = keepProgress && track ? st.s / track.total : 0;
  const sameRide = track && track.ds === ds;
  current = ds; track = buildTrack(ds, useLog); buildScene(track);
  if (!sameRide || !world) applyTheme(track);
  st.s = keepProgress ? frac * track.total : LEAD * 0.15;
  if (!keepProgress) { st.v = 0; st.stats = resetStats(); st.nextEvent = 0; st.nextStory = 0; }
  else {
    const k = track.events.findIndex(e => e.s > st.s); st.nextEvent = k < 0 ? track.events.length : k;
    const j = track.stories.findIndex(e => e.s > st.s + 25); st.nextStory = j < 0 ? track.stories.length : j;
  }
  document.getElementById("hudName").textContent = ds.name;
  document.getElementById("hudSub").textContent = ds.period + " · " + themeOf(ds).place;
  logBtn.disabled = track.vMin <= 0;
  rideSel.value = ds.id;
  drawMini(true);
  placeRig(0);
}

function step(dt) {
  const tr = track, p = sample(tr, st.s);
  const sinA = Math.sin(p.a), cosA = Math.cos(p.a);
  const inRunout = st.s > tr.sDataEnd + 8;
  let a = -G * sinA - MU * G * Math.abs(cosA) - DRAG * st.v * st.v;
  st.v += a * dt;
  st.onChain = false;
  if (inRunout) {
    // magnetic brakes: bleed speed down to a crawl into the station
    st.v = Math.max(2, st.v - BRAKE * dt);
  } else if (st.v < LIFT) { st.onChain = sinA > 0.03; st.v = LIFT; }
  st.s += st.v * dt;
  if (st.s >= tr.total - 12) { st.s = tr.total - 12; finish(); return; }

  // forces felt by the rider (along the seat-back normal)
  const gNow = Math.max(-3, Math.min(9, cosA + st.v * st.v * p.k / G));
  st.gSm += (gNow - st.gSm) * Math.min(1, dt * 10);
  const S = st.stats; S.time += dt;
  if (!inRunout && st.s > tr.sDataStart) {
    S.maxV = Math.max(S.maxV, st.v);
    S.maxG = Math.max(S.maxG, st.gSm); S.minG = Math.min(S.minG, st.gSm);
    if (st.gSm < 0.3) S.air += dt;
    // biggest single continuous descent
    if (sinA < -0.01) { if (S.dropTop === null) S.dropTop = p.y; S.drop = Math.max(S.drop, S.dropTop - p.y); }
    else if (sinA > 0.01) S.dropTop = null;
  }
  // events
  while (st.nextEvent < tr.events.length && tr.events[st.nextEvent].s <= st.s) {
    const e = tr.events[st.nextEvent++]; if (!e.quiet) showToast(e.label, fmtDate(e.date) + " · " + fmtVal(tr.fromY(e.y), tr.ds.unit));
  }
  while (st.nextStory < tr.stories.length && tr.stories[st.nextStory].s - 22 <= st.s) showStory(tr.stories[st.nextStory++]);
}

const upV = new THREE.Vector3(), fwdV = new THREE.Vector3(), rightV = new THREE.Vector3(0, 0, 1), basis = new THREE.Matrix4();
let rigAng = null;
function placeRig(dt) {
  const tr = track, p = sample(tr, st.s);
  // look slightly ahead so the view anticipates the drop like a real rider does
  const ahead = sample(tr, st.s + Math.min(6, 1.5 + st.v * 0.12));
  const target = Math.atan2(ahead.y - p.y, ahead.x - p.x) * 0.55 + p.a * 0.45;
  if (rigAng === null || dt === 0) rigAng = target; else rigAng += (target - rigAng) * Math.min(1, dt * 9);
  fwdV.set(Math.cos(rigAng), Math.sin(rigAng), 0);
  upV.set(-Math.sin(rigAng), Math.cos(rigAng), 0);
  basis.makeBasis(rightV, upV, fwdV.clone().negate());
  rig.quaternion.setFromRotationMatrix(basis);
  // a tiny bit of track rumble at speed
  const rumble = (st.mode === "riding" && !st.paused && !reduceMotion) ? Math.min(0.025, st.v * 0.0006) : 0;
  rig.position.set(p.x, p.y + 0.1, (Math.random() - 0.5) * rumble);
  rig.position.y += (Math.random() - 0.5) * rumble;
  look.rotation.set(lookState.pitch, lookState.yaw, 0, "YXZ");
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */
const $ = id => document.getElementById(id);
const rideSel = $("rideSel"), logBtn = $("logBtn");
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let hudTick = 0;
function updateHud() {
  const tr = track, p = sample(tr, st.s);
  const v = tr.fromY(p.y), v0 = tr.ds.pts[0][1];
  const x = Math.min(tr.L, Math.max(0, p.x));
  const t = tr.timeAt(x);
  $("hudDate").textContent = tr.dated ? fmtDate(t, tr.span > 2500) : `Point ${Math.round(t) + 1} of ${tr.ds.pts.length}`;
  $("hudValue").textContent = fmtVal(v, tr.ds.unit);
  const chg = v / v0 - 1;
  const ce = $("hudChg"); ce.textContent = pct(chg) + " since start"; ce.className = chg >= 0 ? "up" : "down";
  // drawdown from running high of the data seen so far
  const runHigh = runningHigh(tr, x);
  const dd = v / runHigh - 1; st.dd = dd;
  const de = $("hudDD"); de.textContent = dd < -0.005 ? pct(dd) + " from high" : "at high"; de.className = dd < -0.005 ? "down" : "up";
  $("spdNum").innerHTML = Math.round(st.v * 3.6) + "<small>km/h</small>";
  const gEl = $("gNum"); gEl.innerHTML = st.gSm.toFixed(1) + "<small>G</small>";
  gEl.className = "num" + (st.gSm < 0.3 ? " air" : st.gSm > 3 ? " heavy" : "");
  $("hNum").innerHTML = Math.round(p.y) + "<small>m</small>";
  $("chain").hidden = !st.onChain;
}
function runningHigh(tr, x) {
  const ds = tr.ds, t = tr.timeAt(x); let hi = -Infinity;
  for (let i = 0; i < ds.pts.length; i++) {
    const ti = tr.dated ? parseDate(ds.pts[i][0]) : i; if (ti > t) break; hi = Math.max(hi, ds.pts[i][1]);
  }
  return Math.max(hi, tr.fromY(sample(tr, st.s).y));
}

const mini = $("mini"), mctx = mini.getContext("2d");
let miniCache = null;
function drawMini(rebuild) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = mini.clientWidth, h = mini.clientHeight;
  if (!w || !h) return;
  if (mini.width !== Math.round(w * dpr) || rebuild) { mini.width = Math.round(w * dpr); mini.height = Math.round(h * dpr); miniCache = null; }
  const tr = track, pad = 6;
  const X = x => pad + (x + LEAD) / (tr.L + LEAD + RUNOUT) * (w - pad * 2);
  const Y = y => h - pad - (y - BASE) / H * (h - pad * 2);
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mctx.clearRect(0, 0, w, h);
  const p = sample(tr, st.s);
  const path = new Path2D(); const stp = Math.max(1, Math.floor(tr.N / (w * 1.5)));
  for (let i = 0; i < tr.N; i += stp) { i ? path.lineTo(X(tr.px[i]), Y(tr.py[i])) : path.moveTo(X(tr.px[i]), Y(tr.py[i])); }
  mctx.lineWidth = 1.5; mctx.strokeStyle = "rgba(143,155,189,.45)"; mctx.stroke(path);
  mctx.save(); mctx.beginPath(); mctx.rect(0, 0, X(p.x), h); mctx.clip();
  const fill = new Path2D(path); fill.lineTo(X(tr.px[tr.N - 1]), h); fill.lineTo(X(tr.px[0]), h); fill.closePath();
  mctx.fillStyle = "rgba(255,181,71,.12)"; mctx.fill(fill);
  mctx.lineWidth = 2; mctx.strokeStyle = "#ffb547"; mctx.stroke(path); mctx.restore();
  tr.events.forEach(e => { mctx.fillStyle = "rgba(255,181,71,.6)"; mctx.fillRect(X(e.x) - 0.5, pad, 1, h - pad * 2); });
  mctx.beginPath(); mctx.arc(X(p.x), Y(p.y), 4.5, 0, Math.PI * 2); mctx.fillStyle = "#fff"; mctx.fill();
  mctx.lineWidth = 2; mctx.strokeStyle = "#ffb547"; mctx.stroke();
}

let storyTimer = 0;
function showStory(sy) {
  const el = $("story"), b = CC.BOARDS[themeOf(track.ds).board] || CC.BOARDS.neon;
  el.style.setProperty("--sbg", b.bg); el.style.setProperty("--sfg", b.fg); el.style.setProperty("--sacc", b.accent); el.style.setProperty("--sfont", b.css);
  $("storyK").textContent = fmtDate(sy.date) + " · " + fmtVal(track.fromY(sy.y), track.ds.unit);
  $("storyT").textContent = sy.title; $("storyB").textContent = sy.body;
  el.classList.add("show"); clearTimeout(storyTimer);
  storyTimer = setTimeout(() => el.classList.remove("show"), Math.max(6000, 2500 + sy.body.length * 45) / Math.sqrt(st.mult));
}
let toastTimer = 0;
function showToast(title, sub) {
  const t = $("toast"); t.innerHTML = ""; t.append(title);
  const s = document.createElement("small"); s.textContent = sub; t.append(s);
  t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
}

/* ------------------------------------------------------------------ */
/* Sound: wind that rises with speed, chain-lift clicks                */
/* ------------------------------------------------------------------ */
const audio = { ctx: null, on: false, gain: null, filt: null, clickT: 0 };
function initAudio() {
  if (audio.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = new AC(); audio.ctx = ctx; Music.init(ctx);
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  audio.filt = ctx.createBiquadFilter(); audio.filt.type = "lowpass"; audio.filt.frequency.value = 400;
  audio.gain = ctx.createGain(); audio.gain.gain.value = 0;
  src.connect(audio.filt).connect(audio.gain).connect(ctx.destination); src.start();
}
function updateAudio(dt) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime, active = audio.on && st.mode === "riding" && !st.paused;
  Music.update(st.mode !== "riding" ? 0.12 : st.paused ? 0.05 : 0.35 + 0.65 * Math.min(1, st.v / 40), st.mode === "riding" && st.dd < -0.2);
  const sp = Math.min(1, st.v / 45);
  audio.gain.gain.setTargetAtTime(active ? 0.04 + sp * sp * 0.9 : 0, t, 0.15);
  audio.filt.frequency.setTargetAtTime(250 + sp * 2600, t, 0.2);
  if (active && st.onChain) {
    audio.clickT -= dt * st.mult;
    if (audio.clickT <= 0) {
      audio.clickT = 0.16;
      const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = "square"; o.frequency.value = 1800 + Math.random() * 300;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      o.connect(g).connect(audio.ctx.destination); o.start(t); o.stop(t + 0.04);
    }
  }
}

/* ------------------------------------------------------------------ */
/* UI wiring                                                           */
/* ------------------------------------------------------------------ */
function populateRides() {
  rideSel.innerHTML = ""; const grid = $("rideGrid"); grid.innerHTML = "";
  rides.forEach(ds => {
    const o = document.createElement("option"); o.value = ds.id; o.textContent = ds.name; rideSel.append(o);
    const b = document.createElement("button"); b.type = "button"; b.className = "ride"; b.dataset.id = ds.id;
    b.setAttribute("aria-pressed", ds === current ? "true" : "false");
    const vals = ds.pts.map(p => p[1]), hi = Math.max(...vals), lo = Math.min(...vals);
    const worst = maxDrawdown(vals);
    b.innerHTML = `<span class="rn"></span><span class="rp"></span><canvas width="440" height="88" aria-hidden="true"></canvas><span class="stat"><span>Worst drawdown</span><span class="down"></span></span>`;
    b.querySelector(".rn").textContent = ds.name; b.querySelector(".rp").textContent = ds.period;
    b.querySelector(".stat .down").textContent = worst < -0.001 ? pct(worst) : "no drawdown";
    const c = b.querySelector("canvas").getContext("2d");
    const ts = ds.pts.map((p, i) => ds.dated === false ? i : parseDate(p[0])), t0 = ts[0], t1 = ts[ts.length - 1];
    c.beginPath();
    ds.pts.forEach((p, i) => { const x = 4 + (ts[i] - t0) / Math.max(1e-9, t1 - t0) * 432, y = 84 - (p[1] - lo) / Math.max(1e-9, hi - lo) * 80; i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.lineWidth = 3; c.strokeStyle = "#ffb547"; c.lineJoin = "round"; c.stroke();
    b.addEventListener("click", () => { startAudio(); selectRide(ds); });
    b.addEventListener("dblclick", () => { selectRide(ds); board(); });
    grid.append(b);
  });
}
function selectRide(ds) {
  document.querySelectorAll(".ride").forEach(el => el.setAttribute("aria-pressed", el.dataset.id === ds.id ? "true" : "false"));
  loadRide(ds, false); st.mode = "idle";
  $("boardHint").textContent = `${ds.name} · ${ds.period}`;
}
function startAudio() {
  initAudio(); if (!audio.ctx) return;
  if (audio.ctx.state === "suspended") audio.ctx.resume();
  if (!audio.started) { audio.started = true; audio.on = true; $("soundBtn").setAttribute("aria-pressed", "true"); $("musicBtn").setAttribute("aria-pressed", String(Music.enabled)); }
  Music.start();
}
function board() {
  startAudio();
  $("boardScreen").hidden = true; $("doneScreen").hidden = true;
  loadRide(current, false); st.mode = "riding"; st.paused = false; $("pauseBtn").setAttribute("aria-pressed", "false"); $("pauseBtn").textContent = "Pause";
  lookState.yaw = 0; lookState.pitch = BASE_PITCH;
}
function finish() {
  if (st.mode !== "riding") return;
  st.mode = "done";
  const S = st.stats, tr = track;
  const vals = tr.ds.pts.map(p => p[1]);
  $("doneTitle").textContent = tr.ds.name + " survived";
  const items = [
    [Math.round(S.maxV * 3.6) + " km/h", "Top speed"],
    [S.maxG.toFixed(1) + " G", "Max force"],
    [S.minG.toFixed(1) + " G", "Min force"],
    [S.air.toFixed(1) + " s", "Airtime"],
    [Math.round(S.drop) + " m", "Biggest drop"],
    [pct(maxDrawdown(vals)), "Worst drawdown"]
  ];
  $("doneStats").innerHTML = "";
  items.forEach(([b, s]) => { const d = document.createElement("div"); d.innerHTML = `<b></b><span></span>`; d.querySelector("b").textContent = b; d.querySelector("span").textContent = s; $("doneStats").append(d); });
  setTimeout(() => { $("doneScreen").hidden = false; }, 900);
}

rideSel.addEventListener("change", () => { const ds = rides.find(d => d.id === rideSel.value); if (ds) { current = ds; board(); } });
$("pauseBtn").addEventListener("click", togglePause);
function togglePause() {
  if (st.mode !== "riding") return;
  st.paused = !st.paused; $("pauseBtn").setAttribute("aria-pressed", String(st.paused)); $("pauseBtn").textContent = st.paused ? "Resume" : "Pause";
}
$("restartBtn").addEventListener("click", board);
const MULTS = [1, 2, 4, 0.5];
$("speedBtn").addEventListener("click", e => { st.mult = MULTS[(MULTS.indexOf(st.mult) + 1) % MULTS.length]; e.currentTarget.textContent = (st.mult === 0.5 ? "½" : st.mult) + "×"; });
logBtn.addEventListener("click", () => { useLog = !useLog; logBtn.setAttribute("aria-pressed", String(useLog)); loadRide(current, true); });
$("soundBtn").addEventListener("click", e => {
  initAudio(); if (!audio.ctx) return; if (audio.ctx.state === "suspended") audio.ctx.resume();
  audio.on = !audio.on; e.currentTarget.setAttribute("aria-pressed", String(audio.on));
});
$("musicBtn").addEventListener("click", e => {
  startAudio(); Music.setEnabled(!Music.enabled); e.currentTarget.setAttribute("aria-pressed", String(Music.enabled));
});
$("menuBtn").addEventListener("click", () => { st.mode = "idle"; $("doneScreen").hidden = true; $("boardScreen").hidden = false; populateRides(); });
$("boardBtn").addEventListener("click", board);
$("againBtn").addEventListener("click", board);
$("pickBtn").addEventListener("click", () => { $("doneScreen").hidden = true; $("boardScreen").hidden = false; st.mode = "idle"; populateRides(); });
window.addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("textarea, input, select")) return;
  if (e.code === "Space") { e.preventDefault(); togglePause(); }
});

$("customGo").addEventListener("click", () => {
  const err = $("customErr"); err.textContent = "";
  const lines = $("customData").value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pts = []; let dated = true;
  lines.forEach((l, i) => {
    const parts = l.split(/[,\t;]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const v = parseFloat(parts[parts.length - 1].replace(/[$¥€£%\s]/g, "")), t = parseDate(parts[0]);
      if (isNaN(v)) return; if (t == null) dated = false; pts.push([parts[0], v]);
    } else if (parts.length === 1) {
      const v = parseFloat(parts[0].replace(/[$¥€£%\s,]/g, "")); if (isNaN(v)) return; dated = false; pts.push([String(i), v]);
    }
  });
  if (pts.length < 3) { err.textContent = "Need at least 3 numbers to build a track. Put one value per line."; return; }
  if (dated) {
    pts.sort((a, b) => parseDate(a[0]) - parseDate(b[0]));
    if (parseDate(pts[pts.length - 1][0]) - parseDate(pts[0][0]) <= 0) dated = false;
  }
  const vals = pts.map(p => p[1]);
  if (Math.max(...vals) === Math.min(...vals)) { err.textContent = "All the values are the same, so the track would be flat. Try data that moves."; return; }
  const name = $("customName").value.trim() || "My chart";
  const ds = { id: "custom-" + Date.now(), name, period: `Your data · ${pts.length} points`, unit: "", len: Math.min(3200, Math.max(900, pts.length * 30)), pts, events: [], dated };
  rides = rides.filter(r => !r.id.startsWith("custom-")).concat(ds);
  current = ds; populateRides(); selectRide(ds); board();
});

// look around: drag on the scene
canvas.addEventListener("pointerdown", e => { lookState.drag = true; lookState.lx = e.clientX; lookState.ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => {
  if (!lookState.drag) return;
  const k = 0.0045;
  lookState.yaw = Math.max(-2.6, Math.min(2.6, lookState.yaw - (e.clientX - lookState.lx) * k));
  lookState.pitch = Math.max(-1.2, Math.min(1.1, lookState.pitch - (e.clientY - lookState.ly) * k));
  lookState.lx = e.clientX; lookState.ly = e.clientY; lookState.idle = 0;
});
const endDrag = () => { lookState.drag = false; };
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 92 : 78; camera.updateProjectionMatrix();
  drawMini(true);
}
window.addEventListener("resize", resize);

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
let last = performance.now(), idleT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (st.mode === "riding" && !st.paused) {
    let rem = dt * st.mult; while (rem > 0) { const h = Math.min(rem, 1 / 240); step(h); rem -= h; if (st.mode !== "riding") break; }
  } else if (st.mode === "idle") {
    // gentle sway at the station while choosing
    idleT += dt; if (!lookState.drag) lookState.yaw = Math.sin(idleT * 0.25) * 0.5;
  }
  if (!lookState.drag && st.mode === "riding") {
    lookState.idle += dt;
    if (lookState.idle > 2) { const r = Math.min(1, dt * 1.5); lookState.yaw -= lookState.yaw * r; lookState.pitch -= (lookState.pitch - BASE_PITCH) * r; }
  }
  placeRig(dt);
  const time = now / 1000;
  sky.mesh.position.copy(rig.position); sky.uniforms.time.value = time;
  if (particles) particles.update(dt, time, rig.position);
  if (world) {
    world.animators.forEach(f => f(dt, time));
    world.group.children.forEach(o => { if (o.userData.follow) o.position.copy(rig.position).add(o.userData.follow); });
  }
  if (theme && theme.lightning) {
    nextBolt -= dt; if (nextBolt <= 0) { lightning = 0.9; nextBolt = 5 + Math.random() * 9; }
    lightning *= Math.pow(0.02, dt); sky.uniforms.flash.value = lightning * (Math.random() < 0.7 ? 1 : 0.3);
    hemi.intensity = 0.8 + lightning * 2;
  }
  if ((hudTick++ & 1) === 0) { updateHud(); drawMini(false); }
  updateAudio(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

populateRides();
loadRide(current, false);
selectRide(current);
resize();
// rebuild labels once the webfonts arrive so canvas text uses them
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildScene(track); populateRides(); });
requestAnimationFrame(frame);
window.__chartCoaster = { st, get track() { return track; } };
})();
