"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { GameContainer } from "./GameContainer";

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS        = 20;
const ROWS        = 20;
const CELL        = 18;
const BASE_MS     = 150;
const BOOST_MS    = 85;
const BOOST_SECS  = 5;
const CEVAP_PTS   = 10;
const LUK_PTS     = 25;
const MAX_XP      = 15;
const LS_HISCORE  = "chevapp:snake:hiscore";

// ── Retro palette ─────────────────────────────────────────────────────────────
const C = {
  bgDark:      "#100404",
  bgGrid:      "#1e0808",
  gridLine:    "#2d0d0d",
  snakeHead:   "#00ff41",
  snakeBody:   "#00c833",
  snakeBorder: "#005518",
  foodBody:    "#8B3A0F",
  foodHigh:    "#C4581A",
  foodGrill:   "#4a1800",
  lukBody:     "#c4a800",
  lukHigh:     "#f0d000",
  hudBg:       "#6b0000",
  hudBorder:   "#9a0000",
  hudText:     "#ffffff",
  hudLabel:    "#ffcc00",
  hudBoost:    "#ff8c00",
  overBg:      "rgba(0,0,0,0.82)",
  overRed:     "#ff3333",
  overGreen:   "#00ff41",
  overGold:    "#ffcc00",
};

const HUD_H = 44; // px — height of the top HUD bar drawn on canvas
const CW    = COLS * CELL;
const CH    = ROWS * CELL + HUD_H;

type Dir      = "UP" | "DOWN" | "LEFT" | "RIGHT";
type FoodType = "cevap" | "luk";

interface Pt   { x: number; y: number; }
interface Food extends Pt { type: FoodType; }

const OPPOSITE: Record<Dir, Dir> = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand(max: number) { return Math.floor(Math.random() * max); }

function spawnFood(snake: Pt[], existing: Food[]): Food {
  const taken = new Set([...snake, ...existing].map(p => `${p.x},${p.y}`));
  let p: Pt;
  do { p = { x: rand(COLS), y: rand(ROWS) }; }
  while (taken.has(`${p.x},${p.y}`));
  return { ...p, type: Math.random() < 0.2 ? "luk" : "cevap" };
}

// ── Canvas draw primitives ────────────────────────────────────────────────────

/** Draw the dark-red grid background (game area only, below HUD) */
function drawBg(ctx: CanvasRenderingContext2D) {
  // Game area
  ctx.fillStyle = C.bgDark;
  ctx.fillRect(0, HUD_H, CW, ROWS * CELL);

  // Grid lines
  ctx.strokeStyle = C.gridLine;
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, HUD_H);
    ctx.lineTo(x * CELL, CH);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0,  HUD_H + y * CELL);
    ctx.lineTo(CW, HUD_H + y * CELL);
    ctx.stroke();
  }
}

/** Draw retro HUD bar across the top */
function drawHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  hiScore: number,
  seconds: number,
  boosting: boolean,
) {
  // Bar background
  ctx.fillStyle = C.hudBg;
  ctx.fillRect(0, 0, CW, HUD_H);
  ctx.strokeStyle = C.hudBorder;
  ctx.lineWidth   = 2;
  ctx.strokeRect(0, 0, CW, HUD_H);

  // Pixel font fallback chain (Press Start 2P loaded separately)
  const pixelFont = (size: number) =>
    `${size}px "Press Start 2P", "Courier New", monospace`;

  // Left — hi-score
  ctx.fillStyle  = C.hudLabel;
  ctx.font       = pixelFont(6);
  ctx.textAlign  = "left";
  ctx.textBaseline = "top";
  ctx.fillText("HI", 8, 6);
  ctx.fillStyle = C.hudText;
  ctx.font      = pixelFont(9);
  ctx.textBaseline = "bottom";
  ctx.fillText(String(hiScore), 8, HUD_H - 6);

  // Centre — score
  ctx.fillStyle    = C.hudLabel;
  ctx.font         = pixelFont(6);
  ctx.textAlign    = "center";
  ctx.textBaseline = "top";
  ctx.fillText("SCORE", CW / 2, 6);
  ctx.fillStyle    = boosting ? C.hudBoost : C.hudText;
  ctx.font         = pixelFont(10);
  ctx.textBaseline = "bottom";
  ctx.fillText(String(score), CW / 2, HUD_H - 6);

  // Right — timer
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  ctx.fillStyle    = C.hudLabel;
  ctx.font         = pixelFont(6);
  ctx.textAlign    = "right";
  ctx.textBaseline = "top";
  ctx.fillText("TIME", CW - 8, 6);
  ctx.fillStyle    = C.hudText;
  ctx.font         = pixelFont(9);
  ctx.textBaseline = "bottom";
  ctx.fillText(`${mm}:${ss}`, CW - 8, HUD_H - 6);

  // Boost flash badge
  if (boosting) {
    ctx.fillStyle = C.hudBoost;
    ctx.font      = pixelFont(6);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔥 BOOST", CW / 2, HUD_H / 2);
  }
}

/** Draw one snake segment */
function drawSnakeSeg(ctx: CanvasRenderingContext2D, p: Pt, isHead: boolean) {
  const x = p.x * CELL;
  const y = HUD_H + p.y * CELL;
  const pad = 1;
  const sz  = CELL - pad * 2;

  // Outer fill
  ctx.fillStyle = isHead ? C.snakeHead : C.snakeBody;
  ctx.fillRect(x + pad, y + pad, sz, sz);

  // Inner highlight (top-left bevel)
  ctx.fillStyle = isHead ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)";
  ctx.fillRect(x + pad, y + pad, sz, 3);
  ctx.fillRect(x + pad, y + pad, 3, sz);

  // Dark border
  ctx.strokeStyle = C.snakeBorder;
  ctx.lineWidth   = 1;
  ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, sz - 1, sz - 1);

  // Pixel eyes on head
  if (isHead) {
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 4, y + 4,    3, 3);
    ctx.fillRect(x + 11, y + 4,   3, 3);
    ctx.fillStyle = C.snakeHead;
    ctx.fillRect(x + 4,  y + 4,   1, 1);
    ctx.fillRect(x + 11, y + 4,   1, 1);
  }
}

/** Draw a pixel-art ćevap sausage */
function drawCevap(ctx: CanvasRenderingContext2D, p: Pt) {
  const cx = p.x * CELL + CELL / 2;
  const cy = HUD_H + p.y * CELL + CELL / 2;
  const rx = CELL * 0.42;
  const ry = CELL * 0.2;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + 2, rx * 0.9, ry * 0.7, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = C.foodBody;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = C.foodHigh;
  ctx.beginPath();
  ctx.ellipse(cx - 1, cy - 2, rx * 0.55, ry * 0.45, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Grill marks
  ctx.strokeStyle = C.foodGrill;
  ctx.lineWidth   = 1.5;
  for (let i = -3; i <= 3; i += 3) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 0.9 - 2, cy - 4);
    ctx.lineTo(cx + i * 0.9 + 2, cy + 4);
    ctx.stroke();
  }

  // End caps (pixel dots)
  ctx.fillStyle = C.foodHigh;
  ctx.fillRect(Math.round(cx - rx - 1), Math.round(cy - 1), 3, 3);
  ctx.fillRect(Math.round(cx + rx - 2), Math.round(cy - 1), 3, 3);
}

/** Draw a pixel-art luk (onion) — bonus speed item */
function drawLuk(ctx: CanvasRenderingContext2D, p: Pt) {
  const cx = p.x * CELL + CELL / 2;
  const cy = HUD_H + p.y * CELL + CELL / 2;

  // Body
  ctx.fillStyle = C.lukBody;
  ctx.beginPath();
  ctx.arc(cx, cy + 1, CELL * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = C.lukHigh;
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, CELL * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Top sprout
  ctx.strokeStyle = "#7adf20";
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - CELL * 0.3);
  ctx.lineTo(cx, cy - CELL * 0.48);
  ctx.stroke();
}

/** Overlay drawn on canvas when game is over */
function drawGameOver(
  ctx: CanvasRenderingContext2D,
  score: number,
  isNew: boolean,
) {
  ctx.fillStyle = C.overBg;
  ctx.fillRect(0, HUD_H, CW, ROWS * CELL);

  const cx = CW / 2;
  const pixelFont = (size: number) =>
    `${size}px "Press Start 2P", "Courier New", monospace`;

  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = C.overRed;
  ctx.font      = pixelFont(16);
  ctx.fillText("GAME OVER", cx, HUD_H + ROWS * CELL * 0.32);

  if (isNew) {
    ctx.fillStyle = C.overGold;
    ctx.font      = pixelFont(8);
    ctx.fillText("★ NOVI REKORD ★", cx, HUD_H + ROWS * CELL * 0.48);
  }

  ctx.fillStyle = C.overGreen;
  ctx.font      = pixelFont(10);
  ctx.fillText(`SCORE: ${score}`, cx, HUD_H + ROWS * CELL * 0.62);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font      = pixelFont(6);
  ctx.fillText("zatvaranje...", cx, HUD_H + ROWS * CELL * 0.78);
}

// ── SnakeGame (inner) ─────────────────────────────────────────────────────────
interface SnakeGameProps {
  onWin:  (bonusXP?: number) => void;
  onLose: () => void;
}

function SnakeGame({ onWin }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gs = useRef({
    snake:      [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }] as Pt[],
    dir:        "RIGHT" as Dir,
    nextDir:    "RIGHT" as Dir,
    food:       [] as Food[],
    score:      0,
    boostUntil: 0,
    dead:       false,
    lastTick:   0,
    seconds:    0,
  });

  const [score,    setScore]    = useState(0);
  const [hiScore,  setHiScore]  = useState(0);
  const [boosting, setBoosting] = useState(false);
  const [dead,     setDead]     = useState(false);
  const [seconds,  setSeconds]  = useState(0);

  const rafRef     = useRef(0);
  const timerRef   = useRef<ReturnType<typeof setInterval>>();

  // Load hi-score + spawn first food
  useEffect(() => {
    setHiScore(parseInt(localStorage.getItem(LS_HISCORE) ?? "0", 10));
    gs.current.food = [spawnFood(gs.current.snake, []), spawnFood(gs.current.snake, [])];
    // Start 1-second timer
    timerRef.current = setInterval(() => {
      gs.current.seconds++;
      setSeconds(gs.current.seconds);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Draw ─────────────────────────────────────────────────────────────────────
  const draw = useCallback((overrideScore?: number, isNewHi?: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { snake, food } = gs.current;

    drawBg(ctx);
    drawHUD(ctx, gs.current.score, parseInt(localStorage.getItem(LS_HISCORE) ?? "0", 10), gs.current.seconds, gs.current.boostUntil > 0 && Date.now() < gs.current.boostUntil);

    // Food
    for (const f of food) {
      if (f.type === "luk") drawLuk(ctx, f);
      else                   drawCevap(ctx, f);
    }

    // Snake body (tail → neck)
    for (let i = snake.length - 1; i >= 1; i--) {
      drawSnakeSeg(ctx, snake[i], false);
    }
    // Head
    if (snake.length > 0) drawSnakeSeg(ctx, snake[0], true);

    // Game over overlay
    if (gs.current.dead && overrideScore !== undefined) {
      drawGameOver(ctx, overrideScore, !!isNewHi);
    }
  }, []);

  // ── Tick ─────────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const g = gs.current;
    if (g.dead) return;

    g.dir = g.nextDir;
    const head = g.snake[0];
    const next: Pt = {
      x: head.x + (g.dir === "LEFT" ? -1 : g.dir === "RIGHT" ? 1 : 0),
      y: head.y + (g.dir === "UP"   ? -1 : g.dir === "DOWN"  ? 1 : 0),
    };

    // Wall collision
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      g.dead = true; setDead(true); return;
    }
    // Self-collision
    if (g.snake.slice(0, g.snake.length - 1).some(s => s.x === next.x && s.y === next.y)) {
      g.dead = true; setDead(true); return;
    }

    const ateIdx = g.food.findIndex(f => f.x === next.x && f.y === next.y);
    const ate    = ateIdx >= 0 ? g.food[ateIdx] : null;

    g.snake = [next, ...g.snake];
    if (!ate) g.snake.pop();

    if (ate) {
      g.score += ate.type === "luk" ? LUK_PTS : CEVAP_PTS;
      setScore(g.score);

      if (ate.type === "luk") {
        g.boostUntil = Date.now() + BOOST_SECS * 1000;
        setBoosting(true);
      }

      const remaining = g.food.filter((_, i) => i !== ateIdx);
      remaining.push(spawnFood(g.snake, remaining));
      g.food = remaining;
    }

    if (g.boostUntil > 0 && Date.now() > g.boostUntil) {
      g.boostUntil = 0;
      setBoosting(false);
    }

    draw();
  }, [draw]);

  // ── Game loop (rAF) ───────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const g = gs.current;
    if (g.dead) return;
    const ms = (g.boostUntil > 0 && Date.now() < g.boostUntil) ? BOOST_MS : BASE_MS;
    if (ts - g.lastTick >= ms) {
      g.lastTick = ts;
      tick();
    }
    if (!gs.current.dead) rafRef.current = requestAnimationFrame(loop);
  }, [tick]);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, loop]);

  // ── Game over ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dead) return;
    cancelAnimationFrame(rafRef.current);
    clearInterval(timerRef.current);

    const finalScore = gs.current.score;
    const xp         = Math.min(MAX_XP, Math.floor(finalScore / 50));
    const prev       = parseInt(localStorage.getItem(LS_HISCORE) ?? "0", 10);
    const isNew      = finalScore > prev;

    if (isNew) {
      localStorage.setItem(LS_HISCORE, String(finalScore));
      setHiScore(finalScore);
    }

    draw(finalScore, isNew);

    const timer = setTimeout(() => onWin(xp), 1800);
    return () => clearTimeout(timer);
  }, [dead, draw, onWin]);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const KEY_MAP: Record<string, Dir> = {
      ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
      w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
    };
    const handler = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (!dir || dir === OPPOSITE[gs.current.dir]) return;
      e.preventDefault();
      gs.current.nextDir = dir;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Touch swipe ───────────────────────────────────────────────────────────────
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) { touchStart.current = null; return; }
    const d: Dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "RIGHT" : "LEFT")
      : (dy > 0 ? "DOWN"  : "UP");
    if (d !== OPPOSITE[gs.current.dir]) gs.current.nextDir = d;
    touchStart.current = null;
  };

  const dpad = useCallback((dir: Dir) => {
    if (dir !== OPPOSITE[gs.current.dir]) gs.current.nextDir = dir;
  }, []);

  // Suppress unused warning for boosting (used inside draw via gs.current)
  void boosting; void score; void seconds; void hiScore;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Canvas — HUD is drawn inside canvas */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="block rounded-xl overflow-hidden"
        style={{
          width:          `min(${CW}px, calc(100vw - 2rem))`,
          aspectRatio:    `${CW} / ${CH}`,
          imageRendering: "pixelated",
          touchAction:    "none",
          border:         `2px solid #6b0000`,
          boxShadow:      "0 0 24px rgba(180,0,0,0.4), inset 0 0 40px rgba(0,0,0,0.4)",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      />

      {/* D-pad — 3×3 grid with UP/LEFT/RIGHT/DOWN in correct positions */}
      <div className="grid grid-cols-3 gap-2 mt-1">
        {/* Row 1 */}
        <div />
        <DpadBtn label="▲" onPress={() => dpad("UP")} />
        <div />
        {/* Row 2 */}
        <DpadBtn label="◀" onPress={() => dpad("LEFT")} />
        <div className="w-14 h-14 flex items-center justify-center text-2xl opacity-30 select-none">🥩</div>
        <DpadBtn label="▶" onPress={() => dpad("RIGHT")} />
        {/* Row 3 */}
        <div />
        <DpadBtn label="▼" onPress={() => dpad("DOWN")} />
        <div />
      </div>

      {/* Legend */}
      <p
        className="text-xs text-center leading-relaxed opacity-60"
        style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace", fontSize: "7px", color: "rgb(var(--muted))" }}
      >
        🥩 ĆEVAP = +{CEVAP_PTS} &nbsp;·&nbsp; 🧅 LUK = +{LUK_PTS} + BOOST
        <br />
        WASD / STRELICE / POVUCI
      </p>
    </div>
  );
}

// ── D-pad button ──────────────────────────────────────────────────────────────
function DpadBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold select-none active:scale-90 transition-transform"
      style={{
        background:  "#6b0000",
        border:      "2px solid #9a0000",
        color:       "#fff",
        fontFamily:  "monospace",
        boxShadow:   "0 4px 0 #3a0000",
        touchAction: "none",
      }}
    >
      {label}
    </button>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function CevapSnake({ onClose }: { onClose?: () => void }) {
  return (
    <GameContainer
      title="Ćevap-Zmijica"
      emoji="🐍"
      description="Upravljaj zmijom i pojedi što više ćevapa! 🥩 = +10 bod | 🧅 Luk = +25 bod + speed boost. Udari u zid ili sebe — GAME OVER!"
      xpReward={0}
      gameKey="cevap-snake"
      onClose={onClose}
    >
      {({ onWin, onLose }) => (
        <SnakeGame onWin={onWin} onLose={onLose} />
      )}
    </GameContainer>
  );
}
