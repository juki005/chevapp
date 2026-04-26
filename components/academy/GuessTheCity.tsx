"use client";

// ── GuessTheCity · academy (Sprint 26aa · DS-migrated) ────────────────────────
// 5-question multiple-choice quiz: hint → 4 city options. +10 bonus XP per
// correct answer on top of GameContainer's base reward.
//
// Sprint 26aa changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases.
//   - Progress pips: bg-green-400 / bg-red-400 → bg-ember-green / bg-zar-red
//     (DS confirm + alert tokens).
//   - Answer-revealed states: green-500 family → ember-green family;
//     red-500 family → zar-red family.
//   - rounded-2xl → rounded-card; rounded-xl → rounded-chip.
//   - 🇧🇦 / 🇭🇷 / 🇷🇸 country flags kept — categorical data markers (same
//     precedent as flag emoji in LocationFilter Sprint 26l), aria-hidden.
//   - 🗺️ emoji passed as prop to GameContainer is data — that component
//     handles its own a11y.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, MapPin } from "lucide-react";
import { GameContainer } from "./GameContainer";
import { cn } from "@/lib/utils";

// ── Question bank ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    hint: "Poznata po ćevapima s kajmakom i somunu. Najveći grad Bosne i Hercegovine, smješten uz rijeku Miljacku.",
    answer: "Sarajevo",
    options: ["Sarajevo", "Mostar", "Tuzla", "Zenica"],
    flag: "🇧🇦",
  },
  {
    hint: "Grad u RS poznat po roštilju i pljeskavicama. Drugi po veličini grad u BiH, uz rijeku Vrbas.",
    answer: "Banja Luka",
    options: ["Banja Luka", "Prijedor", "Bijeljina", "Doboj"],
    flag: "🇧🇦",
  },
  {
    hint: "Stari bosanski grad i sjedište vlasti. Poznat po autentičnoj bosanskoj kuhinji i turskoj arhitekturi.",
    answer: "Travnik",
    options: ["Travnik", "Visoko", "Jajce", "Bugojno"],
    flag: "🇧🇦",
  },
  {
    hint: "Srpski grad poznat kao 'prijestolnica ćevapa'. Domaćin najpoznatijeg roštilj festivala na Balkanu.",
    answer: "Leskovac",
    options: ["Leskovac", "Niš", "Pirot", "Vranje"],
    flag: "🇷🇸",
  },
  {
    hint: "Glavni grad Hrvatske. Roštilj kultura raste uz tradicionalne klupe i pivnice Gornjeg grada.",
    answer: "Zagreb",
    options: ["Zagreb", "Split", "Rijeka", "Osijek"],
    flag: "🇭🇷",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface RoundResult {
  question: typeof QUESTIONS[0];
  chosen:   string;
  correct:  boolean;
}

// ── Quiz game ─────────────────────────────────────────────────────────────────
interface QuizGameProps {
  onWin:  (bonusXP?: number) => void;
  onLose: () => void;
}

function QuizGame({ onWin }: QuizGameProps) {
  const [questions]   = useState(() => [...QUESTIONS].sort(() => Math.random() - 0.5));
  const [round,       setRound]       = useState(0);
  const [chosen,      setChosen]      = useState<string | null>(null);
  const [results,     setResults]     = useState<RoundResult[]>([]);
  const [showResult,  setShowResult]  = useState(false);

  const current  = questions[round];
  const total    = questions.length;
  const isLast   = round === total - 1;

  const handleChoice = (option: string) => {
    if (chosen !== null) return;
    const correct = option === current.answer;
    setChosen(option);
    setShowResult(true);

    const newResults = [...results, { question: current, chosen: option, correct }];
    setResults(newResults);

    if (isLast) {
      const score      = newResults.filter((r) => r.correct).length;
      const bonusXP    = score * 10; // 10 XP per correct answer beyond base
      setTimeout(() => onWin(bonusXP), 1200);
    } else {
      setTimeout(() => {
        setChosen(null);
        setShowResult(false);
        setRound((r) => r + 1);
      }, 1200);
    }
  };

  const correctSoFar = results.filter((r) => r.correct).length;

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {questions.map((_, i) => {
            const res = results[i];
            return (
              <div
                key={i}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors",
                  i < round
                    ? res?.correct ? "bg-ember-green" : "bg-zar-red"
                    : i === round
                    ? "bg-primary"
                    : "bg-border"
                )}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted ml-auto">
          {round + 1}/{total} · {correctSoFar} tačnih
        </span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={round}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="rounded-card border border-border bg-surface/50 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted uppercase tracking-widest font-medium">
              Koji je ovo grad? <span aria-hidden="true">{current.flag}</span>
            </span>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">
            {current.hint}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {current.options.map((option) => {
          const isChosen  = chosen === option;
          const isCorrect = option === current.answer;
          const revealed  = showResult;

          return (
            <button
              key={option}
              onClick={() => handleChoice(option)}
              disabled={chosen !== null}
              className={cn(
                "relative px-4 py-3 rounded-chip border text-sm font-semibold transition-all text-left",
                revealed && isCorrect
                  ? "border-ember-green/50 bg-ember-green/10 text-ember-green"
                  : revealed && isChosen && !isCorrect
                  ? "border-zar-red/50 bg-zar-red/10 text-zar-red"
                  : chosen !== null
                  ? "border-border text-muted opacity-50"
                  : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
              )}
            >
              {option}
              {revealed && isCorrect && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ember-green" />
              )}
              {revealed && isChosen && !isCorrect && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zar-red" />
              )}
            </button>
          );
        })}
      </div>

      {/* XP hint */}
      <p className="text-center text-xs text-muted">
        +10 bonus XP po tačnom odgovoru
      </p>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export function GuessTheCity({ onClose }: { onClose?: () => void }) {
  return (
    <GameContainer
      title="Pogodi Grad"
      emoji="🗺️"
      description="5 pitanja o gradovima poznatim po roštilju. Poznaj li svoja balkanska ćevap odredišta?"
      xpReward={50}
      onClose={onClose}
    >
      {({ onWin, onLose, status }) =>
        status === "playing" && (
          <QuizGame onWin={onWin} onLose={onLose} />
        )
      }
    </GameContainer>
  );
}
