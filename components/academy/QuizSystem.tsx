"use client";

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

export function QuizSystem() {
  const supabase = createClient();

  // Questions — loaded from DB, fall back to hardcoded constants
  const [questions, setQuestions] = useState<QuizQuestion[]>(QUIZ_QUESTIONS);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // First get the quiz id for slug 'cevapi-masterclass'
        const { data: quizRaw } = await supabase
          .from("quizzes")
          .select("id")
          .eq("slug", "cevapi-masterclass")
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
  }, []);

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
      return "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] hover:border-[rgb(var(--primary)/0.4)] hover:bg-[rgb(var(--primary)/0.06)] cursor-pointer";
    }
    if (answerId === currentQuestion.correctId) {
      return "border-green-500/60 bg-green-500/10 cursor-default";
    }
    if (answerId === selectedAnswer && answerId !== currentQuestion.correctId) {
      return "border-red-500/60 bg-red-500/10 cursor-default";
    }
    return "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)] opacity-50 cursor-default";
  };

  // --- LOADING (questions fetching from DB) ---
  if (questionsLoading) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-8 flex items-center justify-center min-h-[200px]">
        <div className="text-[rgb(var(--muted))] text-sm animate-pulse">Učitavanje kviza…</div>
      </div>
    );
  }

  // --- INTRO ---
  if (state === "intro") {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2" style={{ fontFamily: "Oswald, sans-serif" }}>
            ČEVAP AKADEMIJA — KVIZ
          </h2>
          <p className="text-[rgb(var(--muted))] text-sm max-w-md mx-auto">
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
            <div key={label} className="text-center p-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.3)]">
              <div className="text-[rgb(var(--primary))] flex justify-center mb-1">{icon}</div>
              <div className="text-xl font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>{value}</div>
              <div className="text-xs text-[rgb(var(--muted))]">{label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="w-full py-3 rounded-xl bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.85)] text-white font-bold text-base transition-all active:scale-[0.98]"
          style={{ fontFamily: "Oswald, sans-serif" }}
        >
          POČNI KVIZ 🔥
        </button>
      </div>
    );
  }

  // --- RESULTS ---
  if (state === "results") {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">{passed ? "🏆" : "📚"}</div>
          <h2
            className={cn(
              "text-2xl font-bold mb-1",
              passed ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--foreground))]"
            )}
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {passed ? "ODLIČNO! POLOŽIO/LA SI!" : "VRIJEDI POKUŠATI PONOVO!"}
          </h2>
          <p className="text-[rgb(var(--muted))] text-sm">
            {passed
              ? "Tvoje znanje o ćevapima je na majstorskom nivou. 👨‍🍳"
              : `Trebao/la si ${PASSING_SCORE}% da prođeš. Prouči materijal i pokušaj ponovo!`}
          </p>
        </div>

        {/* Score circle */}
        <div className="flex justify-center mb-8">
          <div className={cn(
            "w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center",
            passed ? "border-[rgb(var(--primary))]" : "border-[rgb(var(--border))]"
          )}>
            <span className="text-4xl font-bold text-[rgb(var(--foreground))]" style={{ fontFamily: "Oswald, sans-serif" }}>
              {scorePercent}%
            </span>
            <span className="text-xs text-[rgb(var(--muted))]">{correctCount}/{totalQuestions}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5 text-center">
            <div className="text-2xl font-bold text-green-400" style={{ fontFamily: "Oswald, sans-serif" }}>
              {correctCount}
            </div>
            <div className="text-xs text-[rgb(var(--muted))]">Točnih odgovora</div>
          </div>
          <div className="p-4 rounded-xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.05)] text-center">
            <div className="text-2xl font-bold text-[rgb(var(--primary))]" style={{ fontFamily: "Oswald, sans-serif" }}>
              +{earnedXP} XP
            </div>
            <div className="text-xs text-[rgb(var(--muted))]">
              {xpSaving  ? "Sprema se…"   :
               xpSaved   ? "✓ Dodano"     :
               xpSkipped ? "Već zarađeno" :
               "Zarađeno bodova"}
            </div>
          </div>
        </div>

        {/* Level-up / daily-lock banners */}
        {levelUpMsg && (
          <div className="mb-4 px-4 py-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-400 font-bold text-sm text-center">
            {levelUpMsg}
          </div>
        )}
        {xpSkipped && (
          <div className="mb-4 flex items-center justify-center gap-2 text-xs text-[rgb(var(--muted))]">
            <Lock className="w-3.5 h-3.5" />
            XP već zarađen danas — vrati se sutra za novi kviz
          </div>
        )}

        {/* Answer review */}
        <div className="space-y-2 mb-6">
          <p className="text-xs text-[rgb(var(--muted))] uppercase tracking-widest font-medium mb-3">Pregled odgovora</p>
          {questions.map((q, i) => {
            const ans = answers.find((a) => a.questionId === q.id);
            const correct = ans?.correct ?? false;
            return (
              <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg">
                {correct
                  ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <span className="text-xs text-[rgb(var(--muted))] line-clamp-1">
                  <span className="text-[rgb(var(--foreground))] font-medium">P{i + 1}:</span> {q.question.slice(0, 60)}…
                </span>
                <span className="ml-auto text-xs font-medium flex-shrink-0" style={{ color: correct ? "rgb(var(--primary))" : "inherit" }}>
                  {correct ? `+${q.xp} XP` : "0 XP"}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleReset}
          className="w-full py-3 rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--foreground))] font-semibold text-sm hover:border-[rgb(var(--primary)/0.4)] hover:bg-[rgb(var(--primary)/0.06)] transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  // --- QUESTION / FEEDBACK ---
  return (
    <div className={cn("rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.5)] p-6 sm:p-8 transition-opacity duration-200", isAnimating ? "opacity-0" : "opacity-100")}>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 rounded-full bg-[rgb(var(--border))] overflow-hidden">
          <div
            className="h-full rounded-full bg-[rgb(var(--primary))] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-[rgb(var(--muted))] flex-shrink-0 font-medium tabular-nums">
          {currentIndex + 1}/{totalQuestions}
        </span>
        <span className="text-xs text-[rgb(var(--primary))] flex-shrink-0 font-semibold tabular-nums">
          {earnedXP} XP
        </span>
      </div>

      {/* Question */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] text-xs font-medium mb-3">
          <Zap className="w-3 h-3" />
          +{currentQuestion.xp} XP
        </div>
        <h3 className="text-lg font-bold text-[rgb(var(--foreground))] leading-snug" style={{ fontFamily: "Oswald, sans-serif" }}>
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
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
              getAnswerStyle(id)
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border",
              state === "feedback" && id === currentQuestion.correctId
                ? "border-green-500 bg-green-500/20 text-green-400"
                : state === "feedback" && id === selectedAnswer && id !== currentQuestion.correctId
                  ? "border-red-500 bg-red-500/20 text-red-400"
                  : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"
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
              state === "feedback" && id === currentQuestion.correctId ? "text-green-300 font-medium" :
              state === "feedback" && id === selectedAnswer && id !== currentQuestion.correctId ? "text-red-300" :
              "text-[rgb(var(--foreground))]"
            )}>
              {text}
            </span>
          </button>
        ))}
      </div>

      {/* Feedback explanation */}
      {state === "feedback" && (
        <div className={cn(
          "p-4 rounded-xl border mb-5 transition-all",
          answers.at(-1)?.correct
            ? "border-green-500/40 bg-green-500/8"
            : "border-red-500/40 bg-red-500/8"
        )}>
          <div className="flex items-center gap-2 mb-1">
            {answers.at(-1)?.correct
              ? <><CheckCircle className="w-4 h-4 text-green-400" /> <span className="text-green-400 text-sm font-semibold">Točno! +{currentQuestion.xp} XP</span></>
              : <><XCircle className="w-4 h-4 text-red-400" /> <span className="text-red-400 text-sm font-semibold">Netočno!</span></>
            }
          </div>
          <p className="text-[rgb(var(--muted))] text-sm leading-relaxed">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {state === "feedback" && (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.85)] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ fontFamily: "Oswald, sans-serif" }}
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
