"use client";

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
                    ? res?.correct ? "bg-green-400" : "bg-red-400"
                    : i === round
                    ? "bg-[rgb(var(--primary))]"
                    : "bg-[rgb(var(--border))]"
                )}
              />
            );
          })}
        </div>
        <span className="text-xs text-[rgb(var(--muted))] ml-auto">
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
          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-[rgb(var(--primary))]" />
            <span className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium">
              Koji je ovo grad? {current.flag}
            </span>
          </div>
          <p className="text-sm text-[rgb(var(--foreground)/0.85)] leading-relaxed">
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
                "relative px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left",
                revealed && isCorrect
                  ? "border-green-500/50 bg-green-500/10 text-green-400"
                  : revealed && isChosen && !isCorrect
                  ? "border-red-500/50 bg-red-500/10 text-red-400"
                  : chosen !== null
                  ? "border-[rgb(var(--border))] text-[rgb(var(--muted))] opacity-50"
                  : "border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.05)] active:scale-[0.98]"
              )}
            >
              {option}
              {revealed && isCorrect && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
              )}
              {revealed && isChosen && !isCorrect && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* XP hint */}
      <p className="text-center text-xs text-[rgb(var(--muted))]">
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
