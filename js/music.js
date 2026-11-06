/* Chart Coaster: a tiny generative band. Every era gets an original tune in its style,
   synthesised live with Web Audio. When the chart is deep in a drawdown the band
   switches to a darker chord progression. */
window.CC = window.CC || {};
(() => {
"use strict";

const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const QUAL = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], "6": [0, 4, 7, 9], sus4: [0, 5, 7], dim: [0, 3, 6] };
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
const chordCache = {};
function chord(sym) {
  if (chordCache[sym]) return chordCache[sym];
  const m = /^([A-G][b#]?)(.*)$/.exec(sym);
  const q = m[2];
  return (chordCache[sym] = { root: NOTE[m[1]], iv: QUAL[q] || QUAL[""], minor: (q.startsWith("m") && !q.startsWith("maj")) || q === "dim" });
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* Styles. Patterns are 16 steps (one bar of 16th notes): x = hit, X = accent, r = roll (hats). */
const STYLES = {
  // Roaring Twenties stride piano: bass on 1 & 3, chords on 2 & 4, syncopated right hand.
  ragtime: {
    bpm: 100, swing: 0.62, prog: ["C", "C", "A7", "A7", "D7", "G7", "C", "G7"], dark: ["Cm", "Cm", "Fm", "Fm", "Ab7", "G7", "Cm", "G7"],
    brush: "....x.......x...", brushV: 0.05,
    bass: { pat: "x.......x.......", mode: "rootfifth", inst: "piano", oct: 1, len: 3, v: 0.3 },
    chords: { pat: "....x.......x...", inst: "piano", oct: 0, len: 2, v: 0.11 },
    lead: { pat: "x..x..x.x.x..x.x", inst: "piano", oct: 1, v: 0.17 }
  },
  // 1987 synth-pop: drum machine, big gated snare, pulsing bass, shimmering arp.
  synthpop: {
    bpm: 116, swing: 0.5, prog: ["Am", "F", "C", "G"], dark: ["Am", "Em", "F", "E"],
    kick: "x...x...x...x...", snare: "....X.......X...", snareSend: 0.7, hat: "..x...x...x...x.",
    bass: { pat: "x.x.x.x.x.x.x.x.", mode: "octave", inst: "bass", oct: 1, len: 1.6, v: 0.26 },
    chords: { pat: "x...............", inst: "pad", oct: 0, len: 16, v: 0.05, bright: 1600 },
    arp: { pat: "xxxxxxxxxxxxxxxx", inst: "pluck", oct: 1, v: 0.045 },
    lead: { pat: "x.....x...x.....", inst: "lead", oct: 1, v: 0.055 }
  },
  // Y2K trance: four on the floor, offbeat bass, supersaw pads, racing arp.
  y2k: {
    bpm: 134, swing: 0.5, prog: ["Fm", "Db", "Ab", "Eb"], dark: ["Fm", "Db", "Bbm", "C"],
    kick: "x...x...x...x...", clap: "....x.......x...", ohat: "..x...x...x...x.", hat: "x.x.x.x.x.x.x.x.", hatV: 0.05,
    bass: { pat: "..x...x...x...x.", mode: "root", inst: "bass", oct: 1, len: 1.5, v: 0.28 },
    chords: { pat: "x.......x.......", inst: "pad", oct: 0, len: 8, v: 0.045, bright: 2400 },
    arp: { pat: "xxxxxxxxxxxxxxxx", inst: "pluck", wave: "sawtooth", oct: 1, v: 0.04 }
  },
  // 2008 downtempo: slow, minor, electric piano and sub bass.
  downtempo: {
    bpm: 82, swing: 0.56, prog: ["Dm7", "Bbmaj7", "Gm7", "A7"], dark: ["Dm7", "Gm7", "Dm7", "A7"],
    kick: "x.......x.x.....", snare: "....x.......x...", snareV: 0.35, hat: "..x...x...x...x.",
    bass: { pat: "x.....x.x.......", mode: "root", inst: "sub", oct: 1, len: 3, v: 0.36 },
    chords: { pat: "x.......x.......", inst: "epiano", oct: 0, len: 6, v: 0.06 },
    lead: { pat: "......x.....x...", inst: "epiano", oct: 1, v: 0.08 }
  },
  // 2020 lo-fi: dusty piano, lazy swing, vinyl crackle, everyone indoors.
  lofi: {
    bpm: 74, swing: 0.6, crackle: true, filterMax: 3200, prog: ["Fmaj7", "Em7", "Dm7", "Cmaj7"], dark: ["Fmaj7", "Em7", "Dm7", "E7"],
    kick: "x......x..x.....", snare: "....x.......x...", snareV: 0.3, hat: "x.x.x.x.x.x.x.x.", hatV: 0.05,
    bass: { pat: "x.........x.....", mode: "root", inst: "sub", oct: 1, len: 5, v: 0.36 },
    chords: { pat: "x.......x..x....", inst: "piano", oct: 0, len: 4, v: 0.065 },
    lead: { pat: "..x.....x...x...", inst: "epiano", oct: 1, v: 0.065 }
  },
  // 2017 crypto trap: half-time claps, rolling hats, gliding 808s, dark bells.
  trap: {
    bpm: 140, swing: 0.5, prog: ["Cm", "Cm", "Ab", "G"], dark: ["Cm", "Ab", "Fm", "G"],
    kick: "x.....x...x.....", clap: "........x.......", hat: "xxxrxxxxxxrxxxxr", hatV: 0.06,
    bass: { pat: "x.....x...x.....", mode: "root", inst: "b808", oct: 1, len: 5, v: 0.42 },
    chords: { pat: "x...............", inst: "pad", oct: 0, len: 16, v: 0.035, bright: 700 },
    lead: { pat: "x..x..x...x.x...", inst: "bell", oct: 1, v: 0.05 }
  },
  // GameStop: 8-bit, of course.
  chiptune: {
    bpm: 150, swing: 0.5, prog: ["C", "Am", "F", "G"], dark: ["Am", "F", "G", "E"],
    kick: "x.......x.......", snare: "....x.......x...", snareV: 0.35, hat: "..x...x...x...x.", hatV: 0.05,
    bass: { pat: "x.x.x.x.x.x.x.x.", mode: "octave", inst: "chip", oct: 1, len: 1.6, v: 0.08 },
    arp: { pat: "xxxxxxxxxxxxxxxx", inst: "chip", oct: 1, v: 0.03 },
    lead: { pat: "x.x.x..xx.x.x...", inst: "chip", oct: 2, v: 0.055 }
  },
  // 1980s Tokyo city pop: major sevenths, funky bass, bright and glossy.
  citypop: {
    bpm: 110, swing: 0.53, prog: ["Fmaj7", "E7", "Am7", "Gm7"], dark: ["Dm7", "Em7", "Fmaj7", "E7"],
    kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", hatV: 0.05, ohat: "......x.......x.",
    bass: { pat: "x..x..x.x.x..x..", mode: "octave", inst: "bass", wave: "square", oct: 1, len: 1.4, v: 0.22 },
    chords: { pat: "..x...x..x....x.", inst: "epiano", oct: 0, len: 2, v: 0.05 },
    lead: { pat: "x...x.x...x.x...", inst: "lead", oct: 1, v: 0.05 }
  },
  // 1979 disco: four on the floor, octave bass, string stabs.
  disco: {
    bpm: 120, swing: 0.5, prog: ["Am", "Dm", "G", "C"], dark: ["Am", "Dm", "E", "Am"],
    kick: "x...x...x...x...", clap: "....x.......x...", ohat: "..x...x...x...x.", hat: "x.x.x.x.x.x.x.x.", hatV: 0.04,
    bass: { pat: "x.x.x.x.x.x.x.x.", mode: "octave", inst: "bass", oct: 1, len: 1.5, v: 0.25 },
    chords: { pat: "x.....x.....x...", inst: "strings", oct: 0, len: 2, v: 0.04 },
    lead: { pat: "x.......x.x.....", inst: "strings", oct: 1, v: 0.045 }
  },
  // Mauna Loa: slow pads and bells under the stars.
  ambient: {
    bpm: 68, swing: 0.5, prog: ["Dmaj7", "Bm7", "Gmaj7", "A"], dark: ["Bm7", "Gmaj7", "Em7", "F#m7"],
    bass: { pat: "x...............", mode: "root", inst: "sub", oct: 1, len: 15, v: 0.26 },
    chords: { pat: "x...............", inst: "pad", oct: 0, len: 16, v: 0.05, bright: 1400 },
    lead: { pat: "x.....x...x.....", inst: "bell", oct: 1, v: 0.045 }
  }
};

let ctx = null, bus, wet, filter, master, noiseBuf, sat;
let style = null, styleName = "", step = 0, nextT = 0, timer = 0, dark = false, enabled = true, running = false;
let leadDeg = 3;

function impulse(sec) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  return b;
}
function init(ac) {
  if (ctx) return;
  ctx = ac;
  master = ctx.createGain(); master.gain.value = 0;
  filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1400; filter.Q.value = 0.5;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5;
  bus = ctx.createGain(); wet = ctx.createGain();
  const conv = ctx.createConvolver(); conv.buffer = impulse(3.2);
  bus.connect(filter); wet.connect(conv); conv.connect(filter);
  filter.connect(comp); comp.connect(master); master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  sat = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; sat[i] = Math.tanh(x * 2.5); }
}

/* ---- instruments ---- */
function out(node, send) {
  node.connect(bus);
  if (send) { const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(wet); }
}
function osc(type, f, t, stop) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; }
function amp(v = 0) { const g = ctx.createGain(); g.gain.value = v; return g; }
function lowpass(freq, q) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq; if (q) f.Q.value = q; return f; }

const I = {
  kick(t, v) {
    const o = osc("sine", 150, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const g = amp(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42); o.connect(g); out(g, 0);
  },
  noise(t, dur, v, type, freq, q, send) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
    const g = amp(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); out(g, send); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  snare(t, v, send) {
    I.noise(t, 0.2, v * 0.8, "bandpass", 1900, 0.6, send);
    const o = osc("triangle", 200, t, t + 0.15); o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
    const g = amp(); g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(g); out(g, send);
  },
  clap(t, v) { [0, 0.012, 0.024].forEach(d => I.noise(t + d, 0.09, v * 0.55, "bandpass", 1300, 1.2, 0.3)); I.noise(t + 0.03, 0.25, v * 0.35, "bandpass", 1300, 1, 0.4); },
  hat(t, v, open) { I.noise(t, open ? 0.28 : 0.045, v, "highpass", 7500, 0.5, 0.05); },
  brush(t, v) { I.noise(t, 0.16, v, "bandpass", 3200, 0.5, 0.2); },
  crackle(t) { if (Math.random() < 0.35) I.noise(t + Math.random() * 0.1, 0.012, 0.03 + Math.random() * 0.05, "highpass", 3000, 0.4, 0); },
  piano(t, f, d, v, send = 0.22) {
    const end = t + Math.min(3, d + 1.3), lp = lowpass(Math.min(9000, 1800 + f * 3)), g = amp();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0008, end);
    [["triangle", 1, 1], ["sine", 2, 0.35], ["sine", 3, 0.12]].forEach(([ty, m, a]) => { const o = osc(ty, f * m, t, end); const og = amp(a); o.connect(og); og.connect(lp); });
    lp.connect(g); out(g, send);
  },
  epiano(t, f, d, v, send = 0.3) {
    const end = t + d + 1.5, car = osc("sine", f, t, end), mod = osc("sine", f, t, end), mg = amp();
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    const g = amp(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, end);
    car.connect(g); out(g, send);
  },
  pad(t, f, d, v, send = 0.5, bright = 1000) {
    const end = t + d + 1.2, lp = lowpass(bright), g = amp();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.6, d * 0.4));
    g.gain.setValueAtTime(v, t + d); g.gain.linearRampToValueAtTime(0, end);
    [-9, 0, 8].forEach(c => { const o = osc("sawtooth", f, t, end); o.detune.value = c; o.connect(lp); });
    lp.connect(g); out(g, send);
  },
  strings(t, f, d, v, send = 0.45) { I.pad(t, f, d, v, send, 2600); },
  bass(t, f, d, v, wave = "sawtooth") {
    const end = t + d + 0.1, o = osc(wave, f, t, end), lp = lowpass(1400, 6);
    lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(220, t + Math.min(0.25, d));
    const g = amp(); g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.001, end);
    o.connect(lp); lp.connect(g); out(g, 0);
  },
  sub(t, f, d, v) {
    const end = t + d + 0.2, o = osc("sine", f, t, end), o2 = osc("triangle", f * 2, t, end), g2 = amp(0.15), g = amp();
    o2.connect(g2); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.setValueAtTime(v, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.001, end);
    o.connect(g); g2.connect(g); out(g, 0);
  },
  b808(t, f, d, v) {
    const end = t + d + 0.3, o = osc("sine", f * 1.5, t, end); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const sh = ctx.createWaveShaper(); sh.curve = sat;
    const g = amp(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, end);
    o.connect(sh); sh.connect(g); out(g, 0);
  },
  pluck(t, f, d, v, send = 0.3, wave = "square") {
    const end = t + 0.35, o = osc(wave, f, t, end), lp = lowpass(4000);
    lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.25);
    const g = amp(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, end);
    o.connect(lp); lp.connect(g); out(g, send);
  },
  lead(t, f, d, v, send = 0.35) {
    const end = t + d + 0.15, o = osc("sawtooth", f, t, end), o2 = osc("square", f * 1.003, t, end), lp = lowpass(2400);
    const vib = osc("sine", 5.5, t, end), vg = amp(f * 0.006); vib.connect(vg); vg.connect(o.frequency);
    const g = amp(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.setValueAtTime(v * 0.8, t + d); g.gain.exponentialRampToValueAtTime(0.001, end);
    o.connect(lp); o2.connect(lp); lp.connect(g); out(g, send);
  },
  chip(t, f, d, v, send = 0.08) {
    const end = t + d * 0.9, o = osc("square", f, t, end + 0.02), g = amp();
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v * 0.7, t + 0.03); g.gain.linearRampToValueAtTime(0, end);
    o.connect(g); out(g, send);
  },
  bell(t, f, d, v, send = 0.5) { I.epiano(t, f * 2, d, v, send); }
};
function play(inst, t, f, d, v, spec) {
  if (inst === "bass") return I.bass(t, f, d, v, spec.wave || "sawtooth");
  if (inst === "pluck") return I.pluck(t, f, d, v, 0.3, spec.wave || "square");
  if (inst === "pad") return I.pad(t, f, d, v, 0.5, spec.bright || 1000);
  (I[inst] || I.piano)(t, f, d, v);
}

/* ---- sequencer ---- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hitsBefore = (pat, s) => { let n = 0; for (let i = 0; i < s; i++) if (pat[i] !== ".") n++; return n; };

function playStep(t, i) {
  const S = style, s = i % 16, bar = Math.floor(i / 16), sd = 60 / S.bpm / 4;
  const prog = dark && S.dark ? S.dark : S.prog;
  const ch = chord(prog[bar % prog.length]);
  const at = p => p ? p[s % p.length] : ".";
  let c;
  if ((c = at(S.kick)) !== ".") I.kick(t, c === "X" ? 0.9 : 0.72);
  if ((c = at(S.snare)) !== ".") I.snare(t, (S.snareV || 0.45) * (c === "X" ? 1.2 : 1), S.snareSend || 0.25);
  if (at(S.clap) !== ".") I.clap(t, 0.5);
  if ((c = at(S.hat)) !== ".") { I.hat(t, S.hatV || 0.08); if (c === "r") I.hat(t + sd / 2, (S.hatV || 0.08) * 0.8); }
  if (at(S.ohat) !== ".") I.hat(t, 0.06, true);
  if (at(S.brush) !== ".") I.brush(t, S.brushV || 0.05);
  if (S.crackle) I.crackle(t);

  const rootLow = ch.root > 6 ? ch.root - 12 : ch.root;
  if (S.bass && at(S.bass.pat) !== ".") {
    const b = S.bass, n = hitsBefore(b.pat, s);
    let m = 24 + 12 * (b.oct || 1) + rootLow;
    if (b.mode === "octave" && n % 2) m += 12;
    if (b.mode === "rootfifth" && n % 2) m += 7;
    play(b.inst, t, mtof(m), b.len * sd, b.v, b);
  }
  if (S.chords && at(S.chords.pat) !== ".") {
    const k = S.chords;
    ch.iv.forEach(iv => { let m = 52 + 12 * k.oct + ((ch.root + iv) % 12); if (m > 67 + 12 * k.oct) m -= 12; play(k.inst, t, mtof(m), k.len * sd, k.v, k); });
  }
  if (S.arp && at(S.arp.pat) !== ".") {
    const a = S.arp, n = hitsBefore(a.pat, s), L = ch.iv.length;
    const m = 48 + 12 * a.oct + rootLow + ch.iv[n % L] + 12 * (Math.floor(n / L) % 2);
    play(a.inst, t, mtof(m), sd * 0.9, a.v, a);
  }
  if (S.lead && at(S.lead.pat) !== ".") {
    const ld = S.lead, r = rng((bar % 4) * 131 + s * 7 + (dark ? 999 : 0) + styleName.length * 17);
    if (bar % 4 === 0 && s === S.lead.pat.indexOf("x")) leadDeg = 2 + Math.floor(r() * 3);
    if (s % 4 === 0) { const ct = [0, 2, 4, 7, 9]; leadDeg = ct.reduce((best, d) => Math.abs(d - leadDeg) < Math.abs(best - leadDeg) ? d : best, ct[0]); }
    else leadDeg += [-2, -1, 1, 2][Math.floor(r() * 4)];
    leadDeg = Math.max(0, Math.min(10, leadDeg));
    const sc = ch.minor ? MINOR : MAJOR;
    const m = 48 + 12 * ld.oct + rootLow + sc[leadDeg % 7] + 12 * Math.floor(leadDeg / 7);
    let next = 1; while (next < 8 && ld.pat[(s + next) % 16] === ".") next++;
    play(ld.inst, t, mtof(m), next * sd * 0.9, ld.v, ld);
  }
}
function tick() {
  if (!ctx || !style || !running) return;
  const sd = 60 / style.bpm / 4;
  if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.02;
  while (nextT < ctx.currentTime + 0.15) {
    const swing = step % 2 === 1 ? (style.swing * 2 - 1) * sd : 0;
    playStep(nextT + swing, step);
    nextT += sd; step++;
  }
}

CC.Music = {
  styles: Object.keys(STYLES),
  init,
  setStyle(name) {
    if (!STYLES[name] || name === styleName) return;
    styleName = name; style = STYLES[name]; step = 0; leadDeg = 3;
    if (ctx) nextT = ctx.currentTime + 0.08;
  },
  get enabled() { return enabled; },
  setEnabled(on) {
    enabled = on;
    if (!ctx) return;
    if (on) this.start(); else this.stop();
  },
  start() {
    if (!ctx || !enabled) return;
    if (!running) { running = true; nextT = ctx.currentTime + 0.08; timer = setInterval(tick, 30); }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.4);
  },
  stop() {
    if (!ctx) return;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    running = false; clearInterval(timer); timer = 0;
  },
  // mood: 0 = muffled (menus), 1 = full; dark = in a deep drawdown
  update(mood, isDark) {
    if (!ctx) return;
    const max = (style && style.filterMax) || 14000;
    filter.frequency.setTargetAtTime(700 + Math.pow(Math.max(0, Math.min(1, mood)), 1.5) * max, ctx.currentTime, 0.3);
    dark = !!isDark;
  }
};
})();
