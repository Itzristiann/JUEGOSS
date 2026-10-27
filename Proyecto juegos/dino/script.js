/* ==========================================================================
   Chrome T-Rex — script.js
   Todas las coordenadas del sprite fueron medidas píxel a píxel sobre
   chrome-dino-sprite.png (1233 x 100).
   ========================================================================== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const slowModeToggle = document.getElementById('slowModeToggle');

const W = canvas.width;   // 600
const H = canvas.height;  // 150
ctx.imageSmoothingEnabled = false;

/* --------------------------------------------------------------------------
   1) CARGA DEL SPRITE
   Antes la ruta era solo 'images/chrome-dino-sprite.png'. Si la imagen no
   está en esa carpeta, onload nunca se ejecutaba y no se dibujaba nada.
   Ahora prueba varias rutas y, si todas fallan, avisa en el propio canvas.
   -------------------------------------------------------------------------- */
const SPRITE_PATHS = ['chrome-dino-sprite.png', 'images/chrome-dino-sprite.png'];
let sprite = null;
let spriteReady = false;
let spriteFailed = false;

function loadSprite(index = 0) {
    const img = new Image();
    img.onload = () => { sprite = img; spriteReady = true; };
    img.onerror = () => {
        if (index + 1 < SPRITE_PATHS.length) {
            loadSprite(index + 1);
        } else {
            spriteFailed = true;
            console.error('No se pudo cargar el sprite. Rutas probadas:', SPRITE_PATHS);
        }
    };
    img.src = SPRITE_PATHS[index];
}
loadSprite();

/* --------------------------------------------------------------------------
   2) COORDENADAS DEL SPRITE (verificadas)
   -------------------------------------------------------------------------- */
const SPRITES = {
    // Dino: fotogramas de 44x47 que empiezan en x=848 y avanzan de 44 en 44
    DINO_WAIT:  { x: 848,  y: 2, w: 44, h: 47 },   // quieto, ojo abierto
    DINO_BLINK: { x: 892,  y: 2, w: 44, h: 47 },   // quieto, parpadeo
    DINO_RUN: [
        { x: 936,  y: 2, w: 44, h: 47 },           // pata izquierda  (antes 892: era el parpadeo)
        { x: 980,  y: 2, w: 44, h: 47 }            // pata derecha    (antes 936)
    ],
    DINO_JUMP:  { x: 848,  y: 2, w: 44, h: 47 },
    DINO_CRASH: { x: 1068, y: 2, w: 44, h: 47 },   // antes 1024 (no es el fotograma de choque)
    // Agachado: 59x47 completos (el dino ocupa la parte baja del recuadro)
    DINO_DUCK: [
        { x: 1112, y: 2, w: 59, h: 47 },           // antes x:1114 y:18 h:30
        { x: 1171, y: 2, w: 59, h: 47 }
    ],

    GROUND: { x: 2, y: 54, w: 1200, h: 12 },       // la franja completa mide 1200x12 (la línea está en la fila y=58)
    CLOUD:  { x: 86, y: 2, w: 46, h: 14 },

    CACTUS_SMALL: [
        { x: 228, y: 2, w: 17, h: 35 },
        { x: 245, y: 2, w: 34, h: 35 },
        { x: 279, y: 2, w: 51, h: 35 }
    ],
    CACTUS_LARGE: [
        { x: 332, y: 2, w: 25, h: 50 },
        { x: 357, y: 2, w: 50, h: 50 },
        { x: 407, y: 2, w: 75, h: 50 }
    ],
    PTERODACTYL: [
        { x: 134, y: 2, w: 46, h: 40 },
        { x: 180, y: 2, w: 46, h: 40 }
    ],

    // Dígitos 0-9 y letras H, I: cada glifo mide 10x13
    GLYPH_X: { '0': 655, '1': 665, '2': 675, '3': 685, '4': 695,
               '5': 705, '6': 715, '7': 725, '8': 735, '9': 745,
               'H': 755, 'I': 765 },
    GLYPH_Y: 2, GLYPH_W: 10, GLYPH_H: 13,

    TEXT_GAME_OVER: { x: 655, y: 15, w: 191, h: 11 },

    // Botón de reintentar: ANTES apuntaba a (2,2) -> dibujaba un dino.
    // El botón está en la fila y=68 y son 36x32 por fotograma.
    // x=2 y x=38 son iconos de Chrome (no se usan); la animación real
    // empieza en x=74 y termina en x=254 (6 fotogramas).
    RESTART: [74, 110, 146, 182, 218, 254].map(x => ({ x, y: 68, w: 36, h: 32 }))
};

/* --------------------------------------------------------------------------
   3) CONSTANTES DEL JUEGO
   -------------------------------------------------------------------------- */
const STEP_MS = 1000 / 60;       // la lógica corre siempre a 60 pasos/s (en cualquier monitor)
const GRAVITY = 0.6;
const JUMP_VELOCITY = -10;
const DINO_X = 20;
const DINO_GROUND_Y = 87;        // y del dino de pie: la planta de las patas queda sobre la línea del suelo
const FEET_Y = DINO_GROUND_Y + 47;
const HORIZON_Y = 127;           // la línea del suelo queda en y = 127 + 4 = 131
const MAX_SPEED = 13;
const ACCELERATION = 0.001;
const SCORE_COEFFICIENT = 0.025;
const CLEAR_TIME = 1000;         // ms sin obstáculos al empezar
const RESTART_DELAY = 500;       // ms antes de permitir reiniciar
const RESTART_FRAME_MS = 70;     // velocidad de la animación de reintentar
const GAME_OVER_Y = 42;
const RESTART_X = (W - 36) / 2;  // 282
const RESTART_Y = H / 2;         // 75

/* Cajas de colisión (las mismas proporciones que usa Chromium) */
const DINO_BOXES_RUN = [
    { x: 22, y: 0,  w: 17, h: 16 }, { x: 1,  y: 18, w: 30, h: 9 },
    { x: 10, y: 35, w: 14, h: 8 },  { x: 1,  y: 24, w: 29, h: 5 },
    { x: 5,  y: 30, w: 21, h: 4 },  { x: 9,  y: 34, w: 15, h: 4 }
];
const DINO_BOXES_DUCK = [{ x: 1, y: 18, w: 55, h: 25 }];

const OBSTACLE_TYPES = {
    cactusSmall: {
        w: 17, h: 35, y: FEET_Y - 35, minGap: 120, multipleSpeed: 4,
        sprites: SPRITES.CACTUS_SMALL,
        boxes: [{ x: 0, y: 7, w: 5, h: 27 }, { x: 4, y: 0, w: 6, h: 34 }, { x: 10, y: 4, w: 7, h: 14 }]
    },
    cactusLarge: {
        w: 25, h: 50, y: FEET_Y - 50, minGap: 120, multipleSpeed: 7,
        sprites: SPRITES.CACTUS_LARGE,
        boxes: [{ x: 0, y: 12, w: 7, h: 38 }, { x: 8, y: 0, w: 7, h: 49 }, { x: 13, y: 10, w: 10, h: 38 }]
    },
    bird: {
        w: 46, h: 40, yPositions: [94, 69, 44], minGap: 150,
        boxes: [{ x: 15, y: 15, w: 16, h: 5 }, { x: 18, y: 21, w: 24, h: 6 },
                { x: 2, y: 14, w: 4, h: 3 },   { x: 6, y: 10, w: 4, h: 7 },
                { x: 10, y: 8, w: 6, h: 9 }]
    }
};

/* --------------------------------------------------------------------------
   4) ESTADO
   state: 'waiting' (antes de empezar) | 'playing' | 'over'
   -------------------------------------------------------------------------- */
let state = 'waiting';
let score = 0;
let distance = 0;
let highScore = 0;
let gameSpeed = 6;
let gapCoefficient = 0.6;
let gameTime = 0;        // ms de juego (se congela al chocar)
let now = 0;             // reloj del navegador (rAF)
let overAt = 0;          // instante del choque
let groundX = 0;
let isDarkMode = false;
let downHeld = false;

const dino = { x: DINO_X, y: DINO_GROUND_Y, vy: 0, jumping: false, ducking: false };
let obstacles = [];
let clouds = [];

/* --------------------------------------------------------------------------
   5) UTILIDADES
   -------------------------------------------------------------------------- */
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function drawSprite(s, x, y) {
    // Math.round evita posiciones con decimales (que difuminan el pixel art)
    ctx.drawImage(sprite, s.x, s.y, s.w, s.h, Math.round(x), Math.round(y), s.w, s.h);
}

function drawSpriteText(text, x, y) {
    for (const ch of text) {
        const gx = SPRITES.GLYPH_X[ch];
        if (gx !== undefined) {
            ctx.drawImage(sprite, gx, SPRITES.GLYPH_Y, SPRITES.GLYPH_W, SPRITES.GLYPH_H,
                          x, y, SPRITES.GLYPH_W, SPRITES.GLYPH_H);
        }
        x += 11;
    }
}

function setNight(on) {
    if (on === isDarkMode) return;
    isDarkMode = on;
    document.body.classList.toggle('dark-mode', on);
}

/* --------------------------------------------------------------------------
   6) COLISIONES
   -------------------------------------------------------------------------- */
function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function checkCollision(ob) {
    const dw = dino.ducking ? 59 : 44;
    const dinoBox = { x: dino.x + 1, y: dino.y + 1, w: dw - 2, h: 45 };
    const obBox = { x: ob.x + 1, y: ob.y + 1, w: ob.w - 2, h: ob.h - 2 };
    if (!overlap(dinoBox, obBox)) return false;   // descarte rápido

    const dinoBoxes = dino.ducking ? DINO_BOXES_DUCK : DINO_BOXES_RUN;
    for (const db of dinoBoxes) {
        const a = { x: db.x + dino.x, y: db.y + dino.y, w: db.w, h: db.h };
        for (const ob2 of ob.boxes) {
            const b = { x: ob2.x + ob.x, y: ob2.y + ob.y, w: ob2.w, h: ob2.h };
            if (overlap(a, b)) return true;
        }
    }
    return false;
}

/* --------------------------------------------------------------------------
   7) CONTROL DE PARTIDA
   -------------------------------------------------------------------------- */
function startRun() {
    // Aquí se lee el interruptor SIEMPRE (antes la primera partida lo ignoraba)
    const slow = slowModeToggle.checked;
    state = 'playing';
    score = 0;
    distance = 0;
    gameTime = 0;
    gameSpeed = slow ? 3.5 : 6;
    gapCoefficient = slow ? 0.9 : 0.6;
    obstacles = [];
    clouds = [];
    groundX = 0;
    dino.y = DINO_GROUND_Y;
    dino.vy = 0;
    dino.jumping = false;
    dino.ducking = false;
    setNight(false);
}

function gameOver() {
    state = 'over';
    overAt = now;
    dino.ducking = false;
    highScore = Math.max(highScore, Math.floor(score));
}

function jump() {
    if (dino.jumping) return;
    dino.vy = JUMP_VELOCITY;
    dino.jumping = true;
    dino.ducking = false;
}

/* --------------------------------------------------------------------------
   8) GENERACIÓN DE OBJETOS
   -------------------------------------------------------------------------- */
function createObstacle() {
    const pool = ['cactusSmall', 'cactusLarge'];
    if (score > 120) pool.push('bird');
    const key = pool[randInt(0, pool.length - 1)];
    const t = OBSTACLE_TYPES[key];

    const ob = { type: key, x: W, y: t.y, w: t.w, h: t.h, boxes: t.boxes.map(b => ({ ...b })) };

    if (key === 'bird') {
        ob.y = t.yPositions[randInt(0, t.yPositions.length - 1)];
    } else {
        let size = randInt(1, 3);
        if (size > 1 && t.multipleSpeed > gameSpeed) size = 1;   // grupos de cactus solo con velocidad suficiente
        ob.w = t.w * size;
        ob.sprite = t.sprites[size - 1];
        if (size > 1) {
            ob.boxes[1].w = ob.w - ob.boxes[0].w - ob.boxes[2].w;
            ob.boxes[2].x = ob.w - ob.boxes[2].w;
        }
    }

    const minGap = Math.round(ob.w * gameSpeed + t.minGap * gapCoefficient);
    ob.gap = randInt(minGap, Math.round(minGap * 1.5));
    obstacles.push(ob);
}

function spawnObstacles() {
    if (gameTime < CLEAR_TIME) return;
    const last = obstacles[obstacles.length - 1];
    if (!last || last.x + last.w + last.gap < W) createObstacle();
}

function spawnClouds() {
    const last = clouds[clouds.length - 1];
    if (!last || last.x < W - randInt(120, 400)) {
        clouds.push({ x: W, y: randInt(10, 45), w: SPRITES.CLOUD.w, h: SPRITES.CLOUD.h });
    }
}

/* --------------------------------------------------------------------------
   9) ACTUALIZACIÓN (60 veces por segundo)
   -------------------------------------------------------------------------- */
function update() {
    gameTime += STEP_MS;

    dino.ducking = downHeld && !dino.jumping;

    if (dino.jumping) {
        dino.vy += GRAVITY;
        if (downHeld && dino.vy > 0) dino.vy += GRAVITY * 2;   // caída rápida con la flecha abajo
        dino.y += dino.vy;
        if (dino.y >= DINO_GROUND_Y) {
            dino.y = DINO_GROUND_Y;
            dino.vy = 0;
            dino.jumping = false;
        }
    }

    // Día / noche cada 200 puntos
    setNight(Math.floor(score / 200) % 2 === 1);

    clouds.forEach(c => c.x -= gameSpeed * 0.2);
    clouds = clouds.filter(c => c.x + c.w > 0);
    spawnClouds();

    groundX = (groundX + gameSpeed) % SPRITES.GROUND.w;

    obstacles.forEach(o => o.x -= gameSpeed);
    obstacles = obstacles.filter(o => o.x + o.w > 0);
    spawnObstacles();

    for (const o of obstacles) {
        if (checkCollision(o)) { gameOver(); return; }
    }

    distance += gameSpeed;
    score = distance * SCORE_COEFFICIENT;
    if (gameSpeed < MAX_SPEED) gameSpeed = Math.min(MAX_SPEED, gameSpeed + ACCELERATION);
}

/* --------------------------------------------------------------------------
   10) DIBUJO
   -------------------------------------------------------------------------- */
function currentDinoSprite() {
    if (state === 'over') return SPRITES.DINO_CRASH;
    if (state === 'waiting') return (now % 3000) < 160 ? SPRITES.DINO_BLINK : SPRITES.DINO_WAIT;
    if (dino.jumping) return SPRITES.DINO_JUMP;
    if (dino.ducking) return SPRITES.DINO_DUCK[Math.floor(gameTime / 125) % 2];
    return SPRITES.DINO_RUN[Math.floor(gameTime / 83) % 2];
}

function drawGround() {
    const g = SPRITES.GROUND;
    const off = Math.round(groundX);
    // La franja de 1200px se repite sin costuras
    ctx.drawImage(sprite, g.x, g.y, g.w, g.h, -off, HORIZON_Y, g.w, g.h);
    ctx.drawImage(sprite, g.x, g.y, g.w, g.h, g.w - off, HORIZON_Y, g.w, g.h);
}

function drawHUD() {
    drawSpriteText(String(Math.floor(score)).padStart(5, '0'), 534, 5);
    if (highScore > 0) {
        ctx.globalAlpha = 0.8;
        drawSpriteText('HI ' + String(highScore).padStart(5, '0'), 424, 5);
        ctx.globalAlpha = 1;
    }
}

function drawGameOver() {
    const g = SPRITES.TEXT_GAME_OVER;
    drawSprite(g, Math.round((W - g.w) / 2), GAME_OVER_Y);

    // Animación de reintentar: 6 fotogramas y se queda en el último
    const frame = Math.min(SPRITES.RESTART.length - 1, Math.floor((now - overAt) / RESTART_FRAME_MS));
    drawSprite(SPRITES.RESTART[frame], RESTART_X, RESTART_Y);
}

function drawMissingSprite() {
    ctx.fillStyle = '#c0392b';
    ctx.font = '13px monospace';
    ctx.fillText('No se encontró chrome-dino-sprite.png', 20, 55);
    ctx.fillStyle = '#535353';
    ctx.fillText('Ponlo junto a index.html o dentro de la carpeta images/', 20, 77);
    ctx.fillText('(abre la consola con F12 para ver las rutas probadas)', 20, 99);
}

function render() {
    ctx.clearRect(0, 0, W, H);
    if (spriteFailed) { drawMissingSprite(); return; }
    if (!spriteReady) return;

    clouds.forEach(c => drawSprite(SPRITES.CLOUD, c.x, c.y));
    drawGround();

    obstacles.forEach(o => {
        if (o.type === 'bird') {
            drawSprite(SPRITES.PTERODACTYL[Math.floor(gameTime / 167) % 2], o.x, o.y);
        } else {
            drawSprite(o.sprite, o.x, o.y);
        }
    });

    drawSprite(currentDinoSprite(), dino.x, dino.y);
    drawHUD();
    if (state === 'over') drawGameOver();
}

/* --------------------------------------------------------------------------
   11) BUCLE PRINCIPAL (siempre activo, para que la animación de reintentar
       y el parpadeo del dino se sigan animando fuera de la partida)
   -------------------------------------------------------------------------- */
let lastTime = 0;
let acc = 0;

function frame(t) {
    requestAnimationFrame(frame);
    if (!lastTime) lastTime = t;
    now = t;
    acc += Math.min(t - lastTime, 100);
    lastTime = t;
    while (acc >= STEP_MS) {
        if (state === 'playing') update();
        acc -= STEP_MS;
    }
    render();
}
requestAnimationFrame(frame);

/* --------------------------------------------------------------------------
   12) ENTRADAS
   -------------------------------------------------------------------------- */
function canRestart() { return now - overAt > RESTART_DELAY; }

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (state === 'waiting') { startRun(); jump(); }
        else if (state === 'playing') { jump(); }
        else if (state === 'over' && !e.repeat && canRestart()) { startRun(); }
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        downHeld = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') downHeld = false;
});

window.addEventListener('blur', () => { downHeld = false; });

/* Ratón / táctil: coordenadas corregidas por si el canvas se escala con CSS */
function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}

function overRestartButton(e) {
    const p = canvasPoint(e);
    const m = 4;
    return p.x >= RESTART_X - m && p.x <= RESTART_X + 36 + m &&
           p.y >= RESTART_Y - m && p.y <= RESTART_Y + 32 + m;
}

canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'over') {
        if (overRestartButton(e) && canRestart()) startRun();
    } else if (state === 'waiting') {
        startRun(); jump();
    } else {
        jump();
    }
});

canvas.addEventListener('pointermove', (e) => {
    canvas.style.cursor = (state === 'over' && overRestartButton(e)) ? 'pointer' : 'default';
});
