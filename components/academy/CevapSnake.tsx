"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { GameContainer } from "./GameContainer";

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS        = 20;
const ROWS        = 20;
const CELL        = 18;           // px — canvas = 360×360
const BASE_MS     = 150;          // normal tick interval
const BOOST_MS    = 85;           // tick during luk boost
const BOOST_SECS  = 5;
const LEPINJA_PTS = 10;
const LUK_PTS     = 25;
const MAX_XP      = 15;           // XP cap per session
const LS_HISCORE  = "chevapp:snake:hiscore";

type Dir      = "UP" | "DOWN" | "LEFT" | "RIGHT";
type FoodType = "lepinja" | "luk";

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
  return { ...p, type: Math.random() < 0.25 ? "luk" : "lepinja" };
}

// ── SnakeGame (inner) ─────────────────────────────────────────────────────────
interface SnakeGameProps {
  onWin:  (bonusXP?: number) => void;
  onLose: () => void;
}

function SnakeGame({ onWin }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // All mutable game state in a ref — avoids stale-closure issues in rAF loop
  const gs = useRef({
    snake:      [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }] as Pt[],
    dir:        "RIGHT" as Dir,
    nextDir:    "RIGHT" as Dir,
    food:       [] as Food[],
    score:      0,
    boostUntil: 0,
    dead:       false,
    lastTick:   0,
  });

  const [score,    setScore]    = useState(0);
  const [hiScore,  setHiScore]  = useState(0);
  const [boosting, setBoosting] = useState(false);
  const [dead,     setDead]     = useState(false);
  const rafRef = useRef(0);

  // Init: load hi-score + spawn first food
  useEffect(() => {
    setHiScore(parseInt(localStorage.getItem(LS_HISCORE) ?? "0", 10));
    gs.current.food = [spawnFood(gs.current.snake, [])];
  }, []);

  // ── Draw ─────────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { snake, food } = gs.current;

    // Background
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Subtle grid
    ctx.strokeStyle = "rgba(211,84,0,0.06)";
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
    }

    // Emoji settings
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.font         = `${CELL - 3}px serif`;

    // Body (tail → neck, skip head)
    for (let i = snake.length - 1; i >= 1; i--) {
      const s = snake[i];
      ctx.fillText("🥩", s.x * CELL + CELL / 2, s.y * CELL + CELL / 2);
    }

    // Head
    if (snake.length > 0) {
      const h = snake[0];
      ctx.fillText("🔥", h.x * CELL + CELL / 2, h.y * CELL + CELL / 2);
    }

    // Food items
    for (const f of food) {
      ctx.fillText(
        f.type === "luk" ? "🧅" : "🍩",
        f.x * CELL + CELL / 2,
        f.y * CELL + CELL / 2,
      );
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

    // Self-collision (all segments except the tail tip, which moves away)
    if (g.snake.slice(0, g.snake.length - 1).some(s => s.x === next.x && s.y === next.y)) {
      g.dead = true; setDead(true); return;
    }

    // Check eat
    const ateIdx = g.food.findIndex(f => f.x === next.x && f.y === next.y);
    const ate    = ateIdx >= 0 ? g.food[ateIdx] : null;

    // Move
    g.snake = [next, ...g.snake];
    if (!ate) g.snake.pop();

    if (ate) {
      g.score += ate.type === "luk" ? LUK_PTS : LEPINJA_PTS;
      setScore(g.score);

      if (ate.type === "luk") {
        g.boostUntil = Date.now() + BOOST_SECS * 1000;
        setBoosting(true);
      }

      const remaining = g.food.filter((_, i) => i !== ateIdx);
      remaining.push(spawnFood(g.snake, remaining));
      g.food = remaining;
    }

    // Expire boost
    if (g.boostUntil > 0 && Date.now() > g.boostUntil) {
      g.boostUntil = 0;
      setBoosting(false);
    }

    draw();
  }, [draw]);

  // ── Game loop ─────────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const g = gs.current;
    if (g.dead) return;

    const ms = (g.boostUntil > 0 && Date.now() < g.boostUntil) ? BOOST_MS : BASE_MS;
    if (ts - g.lastTick >= ms) {
      g.lastTick = ts;
      tick();
    }

    if (!gs.current.dead) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [tick]);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, loop]);

  // ── Keyboard controls ─────────────────────────────────────────────────────────
  useEffect(() => {
    const KEY_MAP: Record<string, Dir> = {
      ArrowUp:    "UP",    ArrowDown:  "DOWN",
      ArrowLeft:  "LEFT",  ArrowRight: "RIGHT",
      w: "UP",   s: "DOWN",  a: "LEFT",  d: "RIGHT",
      W: "UP",   S: "DOWN",  A: "LEFT",  D: "RIGHT",
    };
    const handler = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (!dir) return;
      if (dir === OPPOSITE[gs.current.dir]) return;
      e.preventDefault();
      gs.current.nextDir = dir;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── D-pad handler ─────────────────────────────────────────────────────────────
  const dpad = useCallback((dir: Dir) => {
    if (dir === OPPOSITE[gs.current.dir]) return;
    gs.current.nextDir = dir;
  }, []);

  // ── Game over ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dead) return;
    cancelAnimationFrame(rafRef.current);

    const finalScore = gs.current.score;
    const xp         = Math.min(MAX_XP, Math.floor(finalScore / 50));

    // Persist hi-score
    const prev = parseInt(localStorage.getItem(LS_HISCORE) ?? "0", 10);
    if (finalScore > prev) {
      localStorage.setItem(LS_HISCORE, String(finalScore));
      setHiScore(finalScore);
    }

    // Brief pause so the player sees where they died, then hand off to GameContainer
    const timer = setTimeout(() => onWin(xp), 900);
    return () => clearTimeout(timer);
  }, [dead, onWin]);

  return (
    <div className="flex flex-col items-center gap-3 py-2">

      {/* Score row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-[rgb(var(--muted))]">Bodovi</span>
          <span
            className="font-bold text-[rgb(var(--primary))] text-xl ml-1"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {score}
          </span>
        </div>

        {boosting && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse font-medium">
            🧅 BOOST {BOOST_SECS}s
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-[rgb(var(--muted))]">Rekord</span>
          <span
            className="font-bold text-amber-400 text-xl ml-1"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {hiScore}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="rounded-xl border border-[rgb(var(--border))] block"
        style={{
          width:           `min(${COLS * CELL}px, calc(100vw - 3rem))`,
          aspectRatio:     "1 / 1",
          imageRendering:  "pixelated",
          touchAction:     "none",
        }}
      />

      {/* On-screen D-pad */}
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        <div />
        <DpadBtn label="↑" onPress={() => dpad("UP")} />
        <div />
        <DpadBtn label="←" onPress={() => dpad("LEFT")} />
        <div className="w-10 h-10 flex items-center justify-center text-lg opacity-25 select-none">🥩</div>
        <DpadBtn label="→" onPress={() => dpad("RIGHT")} />
        <div />
        <DpadBtn label="↓" onPress={() => dpad("DOWN")} />
        <div />
      </div>

      {/* Legend */}
      <p className="text-xs text-[rgb(var(--muted))] text-center leading-relaxed">
        🍩 Lepinja = +{LEPINJA_PTS} bod &nbsp;·&nbsp; 🧅 Luk = +{LUK_PTS} bod + speed boost
        <br />
        <span className="opacity-60">Tipkovnica: ←↑→↓ ili WASD</span>
      </p>
    </div>
  );
}

// ── D-pad button ──────────────────────────────────────────────────────────────
function DpadBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className="w-10 h-10 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] text-[rgb(var(--foreground))] text-base font-bold hover:bg-[rgb(var(--primary)/0.15)] hover:border-[rgb(var(--primary)/0.4)] active:scale-95 transition-all select-none"
    >
      {label}
    </button>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function CevapSnake({ onClose }: { onClose?: () => void }) {
  return (
    <GameContainer
      title="Ćevap Snake"
      emoji="🐍"
      description="Upravljaj ćevap zmijom i jedi što više! Lepinja 🍩 donosi bodove, Luk 🧅 donosi bonus + speed boost. Što više bodova, više XP!"
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
