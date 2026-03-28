"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { GraduationCap, Calculator, Brain, LayoutDashboard, Gamepad2, Loader2 } from "lucide-react";
import { BurnoffCalculator } from "@/components/academy/BurnoffCalculator";
import { QuizSystem } from "@/components/academy/QuizSystem";
import { AcademyDashboard } from "@/components/academy/AcademyDashboard";
import { cn } from "@/lib/utils";

const GameLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--primary))]" />
  </div>
);

const CevapMemory   = dynamic(() => import("@/components/academy/CevapMemory").then(m => ({ default: m.CevapMemory })),   { loading: GameLoader });
const CevapNinja    = dynamic(() => import("@/components/academy/CevapNinja").then(m => ({ default: m.CevapNinja })),     { loading: GameLoader });
const CevapSnake    = dynamic(() => import("@/components/academy/CevapSnake").then(m => ({ default: m.CevapSnake })),     { loading: GameLoader });
const GuessTheCity  = dynamic(() => import("@/components/academy/GuessTheCity").then(m => ({ default: m.GuessTheCity })), { loading: GameLoader });

type AcademyTab = "dashboard" | "quiz" | "burnoff" | "games";
type ActiveGame = "memory" | "ninja" | "city" | "snake" | null;

// ── Game launcher card ────────────────────────────────────────────────────────
interface GameCardProps {
  emoji:      string;
  title:      string;
  description: string;
  xpReward:   number;
  xpLabel?:   string;   // overrides the auto-generated XP badge text
  onClick:    () => void;
}

function GameCard({ emoji, title, description, xpReward, xpLabel, onClick }: GameCardProps) {
  const badgeText = xpLabel ?? (xpReward > 0 ? `+${xpReward} XP za pobjedu` : "do +50 XP po rezultatu");
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-5 hover:border-[rgb(var(--primary)/0.4)] hover:bg-[rgb(var(--primary)/0.04)] transition-all active:scale-[0.99] group"
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h3
            className="text-lg font-bold text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))] transition-colors"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {title}
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mt-0.5 leading-relaxed">{description}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgb(var(--primary)/0.1)] border border-[rgb(var(--primary)/0.25)] text-[rgb(var(--primary))] text-xs font-semibold">
            ⚡ {badgeText}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AcademyPage() {
  const t = useTranslations("academy");
  const [activeTab,  setActiveTab]  = useState<AcademyTab>("dashboard");
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  const tabs: { key: AcademyTab; icon: React.ReactNode; label: string }[] = [
    { key: "dashboard", icon: <LayoutDashboard className="w-4 h-4" />, label: "XP & Rang" },
    { key: "games",     icon: <Gamepad2 className="w-4 h-4" />,        label: "Igre" },
    { key: "quiz",      icon: <Brain className="w-4 h-4" />,           label: t("quizTitle") },
    { key: "burnoff",   icon: <Calculator className="w-4 h-4" />,      label: t("burnoffTitle") },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      {/* Header */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold uppercase tracking-wide text-[rgb(var(--foreground))]"
                style={{ fontFamily: "Oswald, sans-serif" }}
              >
                {t("title")}
              </h1>
              <p className="text-[rgb(var(--muted))] text-sm mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Tab switcher */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setActiveGame(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                activeTab === key
                  ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]"
                  : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "dashboard" && <AcademyDashboard />}
        {activeTab === "quiz"      && <QuizSystem />}
        {activeTab === "burnoff"   && <BurnoffCalculator />}

        {activeTab === "games" && (
          <>
            {activeGame === null && (
              <div className="space-y-3">

                {/* Ćevap Ninja — coming soon */}
                <div className="relative">
                  <div className="pointer-events-none opacity-40 grayscale select-none">
                    <GameCard
                      emoji="🔪"
                      title="Ćevap Ninja"
                      description="Zasjeci što više ćevap emojija za 60 sekundi. Propusti 3 i gotovo!"
                      xpReward={50}
                      onClick={() => {}}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-[rgb(var(--muted))] text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                      🚧 U pripremi
                    </span>
                  </div>
                </div>

                <GameCard
                  emoji="🥩"
                  title="Ćevap Memory"
                  description="Pronađi sve parove na 4×5 mreži. Okreni kartice sa ćevap sastojcima i spoji ih!"
                  xpReward={75}
                  onClick={() => setActiveGame("memory")}
                />
                <GameCard
                  emoji="🗺️"
                  title="Pogodi Grad"
                  description="5 pitanja o balkanskim gradovima poznatim po roštilju. Koliko ih poznaješ?"
                  xpReward={50}
                  onClick={() => setActiveGame("city")}
                />
                <GameCard
                  emoji="🐍"
                  title="Ćevap Snake"
                  description="Upravljaj ćevap zmijom, jedi lepinje i luk, izbjegavaj zidove! Zaradi XP po rezultatu."
                  xpReward={0}
                  xpLabel="do +15 XP po rezultatu"
                  onClick={() => setActiveGame("snake")}
                />
              </div>
            )}

            {activeGame === "ninja"  && <CevapNinja   onClose={() => setActiveGame(null)} />}
            {activeGame === "memory" && <CevapMemory  onClose={() => setActiveGame(null)} />}
            {activeGame === "city"   && <GuessTheCity onClose={() => setActiveGame(null)} />}
            {activeGame === "snake"  && <CevapSnake   onClose={() => setActiveGame(null)} />}
          </>
        )}
      </div>
    </div>
  );
}
