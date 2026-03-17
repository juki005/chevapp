"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { GameContainer } from "./GameContainer";
import { cn } from "@/lib/utils";

// ── Card data ─────────────────────────────────────────────────────────────────
const PAIRS = [
  { id: "cevap",    emoji: "🥩", label: "Ćevap"    },
  { id: "somun",    emoji: "🥯", label: "Somun"    },
  { id: "kajmak",   emoji: "🧈", label: "Kajmak"   },
  { id: "ajvar",    emoji: "🫑", label: "Ajvar"    },
  { id: "luk",      emoji: "🧅", label: "Luk"      },
  { id: "zar",      emoji: "🔥", label: "Žar"      },
  { id: "paprika",  emoji: "🌶️", label: "Paprika"  },
  { id: "so",       emoji: "🧂", label: "Sol"      },
  { id: "tanjir",   emoji: "🍽️", label: "Tanjir"  },
  { id: "rostilj",  emoji: "♨️", label: "Roštilj" },
];

interface Card {
  uid:      string; // unique per card (pairId + "-a" | "-b")
  pairId:   string;
  emoji:    string;
  label:    string;
  flipped:  boolean;
  matched:  boolean;
}

function buildDeck(): Card[] {
  const cards: Card[] = [];
  for (const p of PAIRS) {
    cards.push({ uid: `${p.id}-a`, pairId: p.id, emoji: p.emoji, label: p.label, flipped: false, matched: false });
    cards.push({ uid: `${p.id}-b`, pairId: p.id, emoji: p.emoji, label: p.label, flipped: false, matched: false });
  }
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// ── CardTile ──────────────────────────────────────────────────────────────────
interface CardTileProps {
  card:    Card;
  onClick: () => void;
  locked:  boolean;
}

function CardTile({ card, onClick, locked }: CardTileProps) {
  const isVisible = card.flipped || card.matched;

  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: 600 }}
      onClick={() => !locked && !card.matched && !card.flipped && onClick()}
    >
      <motion.div
        className="w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isVisible ? 180 : 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        {/* Back face */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl flex items-center justify-center text-2xl border-2 transition-colors",
            "bg-[rgb(var(--surface)/0.6)] border-[rgb(var(--border))]",
            "[backface-visibility:hidden]",
            "aspect-square"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          🍖
        </div>

        {/* Front face */}
        <div
          className={cn(
            "rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-colors aspect-square",
            "[backface-visibility:hidden]",
            card.matched
              ? "bg-green-500/10 border-green-500/40 text-green-400"
              : "bg-[rgb(var(--primary)/0.08)] border-[rgb(var(--primary)/0.4)]"
          )}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <span className="text-2xl leading-none">{card.emoji}</span>
          <span className="text-[10px] font-semibold text-[rgb(var(--muted))] leading-none px-1 text-center">
            {card.label}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// ── Game logic ────────────────────────────────────────────────────────────────
interface MemoryGameProps {
  onWin:  (bonusXP?: number) => void;
  onLose: () => void;
}

function MemoryGame({ onWin }: MemoryGameProps) {
  const [deck,      setDeck]      = useState<Card[]>(buildDeck);
  const [selected,  setSelected]  = useState<string[]>([]); // up to 2 uids
  const [locked,    setLocked]    = useState(false);
  const [moves,     setMoves]     = useState(0);

  const matchedCount = deck.filter((c) => c.matched).length;
  const totalPairs   = PAIRS.length;

  // Check win condition
  useEffect(() => {
    if (matchedCount === totalPairs * 2) {
      // Bonus XP for efficiency: ≤12 moves → +25, ≤16 → +10, else 0
      const bonus = moves <= 12 ? 25 : moves <= 16 ? 10 : 0;
      setTimeout(() => onWin(bonus), 600);
    }
  }, [matchedCount, moves, onWin, totalPairs]);

  const handleCardClick = useCallback((uid: string) => {
    if (locked) return;

    setSelected((prev) => {
      if (prev.length === 0) return [uid];

      if (prev.length === 1) {
        const [first] = prev;
        if (first === uid) return prev; // same card

        const next = [...prev, uid];
        setMoves((m) => m + 1);

        const firstCard  = deck.find((c) => c.uid === first)!;
        const secondCard = deck.find((c) => c.uid === uid)!;

        if (firstCard.pairId === secondCard.pairId) {
          // Match!
          setDeck((d) =>
            d.map((c) =>
              c.uid === first || c.uid === uid ? { ...c, flipped: true, matched: true } : c
            )
          );
          return [];
        } else {
          // Mismatch — flip both open briefly then back
          setLocked(true);
          setDeck((d) =>
            d.map((c) => (c.uid === first || c.uid === uid ? { ...c, flipped: true } : c))
          );
          setTimeout(() => {
            setDeck((d) =>
              d.map((c) =>
                c.uid === first || c.uid === uid ? { ...c, flipped: false } : c
              )
            );
            setLocked(false);
          }, 900);
          return [];
        }
      }

      return prev;
    });

    // Flip the clicked card immediately
    setDeck((d) =>
      d.map((c) => (c.uid === uid ? { ...c, flipped: true } : c))
    );
  }, [deck, locked]);

  const restart = () => {
    setDeck(buildDeck());
    setSelected([]);
    setMoves(0);
    setLocked(false);
  };

  const matched = matchedCount / 2;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[rgb(var(--muted))]">
          Parovi: <span className="text-[rgb(var(--foreground))] font-bold">{matched}/{totalPairs}</span>
        </span>
        <span className="text-[rgb(var(--muted))]">
          Potezi: <span className="text-[rgb(var(--foreground))] font-bold">{moves}</span>
        </span>
        <button
          onClick={restart}
          className="text-xs text-[rgb(var(--primary))] hover:underline"
        >
          Resetuj
        </button>
      </div>

      {/* 4×5 grid */}
      <div className="grid grid-cols-4 gap-2">
        {deck.map((card) => (
          <CardTile
            key={card.uid}
            card={card}
            locked={locked}
            onClick={() => handleCardClick(card.uid)}
          />
        ))}
      </div>

      {/* Efficiency hint */}
      <p className="text-center text-xs text-[rgb(var(--muted))]">
        ≤12 poteza → +25 bonus XP · ≤16 poteza → +10 bonus XP
      </p>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function CevapMemory({ onClose }: { onClose?: () => void }) {
  return (
    <GameContainer
      title="Ćevap Memory"
      emoji="🥩"
      description="Pronađi sve parove! Okreni kartice i spoji ih po simbolima ćevap sastojaka."
      xpReward={75}
      onClose={onClose}
    >
      {({ onWin, onLose, status }) =>
        status === "playing" && (
          <MemoryGame onWin={onWin} onLose={onLose} />
        )
      }
    </GameContainer>
  );
}
