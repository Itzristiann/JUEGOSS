(() => {
'use strict';

/* ========== CONSTANTES Y LABERINTO ========== */
const T = 16, COLS = 28, ROWS = 31, OY = 48, W = COLS * T, H = OY + ROWS * T + 32;
const BASE = 9.5; // tiles/seg al 100%
const MAP = [
'############################',
'#............##............#',
'#.####.#####.##.#####.####.#',
'#o####.#####.##.#####.####o#',
'#.####.#####.##.#####.####.#',
'#..........................#',
'#.####.##.########.##.####.#',
'#.####.##.########.##.####.#',
'#......##....##....##......#',
'######.##### ## #####.######',
'######.##### ## #####.######',
'######.##          ##.######',
'######.## ###--### ##.######',
'######.## #      # ##.######',
'T     .   #      #   .     T',
'######.## #      # ##.######',
'######.## ######## ##.######',
'######.##          ##.######',
'######.## ######## ##.######',
'######.## ######## ##.######',
'#............##............#',
'#.####.#####.##.#####.####.#',
'#.####.#####.##.#####.####.#',
'#o..##.......  .......##..o#',
'###.##.##.########.##.##.###',
'###.##.##.########.##.##.###',
'#......##....##....##......#',
'#.##########.##.##########.#',
'#.##########.##.##########.#',
'#..........................#',
'############################'];
const DIRS = [[0,-1],[-1,0],[0,1],[1,0]];
const NOUP = new Set(['12,11','15,11','12,23','15,23']);
const SCHED = [7,20,7,20,5,20,5,Infinity];
const FRUIT_PTS = [100,300,500,700,1000,2000,3000,5000];

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
ctx.font = '10px "Press Start 2P", "Courier New", monospace';
ctx.textBaseline = 'middle';

let grid, TOTAL;
const pac = {};
const ghosts = [
  {id:0, color:'#ff0000', corner:[25,-3], thr:0},
  {id:1, color:'#ffb8ff', corner:[2,-3],  thr:0},
  {id:2, color:'#00ffff', corner:[27,34], thr:30},
  {id:3, color:'#ffb851', corner:[0,34],  thr:60}
];
const game = {state:'title', t:0, score:0, hi:0, lives:3, level:1, timer:0, freeze:0, fr:0, mi:0, mt:0,
              eaten:0, rel:0, idle:0, combo:0, fruit:null, pop:null, extra:false, dots:0};
try { game.hi = +localStorage.getItem('pacman-hi') || 0; } catch (e) {}

/* ========== AUDIO: emulación del chip Namco WSG + driver de sonido del ROM original ==========
   El hardware real tiene 3 voces que leen tablas de 32 muestras de 4 bits a 96 kHz. Aquí se emula ese chip
   y se ejecuta la lógica del driver del Z80 (tablas de efectos y partituras del ROM) fotograma a fotograma (60 Hz). */
const A = {c: null, k: '', w: 0, buf: {}, amb: null};
const WAVES = [
  [7,9,10,11,12,13,13,14,14,14,13,13,12,11,10,9,7,5,4,3,2,1,1,0,0,0,1,1,2,3,4,5],
  [7,12,14,14,13,11,9,10,11,11,10,9,6,4,3,5,7,9,11,10,8,5,4,3,3,4,5,3,1,0,0,2],
  [7,10,12,13,14,13,12,10,7,4,2,1,0,1,2,4,7,11,13,14,13,11,7,3,1,0,1,3,7,14,7,0],
  [7,13,11,6,11,13,9,6,11,14,12,7,9,10,6,2,7,12,8,4,5,7,2,0,3,8,5,1,3,6,3,1],
  [0,8,15,7,1,8,14,7,2,8,13,7,3,8,12,7,4,8,11,7,5,8,10,7,6,8,9,7,7,8,8,7],
  [7,8,6,9,5,10,4,11,3,12,2,13,1,14,0,15,0,15,1,14,2,13,3,12,4,11,5,10,6,9,7,8]
];
// Ondas 6 y 7 (sirena, fruta): no pude encontrar sus valores exactos, se aproximan con una onda suave
WAVES[6] = WAVES[7] = Array.from({length: 32}, (_, i) =>
  Math.max(0, Math.min(15, Math.round(7.5 + 5.6 * Math.sin(i * Math.PI / 16) + 1.4 * Math.sin(i * 3 * Math.PI / 16)))));
const FT = [0,0x57,0x5C,0x61,0x67,0x6D,0x74,0x7B,0x82,0x8A,0x92,0x9A,0xA3,0xAD,0xB8,0xC3]; // tabla de notas del ROM
// Efectos del ROM (8 bytes c/u): [onda|desplazamiento, frec. base, incremento, duración|inversión, incr. por repetición, repeticiones, volumen|tipo, incr. volumen]
const EFX = {
  siren0: [0x36,0x20,4,0x8C,0,0,6,0], siren1: [0x36,0x28,5,0x8B,0,0,6,0], siren2: [0x36,0x30,6,0x8A,0,0,6,0],
  siren3: [0x36,0x3C,7,0x89,0,0,6,0], siren4: [0x36,0x48,8,0x88,0,0,6,0],
  fright: [0x24,0,6,8,0,0,0x0A,0], eyes: [0x40,0x70,0xFA,0x10,0,0,0x0A,0],
  wakaA: [0x42,0x18,0xFD,6,0,1,0x0C,0], wakaB: [0x42,4,3,6,0,1,0x0C,0],
  fruit: [0x56,0x0C,0xFF,0x8C,0,2,0x0F,0], ghost: [5,0,2,0x20,0,1,0x0C,0],
  death: [0x41,0x20,0xFF,0x86,0xFE,0x1C,0x0F,0xFF], life: [0x73,0x20,0,0x0C,0,0x0A,0x1F,0]
};
// Música de inicio (voz 1 = bajo, voz 2 = melodía), bytes del ROM
const SONG_BASS = [0xF1,2,0xF2,3,0xF3,15,0xF4,1, 0x82,0x70,0x69,0x82,0x70,0x69,0x83,0x70,0x6A,0x83,0x70,0x6A,
  0x82,0x70,0x69,0x82,0x70,0x69,0x89,0x8B,0x8D,0x8E,0xFF];
const SONG_MEL = [0xF1,0,0xF2,2,0xF3,15,0xF4,0, 0x42,0x50,0x4E,0x50,0x49,0x50,0x46,0x50,0x4E,0x49,0x70,0x66,0x70,
  0x43,0x50,0x4F,0x50,0x4A,0x50,0x47,0x50,0x4F,0x4A,0x70,0x67,0x70, 0x42,0x50,0x4E,0x50,0x49,0x50,0x46,0x50,0x4E,0x49,0x70,0x66,0x70,
  0x45,0x46,0x47,0x50,0x47,0x48,0x49,0x50,0x49,0x4A,0x4B,0x50,0x6E,0xFF];

function effGen(b) { // rutina "process effect" del Z80: devuelve un generador de parámetros por fotograma
  let [t0, t1, t2, t3, t4, t5, t6, t7] = b;
  let dur = t3 & 127, base = t1, type = (t6 >> 4) & 15, vol = (type & 8) ? 0 : t6, flip = 0, done = false;
  const w = t0 & 7, sh = (t0 & 0x70) >> 4;
  return () => {
    if (done) return null;
    dur = (dur - 1) & 255;
    if (!dur) {
      if (t5 && !--t5) { done = true; return null; }
      dur = t3 & 127; let reset = true;
      if (t3 & 128) { t2 = (-t2) & 255; if (!flip) { flip = 1; reset = false; } else flip = 0; }
      if (reset) { t1 = (t1 + t4) & 255; base = t1; t6 = (t6 + t7) & 255; if (!(type & 8)) vol = t6; }
    }
    base = (base + t2) & 255;
    if (type === 1) vol = (vol & 15) ? (vol & 15) - 1 : 0;
    return {f: (base << sh) & 0xFFFF, v: vol & 15, w};
  };
}
function songGen(d) { // rutina "process wave" del Z80
  let p = 0, w = 0, inc = 0, vol = 0, type = 0, dur = 1, base = 0, dir = 0, cv = 0, end = false;
  return () => {
    if (end) return null;
    if (!--dur) {
      for (;;) {
        const b = d[p++];
        if (b === undefined || b === 0xFF) { end = true; return null; }
        if (b >= 0xF0) { const a = d[p++]; if (b === 0xF1) w = a; else if (b === 0xF2) inc = a; else if (b === 0xF3) vol = a; else if (b === 0xF4) type = a; continue; }
        if (b & 0x1F) { dir = b; base = FT[b & 15]; }
        cv = (type & 8) ? 0 : vol; dur = 1 << (b >> 5); break;
      }
    }
    if (type === 1) cv = (cv & 15) ? (cv & 15) - 1 : 0;
    return {f: (base << ((dir & 0x10 ? 1 : 0) + inc)) & 0xFFFF, v: cv & 15, w};
  };
}
function mk(gens, big, maxF) { // emulación del WSG: acumulador de 20 bits, 96 kHz, 1600 muestras por fotograma
  const SPF = 1600, segs = [], acc = gens.map(() => 0);
  for (let f = 0; f < maxF; f++) {
    const ps = gens.map(g => g());
    if (!ps.some(Boolean)) break;
    const seg = new Float32Array(SPF);
    ps.forEach((p, i) => {
      if (!p || !p.v || !p.f) return;
      const st = p.f * (big[i] ? 1 : 16), wv = WAVES[p.w]; let a = acc[i];
      for (let s = 0; s < SPF; s++) { a = (a + st) & 0xFFFFF; seg[s] += (wv[a >> 15] - 7.5) * p.v / 112.5 * 0.3; }
      acc[i] = a;
    });
    segs.push(seg);
  }
  const b = A.c.createBuffer(1, Math.max(1, segs.length) * SPF, 96000), ch = b.getChannelData(0);
  segs.forEach((sg, i) => ch.set(sg, i * SPF));
  return b;
}
function snd(name, delay = 0) {
  if (!A.c) return null;
  const e = EFX[name], loop = !!e && !e[5];
  if (!A.buf[name]) {
    if (name === 'start') A.buf[name] = mk([songGen(SONG_BASS), songGen(SONG_MEL)], [true, false], 600);
    else { const cyc = (e[3] & 128 ? 2 : 1) * (e[3] & 127); A.buf[name] = mk([effGen(e)], [name === 'life'], loop ? cyc * Math.ceil(48 / cyc) : 600); }
  }
  const s = A.c.createBufferSource(); s.buffer = A.buf[name]; s.loop = loop; s.connect(A.m);
  s.start(A.c.currentTime + delay); return s;
}
function initAudio() {
  if (A.c) { if (A.c.state === 'suspended') A.c.resume(); return; }
  A.c = new (window.AudioContext || window.webkitAudioContext)();
  A.m = A.c.createGain(); A.m.gain.value = 1; A.m.connect(A.c.destination);
}
function stopAmb() { if (A.amb) { try { A.amb.stop(); } catch (e) {} A.amb = null; } }
function sirenLevel() { const d = game.dots; return d > 120 ? 0 : d > 80 ? 1 : d > 40 ? 2 : d > 20 ? 3 : 4; }
function sirenSet(kind) {
  if (!A.c) return;
  stopAmb();
  if (kind !== 'off') A.amb = snd(kind === 'f' ? 'fright' : kind === 'e' ? 'eyes' : 'siren' + sirenLevel());
}
function sirenOff() { if (A.k !== 'off') { A.k = 'off'; stopAmb(); } }
const sfx = {
  waka() { A.w ^= 1; snd(A.w ? 'wakaA' : 'wakaB'); },
  ghost() { snd('ghost'); }, fruit() { snd('fruit'); }, life() { snd('life'); },
  ready() { snd('start'); }, death() { snd('death', 0.9); }
};

/* ========== UTILIDADES DE JUEGO ========== */
function lvl() {
  const l = game.level;
  return {p: l < 2 ? .8 : l < 5 ? .9 : 1, pf: l < 2 ? .9 : l < 5 ? .95 : 1,
          g: l < 2 ? .75 : l < 5 ? .85 : .95, f: l < 2 ? .5 : l < 5 ? .55 : .6, t: .4,
          fr: Math.max(0, 7 - l)};
}
function wall(c, r, g) {
  if (r === 14 && (c < 0 || c >= COLS)) return false;
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
  const ch = grid[r][c];
  if (ch === '#') return true;
  if (ch === '-') return !(g && g.state === 'eaten');
  return false;
}
function add(n) {
  game.score += n;
  if (!game.extra && game.score >= 10000) { game.extra = true; game.lives++; sfx.life(); }
  if (game.score > game.hi) game.hi = game.score;
}
// Movimiento por cuadrícula: avanza hasta el siguiente centro de celda y decide giro allí
function step(e, dist, choose) {
  let guard = 0;
  while (dist > 1e-9 && guard++ < 8) {
    const cx = Math.round(e.x), cy = Math.round(e.y);
    if (Math.abs(e.x - cx) < 1e-6 && Math.abs(e.y - cy) < 1e-6) { e.x = cx; e.y = cy; choose(e, cx, cy); }
    if (!e.dx && !e.dy) return;
    const horiz = !!e.dx, v = horiz ? e.x : e.y, dir = horiz ? e.dx : e.dy;
    const t = dir > 0 ? Math.floor(v + 1e-6) + 1 : Math.ceil(v - 1e-6) - 1;
    const d = Math.abs(t - v), m = Math.min(d, dist);
    if (horiz) e.x = m === d ? t : e.x + dir * m; else e.y = m === d ? t : e.y + dir * m;
    dist -= m;
    if (e.dx < 0 && e.x <= -1 + 1e-6) e.x = COLS;
    else if (e.dx > 0 && e.x >= COLS - 1e-6) e.x = -1;
  }
}

/* ========== PAC-MAN ========== */
function pacChoose(e, c, r) {
  if ((e.bx || e.by) && !wall(c + e.bx, r + e.by)) { e.dx = e.bx; e.dy = e.by; }
  if (wall(c + e.dx, r + e.dy)) { e.dx = 0; e.dy = 0; }
}

/* ========== FANTASMAS (IA original) ========== */
function target(g) {
  if (g.state === 'eaten') return [13, 14];
  if (game.mi % 2 === 0) return g.corner;
  const px = Math.round(pac.x), py = Math.round(pac.y), dx = pac.fdx, dy = pac.fdy;
  switch (g.id) {
    case 0: return [px, py];                                   // Blinky: persecución directa
    case 1: { let tx = px + 4 * dx; const ty = py + 4 * dy;    // Pinky: emboscada (4 casillas + bug de "arriba")
              if (dy === -1) tx -= 4; return [tx, ty]; }
    case 2: { let ax = px + 2 * dx; const ay = py + 2 * dy;    // Inky: vector desde Blinky duplicado
              if (dy === -1) ax -= 2;
              const b = ghosts[0]; return [2 * ax - Math.round(b.x), 2 * ay - Math.round(b.y)]; }
    default: { const d = (px - g.x) ** 2 + (py - g.y) ** 2;    // Clyde: tímido a menos de 8 casillas
               return d > 64 ? [px, py] : g.corner; }
  }
}
function ghostChoose(g, c, r) {
  if (g.state === 'eaten' && c === 13 && r === 14) { g.state = 'leaving'; g.dx = 0; g.dy = 0; return; }
  const opts = [];
  for (const [dx, dy] of DIRS) {
    if ((g.dx || g.dy) && dx === -g.dx && dy === -g.dy) continue;
    if (wall(c + dx, r + dy, g)) continue;
    if (dy === -1 && !g.fright && g.state === 'normal' && NOUP.has(c + ',' + r)) continue;
    opts.push([dx, dy]);
  }
  if (!opts.length) { g.dx = -g.dx; g.dy = -g.dy; return; }
  let best = opts[0];
  if (g.fright && g.state === 'normal') best = opts[Math.floor(Math.random() * opts.length)];
  else {
    const t = target(g); let bd = 1e9;
    for (const o of opts) {
      const d = (c + o[0] - t[0]) ** 2 + (r + o[1] - t[1]) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
  }
  g.dx = best[0]; g.dy = best[1];
}
function updGhost(g, dt, L) {
  if (g.state === 'house') {
    g.y += g.bd * 3 * dt;
    if (g.y < 13.5) { g.y = 13.5; g.bd = 1; } else if (g.y > 14.5) { g.y = 14.5; g.bd = -1; }
    return;
  }
  if (g.state === 'leaving') { // sale por la puerta hacia (13.5, 11)
    const d = BASE * 0.5 * dt;
    if (Math.abs(g.x - 13.5) > 0.02) g.x += Math.sign(13.5 - g.x) * Math.min(d, Math.abs(13.5 - g.x));
    else { g.x = 13.5; g.y -= d; if (g.y <= 11) { g.y = 11; g.state = 'normal'; g.dx = -1; g.dy = 0; } }
    return;
  }
  const tun = Math.round(g.y) === 14 && (g.x < 5.5 || g.x > 21.5);
  const sp = g.state === 'eaten' ? 1.3 : g.fright ? L.f : tun ? L.t : L.g;
  step(g, BASE * sp * dt, ghostChoose);
}

/* ========== FLUJO DEL JUEGO ========== */
function newGame() {
  Object.assign(game, {score: 0, lives: 3, level: 1, extra: false});
  newLevel();
}
function newLevel() {
  grid = MAP.map(r => r.replace('T', ' ').replace('T', ' ').split(''));
  TOTAL = grid.flat().filter(c => c === '.' || c === 'o').length;
  Object.assign(game, {dots: TOTAL, eaten: 0, mi: 0, mt: 0, fr: 0, fruit: null, pop: null, freeze: 0});
  resetActors(); ready(game.level === 1);
}
function resetActors() {
  Object.assign(pac, {x: 13.5, y: 23, dx: -1, dy: 0, bx: -1, by: 0, fdx: -1, fdy: 0, pause: 0});
  const st = [[13.5,11,'normal'], [13.5,14,'house'], [11.5,14,'house'], [15.5,14,'house']];
  ghosts.forEach((g, i) => Object.assign(g, {x: st[i][0], y: st[i][1], state: st[i][2],
    dx: i === 0 ? -1 : 0, dy: 0, fright: false, bd: -1}));
  game.rel = 0; game.idle = 0; game.fr = 0; game.fruit = null; game.pop = null; game.freeze = 0;
}
function ready(first) {
  game.state = 'ready'; game.timer = first ? 4.3 : 2;
  if (first) sfx.ready();
}
function die() {
  game.state = 'dying'; game.timer = 3.7; game.fruit = null; sirenOff(); sfx.death();
}
function fright() {
  const L = lvl(); game.combo = 0;
  if (L.fr <= 0) return;
  game.fr = L.fr;
  ghosts.forEach(g => {
    if (g.state === 'eaten') return;
    g.fright = true;
    if (g.state === 'normal') { g.dx = -g.dx; g.dy = -g.dy; }
  });
}
function eatTile() {
  const c = Math.round(pac.x), r = Math.round(pac.y);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  const ch = grid[r][c];
  if (ch !== '.' && ch !== 'o') return;
  grid[r][c] = ' '; game.dots--; game.eaten++; game.rel++; game.idle = 0;
  add(ch === '.' ? 10 : 50); sfx.waka();
  pac.pause = (ch === 'o' ? 3 : 1) / 60;
  if (ch === 'o') fright();
  if ((game.eaten === 70 || game.eaten === 170) && !game.fruit)
    game.fruit = {t: 9.5, i: Math.min(game.level - 1, 7)};
}
function collisions() {
  for (const g of ghosts) {
    if (g.state === 'eaten') continue;
    if (Math.hypot(g.x - pac.x, g.y - pac.y) > 0.65) continue;
    if (g.fright) {
      g.state = 'eaten'; g.fright = false;
      const pts = 200 * 2 ** Math.min(game.combo++, 3);
      add(pts); sfx.ghost(); game.freeze = 0.6;
      game.pop = {x: g.x, y: g.y, s: String(pts), t: 1, c: '#0ff'};
    } else { die(); return; }
  }
}
function tryRelease(dt) {
  game.idle += dt;
  const g = ghosts.find(g => g.state === 'house');
  if (g && (game.rel >= g.thr || game.idle > 4)) {
    g.state = 'leaving'; g.y = 14; g.dx = 0; g.dy = 0; game.idle = 0;
  }
}
function play(dt) {
  if (game.freeze > 0) { game.freeze -= dt; return; }
  const L = lvl();
  if (game.fr > 0) {
    game.fr -= dt;
    if (game.fr <= 0) { game.fr = 0; ghosts.forEach(g => g.fright = false); }
  } else {
    game.mt += dt;
    if (game.mt >= SCHED[game.mi]) {
      game.mt = 0; game.mi++;
      ghosts.forEach(g => { if (g.state === 'normal') { g.dx = -g.dx; g.dy = -g.dy; } });
    }
  }
  if (pac.pause > 0) pac.pause -= dt;
  else step(pac, BASE * (game.fr > 0 ? L.pf : L.p) * dt, pacChoose);
  if (pac.dx || pac.dy) { pac.fdx = pac.dx; pac.fdy = pac.dy; }
  eatTile();
  tryRelease(dt);
  ghosts.forEach(g => updGhost(g, dt, L));
  collisions();
  if (game.state !== 'play') return;
  if (game.fruit) {
    game.fruit.t -= dt;
    if (Math.hypot(pac.x - 13.5, pac.y - 17) < 0.9) {
      const p = FRUIT_PTS[game.fruit.i]; add(p); sfx.fruit();
      game.pop = {x: 13.5, y: 17, s: String(p), t: 2, c: '#f9f'}; game.fruit = null;
    } else if (game.fruit.t <= 0) game.fruit = null;
  }
  if (game.dots <= 0) { game.state = 'win'; game.timer = 2.2; sirenOff(); return; }
  let k = game.fr > 0 ? 'f' : 'n';
  if (ghosts.some(g => g.state === 'eaten')) k = 'e';
  const key = k + (k === 'n' ? sirenLevel() : '');
  if (key !== A.k) { A.k = key; sirenSet(k); }
}
function update(dt) {
  game.t += dt;
  if (game.pop && (game.pop.t -= dt) <= 0) game.pop = null;
  if (game.state !== 'play') sirenOff();
  switch (game.state) {
    case 'ready': if ((game.timer -= dt) <= 0) game.state = 'play'; break;
    case 'play': play(dt); break;
    case 'dying':
      if ((game.timer -= dt) <= 0) {
        if (--game.lives > 0) { resetActors(); ready(false); }
        else { game.state = 'gameover'; try { localStorage.setItem('pacman-hi', game.hi); } catch (e) {} }
      }
      break;
    case 'win': if ((game.timer -= dt) <= 0) { game.level++; newLevel(); } break;
  }
}

/* ========== RENDER ========== */
function buildWalls(color) {
  const c = document.createElement('canvas'); c.width = W; c.height = ROWS * T;
  const x = c.getContext('2d');
  const isW = (cc, rr) => (cc < 0 || cc >= COLS)
    ? (cc >= -2 && cc < COLS + 2 && ((rr >= 9 && rr <= 13) || (rr >= 15 && rr <= 19)))
    : (rr >= 0 && rr < ROWS && MAP[rr][cc] === '#');
  const wl = (cc, rr) => cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && MAP[rr][cc] === '#';
  const inS = (i, j) => isW(i, j) && isW(i + 1, j) && isW(i, j + 1) && isW(i + 1, j + 1);
  const covered = (cc, rr) => inS(cc, rr) || inS(cc - 1, rr) || inS(cc, rr - 1) || inS(cc - 1, rr - 1);
  const thin = (cc, rr) => wl(cc, rr) && !covered(cc, rr);
  const key = (i, j) => i + ',' + j, P = (u, v) => [(u + 0.5) * T, (v + 0.5) * T];
  // Bloques gruesos conectados entre sí: los que tocan el borde del mapa (tabs, túneles, tronco superior)
  // son parte del muro exterior y se dibujan con doble línea, unidos al borde.
  const comp = new Map(), outer = {}; let cid = 0;
  for (let j = 0; j < ROWS; j++) for (let i = -2; i <= COLS; i++) {
    if (!inS(i, j) || comp.has(key(i, j))) continue;
    cid++; comp.set(key(i, j), cid); const st = [[i, j]];
    while (st.length) {
      const [a, b] = st.pop();
      if (a <= 0 || a >= COLS - 2 || b === 0 || b >= ROWS - 2) outer[cid] = true;
      for (const [da, db] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const na = a + da, nb = b + db;
        if (inS(na, nb) && !comp.has(key(na, nb))) { comp.set(key(na, nb), cid); st.push([na, nb]); }
      }
    }
  }
  const seg = [], E = new Map();
  const add = (a, b, c2, d, o) => {
    if (o) {
      if ((a === c2 && (a === 0 || a === COLS - 1)) || (b === d && (b === 0 || b === ROWS - 1))) return;
      seg.push([a, b, c2, d]); return;
    }
    const k = key(a, b); if (!E.has(k)) E.set(k, []); E.get(k).push([c2, d]);
  };
  for (let j = 0; j < ROWS; j++) for (let i = -2; i <= COLS; i++) {
    if (!inS(i, j)) continue;
    const o = outer[comp.get(key(i, j))];
    if (!inS(i, j - 1)) add(i, j, i + 1, j, o);
    if (!inS(i + 1, j)) add(i + 1, j, i + 1, j + 1, o);
    if (!inS(i, j + 1)) add(i + 1, j + 1, i, j + 1, o);
    if (!inS(i - 1, j)) add(i, j + 1, i, j, o);
  }
  // Paredes finas (borde, casa): se unen al muro exterior
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
    if (!thin(cc, r)) continue;
    seg.push([cc, r, cc, r]);
    for (const [dx, dy] of [[1,0],[0,1],[-1,0],[0,-1]]) if (wl(cc + dx, r + dy)) seg.push([cc, r, cc + dx, r + dy]);
  }
  const strokeSeg = (w, col) => {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
    for (const [a, b, c2, d] of seg) { const p = P(a, b), q = P(c2, d); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); }
    x.stroke();
  };
  strokeSeg(9, color); strokeSeg(5, '#000');
  // Bloques interiores: contorno simple a media celda con esquinas redondeadas
  x.strokeStyle = color; x.lineWidth = 2; x.fillStyle = '#000';
  while (E.size) {
    const k = E.keys().next().value, [sx0, sy0] = k.split(',').map(Number);
    const pts = [[sx0, sy0]]; let cx = sx0, cy = sy0;
    for (;;) {
      const kk = cx + ',' + cy, l = E.get(kk); if (!l) break;
      const n = l.pop(); if (!l.length) E.delete(kk);
      cx = n[0]; cy = n[1]; if (cx === sx0 && cy === sy0) break; pts.push([cx, cy]);
    }
    const q = pts.filter((pt, i) => {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
      return (pt[0] - a[0]) * (b[1] - pt[1]) !== (pt[1] - a[1]) * (b[0] - pt[0]);
    });
    if (q.length < 3) continue;
    const m = q.map(pt => P(pt[0], pt[1])), n = m.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const st = mid(m[n - 1], m[0]);
    x.beginPath(); x.moveTo(st[0], st[1]);
    for (let i = 0; i < n; i++) { const a = m[i], e = mid(a, m[(i + 1) % n]); x.arcTo(a[0], a[1], e[0], e[1], 6); }
    x.closePath(); x.fill(); x.stroke();
  }
  // Puerta de la casa (rosa del ROM de colores)
  x.strokeStyle = '#ffb8ff'; x.lineWidth = 3; x.lineCap = 'butt';
  x.beginPath(); x.moveTo(12 * T + 10, 12 * T + 8); x.lineTo(15 * T + 6, 12 * T + 8); x.stroke();
  return c;
}
const wallsB = buildWalls('#2121ff'), wallsW = buildWalls('#dedeff');

function txt(s, x, y, c = '#dedeff', a = 'left') { ctx.fillStyle = c; ctx.textAlign = a; ctx.fillText(s, x, y); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
const sx = x => (x + 0.5) * T, sy = y => OY + (y + 0.5) * T;

const F = n => n + 'px "Press Start 2P", "Courier New", monospace';
function drawFruit(i, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4);
  ctx.fillStyle = ['#f00','#f33','#fa0','#e22','#4c4','#ff0','#fd0','#6cf'][i];
  if (i === 0) {
    circle(-3, 3, 3.5); circle(3, 4, 3.5);
    ctx.strokeStyle = '#4c4'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-3, 0); ctx.lineTo(1, -6); ctx.lineTo(3, 1); ctx.stroke();
  } else if (i === 7) { ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-1, -6, 5, 2); ctx.fillRect(-1, 2, 4, 2); }
  else if (i === 5) { ctx.fillRect(-5, -4, 10, 3); ctx.fillStyle = '#f00'; ctx.fillRect(-1, -1, 2, 7); }
  else { circle(0, 1, 5.5); ctx.fillStyle = '#4c4'; ctx.fillRect(-1, -7, 2, 3); }
  ctx.restore();
}
function drawPac(x, y, mouth, ang, r = 13) {
  ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.moveTo(x, y);
  ctx.arc(x, y, r, ang + mouth, ang + Math.PI * 2 - mouth); ctx.closePath(); ctx.fill();
}
function drawGhost(g) {
  ctx.save(); ctx.translate(sx(g.x), sy(g.y)); ctx.scale(1.75, 1.75);
  const fl = g.fright && g.state !== 'eaten', white = fl && game.fr < 2 && Math.floor(game.t * 6) % 2;
  if (g.state !== 'eaten') {
    ctx.fillStyle = fl ? (white ? '#dedeff' : '#2121ff') : g.color;
    ctx.beginPath(); ctx.arc(0, -1, 7, Math.PI, 0); ctx.lineTo(7, 7);
    const w = Math.floor(game.t * 8) % 2;
    for (let i = 1; i <= 6; i++) ctx.lineTo(7 - i * 14 / 6, (i + w) % 2 ? 4.5 : 7);
    ctx.closePath(); ctx.fill();
  }
  if (fl) {
    ctx.fillStyle = white ? '#f00' : '#ffb8ae';
    ctx.fillRect(-3.5, -3, 2, 2.4); ctx.fillRect(1.5, -3, 2, 2.4);
    for (let i = 0; i < 4; i++) ctx.fillRect(-5 + i * 2.6, i % 2 ? 2 : 3, 2, 1.2);
  } else {
    ctx.fillStyle = '#dedeff'; circle(-3, -2, 2.6); circle(3, -2, 2.6);
    ctx.fillStyle = '#21f'; circle(-3 + g.dx * 1.4, -2 + g.dy * 1.4, 1.3); circle(3 + g.dx * 1.4, -2 + g.dy * 1.4, 1.3);
  }
  ctx.restore();
}
function hud() {
  ctx.font = F(10);
  txt('1UP', 87, 16, Math.floor(game.t * 2) % 2 || game.state !== 'play' ? '#dedeff' : '#000');
  txt(String(game.score || '00'), 128, 33, '#dedeff', 'right');
  txt('HIGH SCORE', 157, 16);
  txt(String(game.hi || '00'), 234, 33, '#dedeff', 'right');
  const by = OY + ROWS * T + 16;
  for (let i = 0; i < game.lives - 1; i++) drawPac(40 + i * 26, by, 0.5, Math.PI, 11);
  const n = Math.min(game.level, 7);
  for (let i = 0; i < n; i++) drawFruit(Math.min(game.level - n + i, 7), W - 50 - (n - 1 - i) * 26, by);
}
function draw() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  hud();
  const s = game.state;
  const flash = s === 'win' && Math.floor(game.timer * 4) % 2 === 0;
  ctx.drawImage(flash ? wallsW : wallsB, 0, OY);
  const blink = Math.floor(game.t * 4) % 2;
  ctx.fillStyle = '#ffb8ae';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = grid[r][c];
    if (ch === '.') circle(sx(c), sy(r), 1.7);
    else if (ch === 'o' && (blink || s !== 'play')) circle(sx(c), sy(r), 7);
  }
  if (game.fruit) drawFruit(game.fruit.i, sx(13.5), sy(17));
  if (s === 'win') drawPac(sx(pac.x), sy(pac.y), 0.25, Math.atan2(pac.fdy, pac.fdx));
  else if (s === 'dying') {
    if (game.timer > 2.8) ghosts.forEach(drawGhost);
    const p = Math.min(1, Math.max(0, (3.7 - game.timer - 0.9) / 1.6));
    drawPac(sx(pac.x), sy(pac.y), p * Math.PI, -Math.PI / 2);
  } else if (s !== 'gameover') {
    ghosts.forEach(drawGhost);
    const moving = pac.dx || pac.dy;
    const m = s === 'play' && moving ? 0.05 + Math.abs(Math.sin(game.t * 16)) * 0.65 : 0.3;
    if (s === 'ready' || !(game.freeze > 0 && game.pop && game.pop.c === '#0ff'))
      drawPac(sx(pac.x), sy(pac.y), m, Math.atan2(pac.fdy, pac.fdx));
  }
  if (game.pop) { ctx.font = F(8); txt(game.pop.s, sx(game.pop.x), sy(game.pop.y), game.pop.c, 'center'); }
  if (s === 'ready') { ctx.font = F(12); txt('READY!', 14 * T, sy(17), '#ff0', 'center'); }
  if (s === 'gameover') {
    ctx.font = F(12); txt('GAME  OVER', 14 * T, sy(17), '#f00', 'center');
    ctx.font = F(8); txt('ENTER = JUGAR OTRA VEZ', 14 * T, sy(21), '#dedeff', 'center');
  }
  if (s === 'title') {
    ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(0, OY + 8 * T, W, 12 * T);
    ctx.font = F(26); txt('PAC-MAN', 14 * T, OY + 11 * T, '#ff0', 'center');
    ctx.font = F(10);
    if (Math.floor(game.t * 2) % 2) txt('PRESIONA ENTER', 14 * T, OY + 15 * T, '#dedeff', 'center');
    ctx.font = F(8); txt('FLECHAS / WASD PARA MOVER', 14 * T, OY + 18 * T, '#aaa', 'center');
  }
}

/* ========== ENTRADA ========== */
const KEYS = {ArrowUp:[0,-1], w:[0,-1], W:[0,-1], ArrowLeft:[-1,0], a:[-1,0], A:[-1,0],
              ArrowDown:[0,1], s:[0,1], S:[0,1], ArrowRight:[1,0], d:[1,0], D:[1,0]};
function setDir(d) {
  pac.bx = d[0]; pac.by = d[1];
  // Inversión instantánea de sentido
  if ((pac.dx || pac.dy) && pac.dx === -d[0] && pac.dy === -d[1]) { pac.dx = d[0]; pac.dy = d[1]; }
}
function startIfNeeded() {
  if (game.state === 'title' || game.state === 'gameover') { newGame(); return true; }
  return false;
}
addEventListener('keydown', e => {
  initAudio();
  if (e.key === 'Enter' || e.key === ' ') { startIfNeeded(); e.preventDefault(); return; }
  if (KEYS[e.key]) { setDir(KEYS[e.key]); e.preventDefault(); }
});
let ts = null;
addEventListener('touchstart', e => { initAudio(); ts = [e.touches[0].clientX, e.touches[0].clientY]; startIfNeeded(); }, {passive: true});
addEventListener('touchend', e => {
  if (!ts) return;
  const dx = e.changedTouches[0].clientX - ts[0], dy = e.changedTouches[0].clientY - ts[1];
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 20)
    setDir(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
  ts = null;
});

/* ========== BUCLE PRINCIPAL ========== */
if (document.fonts) document.fonts.load('10px "Press Start 2P"');
newGame(); game.state = 'title'; sirenOff();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (game.state !== 'title') update(dt); else game.t += dt;
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
