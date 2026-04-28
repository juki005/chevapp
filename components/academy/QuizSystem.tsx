"use client";

// ── QuizSystem · academy (Sprint 26af · DS-migrated) ─────────────────────────
// Multi-question quiz with intro / question+feedback / results states.
// Persisted XP via awardXP() with daily-claim gate. Closes the academy bucket.
//
// Sprint 26af changes:
//   - All rgb(var(--token)) arbitrary classes → semantic aliases (~43 sites).
//   - 6× style={{fontFamily:"Oswald"}} → font-display class (intro h2 +
//     POČNI CTA, intro stat values, results h2 + score circle, results
//     stat numbers, question h3, next-question CTA).
//   - Primary CTAs (POČNI KVIZ, SLJEDEĆE PITANJE, VIDI REZULTATE):
//     bg-primary + hover:bg-primary/0.85 + text-white →
//     bg-primary + hover:bg-vatra-hover + text-primary-fg
//     (DS rule — explicit hover token, semantic fill).
//   - Green/red answer states → ember-green / zar-red token families
//     throughout: button borders, fills, marker circles, text-300 lighter
//     shades (→ /80 opacity on the semantic token), feedback panel chrome.
//   - Score stat card green-500 family → ember-green family.
//   - Level-up banner amber-400 family → amber-xp family. Same call as
//     GameContainer Sprint 26ad — rank tier achievement is a passive
//     readout chip, amber-xp is the correct DS gamification token.
//   - getAnswerStyle() return strings rewritten with semantic aliases.
//   - inline style={{ color: correct ? "rgb(var(--primary))" : "inherit" }}
//     on the answer-review row → className branch.
//   - Emoji 🏆 / 📚 / 🔥 / 🎉 / 👨‍🍳 tagged TODO(icons) + aria-hidden.
//   - rounded-2xl → rounded-card; rounded-xl/lg → rounded-chip.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle, XCircle, ChevronRight, RotateCcw, Trophy, Target, Zap, BookOpen, Lock } from "lucide-react";
import { QUIZ_QUESTIONS, PASSING_SCORE, type QuizQuestion } from "@/constants/quizQuestions";
import { createClient } from "@/lib/supabase/client";
import { awardXP } from "@/lib/gamification";
import { revalidateXP } from "@/lib/actions/xp";
import { cn } from "@/lib/utils";

// DB row shape for quiz_questions
interface DbQuizQuestion {
  sort_order: number;
  question_text: string;
  answers: { id: string; text: string }[];
  correct_id: string;
  explanation: string;
  xp: number;
}

// ── Daily XP gate ─────────────────────────────────────────────────────────────
const QUIZ_LS_KEY = `chevapp:quiz_xp:${new Date().toISOString().slice(0, 10)}`;
function hasQuizXPToday() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(QUIZ_LS_KEY) === "1";
}
function markQuizXPToday() {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUIZ_LS_KEY, "1");
}

type QuizState = "intro" | "question" | "feedback" | "results";

interface Answer {
  questionId: number;
  selectedId: string;
  correct: boolean;
  xpEarned: number;
}

interface QuizSystemProps {
  quizSlug?: string;  // which quiz to run; defaults to "cevapi-masterclass"
  onBack?:   () => void;
}

export function QuizSystem({ quizSlug = "cevapi-masterclass", onBack }: QuizSystemProps) {
  const supabase = createClient();

  const [questions, setQuestions] = useState<QuizQuestion[]>(QUIZ_QUESTIONS);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  useEffect(() => {
    setQuestions(QUIZ_QUESTIONS);
    setQuestionsLoading(true);
    (async () => {
      try {
        const { data: quizRaw } = await supabase
          .from("quizzes")
          .select("id")
          .eq("slug", quizSlug)
          .single();

        const quiz = quizRaw as unknown as { id: string } | null;
        if (!quiz) return; // table doesn't exist yet — keep fallback

        const { data: rowsRaw } = await supabase
          .from("quiz_questions")
          .select("sort_order, question_text, answers, correct_id, explanation, xp")
          .eq("quiz_id", quiz.id)
          .order("sort_order");

        const rows = rowsRaw as unknown as DbQuizQuestion[] | null;
        if (rows && rows.length > 0) {
          setQuestions(
            rows.map((r, i) => ({
              id: i + 1,
              question: r.question_text,
              answers: r.answers,
              correctId: r.correct_id,
              explanation: r.explanation,
              xp: r.xp,
            }))
          );
        }
      } catch {
        // DB not ready — keep hardcoded fallback silently
      } finally {
        setQuestionsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizSlug]);

  const TOTAL_XP = questions.reduce((sum, q) => sum + q.xp, 0);

  const [state, setState] = useState<QuizState>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // XP-saving state
  const [xpSaving,  setXpSaving]  = useState(false);
  const [xpSaved,   setXpSaved]   = useState(false);
  const [xpSkipped, setXpSkipped] = useState(false); // already claimed today
  const [levelUpMsg, setLevelUpMsg] = useState("");
  const awardedRef = useRef(false); // prevent double-award if component re-renders

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = ((currentIndex) / totalQuestions) * 100;

  const earnedXP = answers.reduce((sum, a) => sum + a.xpEarned, 0);
  const correctCount = answers.filter((a) => a.correct).length;
  const scorePercent = answers.length > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;
  const passed = scorePercent >= PASSING_SCORE;

  const handleStart = () => {
    setState("question");
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
  };

  const handleSelectAnswer = useCallback((answerId: string) => {
    if (selectedAnswer !== null || state !== "question") return;
    setSelectedAnswer(answerId);
    setState("feedback");

    const correct = answerId === currentQuestion.correctId;
    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedId: answerId,
        correct,
        xpEarned: correct ? currentQuestion.xp : 0,
      },
    ]);
  }, [selectedAnswer, state, currentQuestion]);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      if (currentIndex + 1 >= totalQuestions) {
        setState("results");
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setState("question");
      }
      setIsAnimating(false);
    }, 200);
  };

  const handleReset = () => {
    setState("intro");
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setXpSaving(false);
    setXpSaved(false);
    setXpSkipped(false);
    setLevelUpMsg("");
    awardedRef.current = false;
  };

  // Award XP once when results screen is first shown
  useEffect(() => {
    if (state !== "results") return;
    if (awardedRef.current) return;
    awardedRef.current = true;

    const xpToAward = answers.reduce((s, a) => s + a.xpEarned, 0);
    if (xpToAward === 0) return;

    if (hasQuizXPToday()) { setXpSkipped(true); return; }

    (async () => {
      setXpSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const result = await awardXP(user.id, xpToAward, supabase);
        if (result) {
          markQuizXPToday();
          setXpSaved(true);
          if (result.leveledUp) {
            setLevelUpMsg(`🎉 Rang unaprijeđen! → ${result.newRank.emoji} ${result.newRank.title}`);
          }
          window.dispatchEvent(new CustomEvent("chevapp:stats_updated", {
            detail: { xpAdded: xpToAward, newStats: result.stats },
          }));
          revalidateXP().catch(() => {}); // server-side cache invalidation
        }
      } finally {
        setXpSaving(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const getAnswerStyle = (answerId: string) => {
    if (state !== "feedback") {
      return "border-border bg-surface/50 hover:border-primary/40 hover:bg-primary/5 cursor-pointer";
    }
    if (answerId === currentQuestion.correctId) {
      return "border-ember-green/60 bg-ember-green/10 cursor-default";
    }
    if (answerId === selectedAnswer && answerId !== currentQuestion.correctId) {
      return "border-zar-red/60 bg-zar-red/10 cursor-default";
    }
    return "border-border bg-surface/30 opacity-50 cursor-default";
  };

  // --- LOADING (questions fetching from DB) ---
  if (questionsLoading) {
    return (
      <div className="rounded-card border border-border bg-surface/50 p-8 flex items-center justify-center min-h-[200px]">
        <div className="text-muted text-sm animate-pulse">Učitavanje kviza…</div>
      </div>
    );
  }

  // --- INTRO ---
  if (state === "intro") {
    return (
      <div className="rounded-card border border-border bg-surface/50 p-6 sm:p-8">
        <div className="text-center mb-8">
          {/* TODO(icons): swap 🏆 for brand <Trophy> */}
          <div className="text-6xl mb-4" aria-hidden="true">🏆</div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            ČEVAP AKADEMIJA — KVIZ
          </h2>
          <p className="text-muted text-sm max-w-md mx-auto">
            Provjeri svoje znanje o ćevapima, somunu i balkanskoj kulturi grilanja.
            {totalQuestions} pitanja · Prođi s {PASSING_SCORE}%+ za diplomu!
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: <BookOpen className="w-5 h-5" />, label: "Pitanja", value: totalQuestions.toString() },
            { icon: <Zap className="w-5 h-5" />, label: "Max XP", value: TOTAL_XP.toString() },
            { icon: <Target className="w-5 h-5" />, label: "Prolazan", value: `${PASSING_SCORE}%` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="text-center p-3 rounded-chip border border-border bg-surface/30">
              <div className="text-primary flex justify-center mb-1">{icon}</div>
              <div className="font-display text-xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="font-display w-full py-3 rounded-chip bg-primary hover:bg-vatra-hover text-primary-fg font-bold text-base transition-all active:scale-[0.98]"
        >
          {/* TODO(icons): swap 🔥 for brand <Vatra> */}
          POČNI KVIZ <span aria-hidden="true">🔥</span>
        </button>
      </div>
    );
  }

  // --- RESULTS ---
  if (state === "results") {
    return (
      <div className="rounded-card border border-border bg-surface/50 p-6 sm:p-8">
        <div className="text-center mb-8">
          {/* TODO(icons): swap 🏆 / 📚 for brand <Trophy> / <Book> */}
          <div className="text-6xl mb-3" aria-hidden="true">{passed ? "🏆" : "📚"}</div>
          <h2
            className={cn(
              "font-display text-2xl font-bold mb-1",
              passed ? "text-primary" : "text-foreground"
            )}
          >
            {passed ? "ODLIČNO! POLOŽIO/LA SI!" : "VRIJEDI POKUŠATI PONOVO!"}
          </h2>
          <p className="text-muted text-sm">
            {passed
              ? <>Tvoje znanje o ćevapima je na majstorskom nivou. <span aria-hidden="true">👨‍🍳</span></>
              : `Trebao/la si ${PASSING_SCORE}% da prođeš. Prouči materijal i pokušaj ponovo!`}
          </p>
        </div>

        {/* Score circle */}
        <div className="flex justify-center mb-8">
          <div className={cn(
            "w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center",
            passed ? "border-primary" : "border-border"
          )}>
            <span className="font-display text-4xl font-bold text-foreground">
              {scorePercent}%
            </span>
            <span className="text-xs text-muted">{correctCount}/{totalQuestions}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-chip border border-ember-green/30 bg-ember-green/5 text-center">
            <div className="font-display text-2xl font-bold text-ember-green">
              {correctCount}
            </div>
            <div className="text-xs text-muted">Točnih odgovora</div>
          </div>
          <div className="p-4 rounded-chip border border-primary/30 bg-primary/5 text-center">
            <div className="font-display text-2xl font-bold text-primary">
              +{earnedXP} XP
            </div>
            <div className="text-xs text-muted">
              {xpSaving  ? "Sprema se…"   :
               xpSaved   ? "✓ Dodano"     :
               xpSkipped ? "Već zarađeno" :
               "Zarađeno bodova"}
            </div>
          </div>
        </div>

        {/* Level-up banner — amber-xp gamification token (rank tier
            achievement, passive readout chip, not a button — same call as
            GameContainer Sprint 26ad). */}
        {levelUpMsg && (
          <div className="mb-4 px-4 py-2.5 rounded-chip border border-amber-xp/40 bg-amber-xp/10 text-amber-xp font-bold text-sm text-center">
            {levelUpMsg}
          </div>
        )}
        {xpSkipped && (
          <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted">
            <Lock className="w-3.5 h-3.5" />
            XP već zarađen danas — vrati se sutra za novi kviz
          </div>
        )}

        {/* Answer review */}
        <div className="space-y-2 mb-6">
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-3">Pregled odgovora</p>
          {questions.map((q, i) => {
            const ans = answers.find((a) => a.questionId === q.id);
            const correct = ans?.correct ?? false;
            return (
              <div key={q.id} className="flex items-start gap-2 p-2 rounded-chip">
                {correct
                  ? <CheckCircle className="w-4 h-4 text-ember-green flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-zar-red flex-shrink-0 mt-0.5" />}
                <span className="text-xs text-muted line-clamp-1">
                  <span className="text-foreground font-medium">P{i + 1}:</span> {q.question.slice(0, 60)}…
                </span>
                <span className={cn(
                  "ml-auto text-xs font-medium flex-shrink-0",
                  correct ? "text-primary" : "text-muted",
                )}>
                  {correct ? `+${q.xp} XP` : "0 XP"}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleReset}
          className="w-full py-3 rounded-chip border border-border text-foreground font-semibold text-sm hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  // --- QUESTION / FEEDBACK ---
  return (
    <div className={cn("rounded-card border border-border bg-surface/50 p-6 sm:p-8 transition-opacity duration-200", isAnimating ? "opacity-0" : "opacity-100")}>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted flex-shrink-0 font-medium tabular-nums">
          {currentIndex + 1}/{totalQuestions}
        </span>
        <span className="text-xs text-primary flex-shrink-0 font-semibold tabular-nums">
          {earnedXP} XP
        </span>
      </div>

      {/* Question */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Zap className="w-3 h-3" />
          +{currentQuestion.xp} XP
        </div>
        <h3 className="font-display text-lg font-bold text-foreground leading-snug">
          {currentQuestion.question}
        </h3>
      </div>

      {/* Answer options */}
      <div className="space-y-2.5 mb-5">
        {currentQuestion.answers.map(({ id, text }) => (
          <button
            key={id}
            onClick={() => handleSelectAnswer(id)}
            disabled={state === "feedback"}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-chip border transition-all text-left",
              getAnswerStyle(id)
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border",
              state === "feedback" && id === currentQuestion.correctId
                ? "border-ember-green bg-ember-green/20 text-ember-green"
                : state === "feedback" && id === selectedAnswer && id !== currentQuestion.correctId
                  ? "border-zar-red bg-zar-red/20 text-zar-red"
                  : "border-border text-muted"
            )}>
              {state === "feedback" && id === currentQuestion.correctId
                ? <CheckCircle className="w-3.5 h-3.5" />
                : state === "feedback" && id === selectedAnswer && id !== currentQuestion.correctId
                  ? <XCircle className="w-3.5 h-3.5" />
                  : id.toUpperCase()
              }
            </div>
            <span className={cn(
              "text-sm",
              state === "feedback" && id === currentQuestion.correctId ? "text-ember-green font-medium" :
              state === "feedback" && id === selectedAnswer && id !== currentQuestion.correctId ? "text-zar-red/80" :
              "text-foreground"
            )}>
              {text}
            </span>
          </button>
        ))}
      </div>

      {/* Feedback explanation */}
      {state === "feedback" && (
        <div className={cn(
          "p-4 rounded-chip border mb-5 transition-all",
          answers.at(-1)?.correct
            ? "border-ember-green/40 bg-ember-green/10"
            : "border-zar-red/40 bg-zar-red/10"
        )}>
          <div className="flex items-center gap-2 mb-1">
            {answers.at(-1)?.correct
              ? <><CheckCircle className="w-4 h-4 text-ember-green" /> <span className="text-ember-green text-sm font-semibold">Točno! +{currentQuestion.xp} XP</span></>
              : <><XCircle className="w-4 h-4 text-zar-red" /> <span className="text-zar-red text-sm font-semibold">Netočno!</span></>
            }
          </div>
          <p className="text-muted text-sm leading-relaxed">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {state === "feedback" && (
        <button
          onClick={handleNext}
          className="font-display w-full py-3 rounded-chip bg-primary hover:bg-vatra-hover text-primary-fg font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {currentIndex + 1 >= totalQuestions ? (
            <><Trophy className="w-4 h-4" /> VIDI REZULTATE</>
          ) : (
            <>SLJEDEĆE PITANJE <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
}
