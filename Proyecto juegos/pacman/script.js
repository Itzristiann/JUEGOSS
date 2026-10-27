// ===================================================
// PAC-MAN ARCADE (1980) - EXACT MAZE & AUDIO SYNTH
// ===================================================

const canvas = document.getElementById('pacman-canvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 16;
const COLS = 28;
const ROWS = 31;

const STATE = { START: 0, PLAYING: 1, DYING: 2, GAME_OVER: 3 };
let gameState = STATE.START;

let score = 0;
let highScore = localStorage.getItem('pacman_highscore') || 10000;
let lives = 3;
let dotsLeft = 0;
let frightenedTimer = 0;
let eatenGhostsCount = 0;

document.getElementById('high-score').innerText = String(highScore).padStart(5, '0');

// Matriz oficial del laberinto (0: Vacío, 1: Muro, 2: Punto, 3: Energizante, 4: Puerta casa, 5: Casa fantasmas)
const MAZE_GRID = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,0,2,0,0,0,1,5,5,5,5,5,5,1,0,0,0,2,0,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let map = [];

const DIR = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
    NONE: { x: 0, y: 0 }
};

// ==========================================
// SÍNTESIS DE AUDIO ARCADE NAMCO
// ==========================================
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.wakaFlip = false;
        this.sirenOsc = null;
        this.sirenGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playWaka() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';

        // Frecuencia alternada 'waka' exacta
        let freq = this.wakaFlip ? 490 : 260;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.07);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.07);

        this.wakaFlip = !this.wakaFlip;
    }

    startSiren() {
        if (!this.ctx || this.sirenOsc) return;
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenOsc.type = 'sawtooth';

        this.sirenOsc.frequency.setValueAtTime(140, this.ctx.currentTime);
        this.sirenGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);
        this.sirenOsc.start();
    }

    stopSiren() {
        if (this.sirenOsc) {
            this.sirenOsc.stop();
            this.sirenOsc = null;
        }
    }

    playEatGhost() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playDeath() {
        if (!this.ctx) return;
        this.stopSiren();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 1.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.2);
    }
}

const sounds = new SoundSystem();

// ==========================================
// PERSONAJES: PAC-MAN Y FANTASMAS
// ==========================================
class Pacman {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 13.5 * TILE_SIZE;
        this.y = 23 * TILE_SIZE;
        this.dir = DIR.NONE;
        this.nextDir = DIR.NONE;
        this.speed = 2;
        this.mouth = 0.2;
        this.mouthSpeed = 0.02;
    }

    update() {
        if (this.nextDir !== DIR.NONE && this.canMove(this.nextDir)) {
            this.dir = this.nextDir;
        }

        if (this.canMove(this.dir)) {
            this.x += this.dir.x * this.speed;
            this.y += this.dir.y * this.speed;

            this.mouth += this.mouthSpeed;
            if (this.mouth > 0.45 || this.mouth < 0.05) this.mouthSpeed = -this.mouthSpeed;

            // Teletransporte túneles laterales
            if (this.x < -TILE_SIZE / 2) this.x = COLS * TILE_SIZE - TILE_SIZE / 2;
            else if (this.x > COLS * TILE_SIZE - TILE_SIZE / 2) this.x = -TILE_SIZE / 2;
        }

        let tileX = Math.floor((this.x + TILE_SIZE / 2) / TILE_SIZE);
        let tileY = Math.floor((this.y + TILE_SIZE / 2) / TILE_SIZE);

        if (tileX >= 0 && tileX < COLS && tileY >= 0 && tileY < ROWS) {
            if (map[tileY][tileX] === 2) {
                map[tileY][tileX] = 0;
                score += 10;
                dotsLeft--;
                sounds.playWaka();
                updateScoreHUD();
            } else if (map[tileY][tileX] === 3) {
                map[tileY][tileX] = 0;
                score += 50;
                dotsLeft--;
                frightenedTimer = 7;
                eatenGhostsCount = 0;
                ghosts.forEach(g => g.isFrightened = true);
                sounds.playWaka();
                updateScoreHUD();
            }
        }
    }

    canMove(d) {
        if (d === DIR.NONE) return false;
        let testX = this.x + d.x * this.speed;
        let testY = this.y + d.y * this.speed;

        let left = Math.floor(testX / TILE_SIZE);
        let right = Math.floor((testX + TILE_SIZE - 1) / TILE_SIZE);
        let top = Math.floor(testY / TILE_SIZE);
        let bottom = Math.floor((testY + TILE_SIZE - 1) / TILE_SIZE);

        if (left < 0 || right >= COLS) return true; // Área de túnel

        return !(isSolid(left, top) || isSolid(right, top) || isSolid(left, bottom) || isSolid(right, bottom));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);

        let angle = 0;
        if (this.dir === DIR.UP) angle = -Math.PI / 2;
        if (this.dir === DIR.DOWN) angle = Math.PI / 2;
        if (this.dir === DIR.LEFT) angle = Math.PI;

        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 2, this.mouth * Math.PI, (2 - this.mouth) * Math.PI);
        ctx.lineTo(0, 0);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.restore();
    }
}

class Ghost {
    constructor(color, spawnPos) {
        this.color = color;
        this.spawnPos = spawnPos;
        this.reset();
    }

    reset() {
        this.x = this.spawnPos.x * TILE_SIZE;
        this.y = this.spawnPos.y * TILE_SIZE;
        this.dir = DIR.UP;
        this.speed = 1.75;
        this.isFrightened = false;
        this.isEaten = false;
    }

    update() {
        let tileX = Math.floor((this.x + TILE_SIZE / 2) / TILE_SIZE);
        let tileY = Math.floor((this.y + TILE_SIZE / 2) / TILE_SIZE);

        if (Math.abs((this.x % TILE_SIZE)) < this.speed && Math.abs((this.y % TILE_SIZE)) < this.speed) {
            let possibleDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT].filter(d => {
                if (d.x === -this.dir.x && d.y === -this.dir.y) return false;
                let nextX = tileX + d.x;
                let nextY = tileY + d.y;
                return !isSolid(nextX, nextY);
            });

            if (possibleDirs.length > 0) {
                if (this.isFrightened) {
                    this.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                } else {
                    let target = { x: pacman.x, y: pacman.y };
                    let bestDir = possibleDirs[0];
                    let minDist = Infinity;

                    possibleDirs.forEach(d => {
                        let nextX = (tileX + d.x) * TILE_SIZE;
                        let nextY = (tileY + d.y) * TILE_SIZE;
                        let dist = Math.hypot(nextX - target.x, nextY - target.y);
                        if (dist < minDist) {
                            minDist = dist;
                            bestDir = d;
                        }
                    });
                    this.dir = bestDir;
                }
            }
        }

        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;

        if (this.x < -TILE_SIZE / 2) this.x = COLS * TILE_SIZE - TILE_SIZE / 2;
        else if (this.x > COLS * TILE_SIZE - TILE_SIZE / 2) this.x = -TILE_SIZE / 2;

        let pTileX = Math.floor((pacman.x + TILE_SIZE / 2) / TILE_SIZE);
        let pTileY = Math.floor((pacman.y + TILE_SIZE / 2) / TILE_SIZE);
        if (tileX === pTileX && tileY === pTileY) {
            if (this.isFrightened && !this.isEaten) {
                this.isEaten = true;
                this.isFrightened = false;
                score += 200 * Math.pow(2, eatenGhostsCount++);
                sounds.playEatGhost();
                updateScoreHUD();
            } else if (!this.isEaten) {
                handlePlayerDeath();
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        let bodyColor = this.color;
        if (this.isFrightened) {
            bodyColor = frightenedTimer < 2 && Math.floor(Date.now() / 150) % 2 === 0 ? '#ffffff' : '#2121ff';
        }

        if (!this.isEaten) {
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, Math.PI, 0, false);
            ctx.lineTo(TILE_SIZE, TILE_SIZE);
            ctx.lineTo(0, TILE_SIZE);
            ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5, 6, 2.5, 0, Math.PI * 2);
        ctx.arc(11, 6, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.isFrightened && !this.isEaten ? '#ff0000' : '#0000ff';
        ctx.beginPath();
        ctx.arc(5 + this.dir.x * 1.2, 6 + this.dir.y * 1.2, 1.2, 0, Math.PI * 2);
        ctx.arc(11 + this.dir.x * 1.2, 6 + this.dir.y * 1.2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

const pacman = new Pacman();
const ghosts = [
    new Ghost('#ff0000', { x: 13, y: 11 }), // Blinky
    new Ghost('#ffb8ff', { x: 13, y: 14 }), // Pinky
    new Ghost('#00ffff', { x: 11, y: 14 }), // Inky
    new Ghost('#ffb851', { x: 15, y: 14 })  // Clyde
];

function isSolid(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    return map[y][x] === 1;
}

function initGame() {
    map = MAZE_GRID.map(row => [...row]);
    dotsLeft = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 2 || map[r][c] === 3) dotsLeft++;
        }
    }
    pacman.reset();
    ghosts.forEach(g => g.reset());
}

function updateScoreHUD() {
    document.getElementById('score').innerText = String(score).padStart(5, '0');
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pacman_highscore', highScore);
        document.getElementById('high-score').innerText = String(highScore).padStart(5, '0');
    }
}

function renderLives() {
    const container = document.getElementById('lives-container');
    container.innerHTML = '';
    for (let i = 0; i < lives - 1; i++) {
        const life = document.createElement('div');
        life.className = 'life-icon';
        container.appendChild(life);
    }
}

function handlePlayerDeath() {
    gameState = STATE.DYING;
    sounds.playDeath();
    setTimeout(() => {
        lives--;
        renderLives();
        if (lives <= 0) {
            gameState = STATE.GAME_OVER;
            document.getElementById('message-overlay').style.display = 'flex';
            document.querySelector('#message-overlay h1').innerText = 'GAME OVER';
        } else {
            pacman.reset();
            ghosts.forEach(g => g.reset());
            gameState = STATE.PLAYING;
            sounds.startSiren();
        }
    }, 1200);
}

// ===================================================
// MOTOR DE RENDERIZADO FIDELIDAD ARCADE 100%
// ===================================================
function drawArcadeMaze() {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#2121ff';

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let cell = map[r][c];
            let x = c * TILE_SIZE;
            let y = r * TILE_SIZE;

            if (cell === 1) {
                // Evaluamos vecinos para trazar la línea azul doble con esquinas arqueadas
                let top = isSolid(c, r - 1);
                let bottom = isSolid(c, r + 1);
                let left = isSolid(c - 1, r);
                let right = isSolid(c + 1, r);

                ctx.beginPath();

                // Bordes exteriores/interiores
                if (!top) { ctx.moveTo(x, y + 2); ctx.lineTo(x + TILE_SIZE, y + 2); }
                if (!bottom) { ctx.moveTo(x, y + TILE_SIZE - 2); ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE - 2); }
                if (!left) { ctx.moveTo(x + 2, y); ctx.lineTo(x + 2, y + TILE_SIZE); }
                if (!right) { ctx.moveTo(x + TILE_SIZE - 2, y); ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE); }

                ctx.stroke();
            } else if (cell === 2) { // Punto regular
                ctx.fillStyle = '#ffb8ae';
                ctx.beginPath();
                ctx.arc(x + 8, y + 8, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (cell === 3) { // Energizante
                if (Math.floor(Date.now() / 200) % 2 === 0) {
                    ctx.fillStyle = '#ffb8ae';
                    ctx.beginPath();
                    ctx.arc(x + 8, y + 8, 6.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (cell === 4) { // Puerta rosada casa fantasmas
                ctx.fillStyle = '#ffb8ff';
                ctx.fillRect(x, y + 6, TILE_SIZE, 4);
            }
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === STATE.PLAYING) {
        pacman.update();
        ghosts.forEach(g => g.update());

        if (frightenedTimer > 0) {
            frightenedTimer -= 1 / 60;
            if (frightenedTimer <= 0) {
                ghosts.forEach(g => {
                    g.isFrightened = false;
                    g.isEaten = false;
                });
            }
        }
    }

    drawArcadeMaze();
    pacman.draw();
    ghosts.forEach(g => g.draw());

    requestAnimationFrame(gameLoop);
}

// ==========================================
// CONTROLES
// ==========================================
window.addEventListener('keydown', e => {
    sounds.init();

    if (e.code === 'Space') {
        if (gameState === STATE.START || gameState === STATE.GAME_OVER) {
            score = 0;
            lives = 3;
            updateScoreHUD();
            renderLives();
            initGame();
            gameState = STATE.PLAYING;
            document.getElementById('message-overlay').style.display = 'none';
            sounds.startSiren();
        }
    }

    if (gameState === STATE.PLAYING) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') pacman.nextDir = DIR.UP;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') pacman.nextDir = DIR.DOWN;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') pacman.nextDir = DIR.LEFT;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') pacman.nextDir = DIR.RIGHT;
    }
});

renderLives();
initGame();
requestAnimationFrame(gameLoop);