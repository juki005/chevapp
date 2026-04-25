"use client";

// ── AuthModal · auth (Sprint 26m · DS-migrated) ──────────────────────────────
// Sign-in / register modal with Google SSO + email/password.
//
// Sprint 26m changes:
//   - All arbitrary rgb(var(--token)) classes → semantic aliases
//     (bg-surface, border-border, text-foreground, text-muted, bg-primary,
//     text-primary, focus:border-primary/60, placeholder:text-muted).
//   - Two style={{fontFamily:"Oswald"}} inline overrides → font-display.
//   - Wordmark accent "App" text-primary → text-vatra-hover to match the
//     brighter Navbar logo treatment (Sprint 26k).
//   - Submit button: bg-primary + text-white + hover:opacity-90 →
//     bg-primary + text-primary-fg + hover:bg-vatra-hover (no opacity-based
//     CTA hovers per DS — use the explicit hover token).
//   - Error block: red-500/10 + red-500/30 + red-400 → zar-red token family
//     (DS alert).
//   - Success block: green-500/10 + green-500/30 + green-400 → ember-green
//     token family (DS confirm).
//   - rounded-2xl modal → rounded-card; rounded-xl/lg → rounded-chip.
//   - shadow-2xl → shadow-soft-xl (DS elevation).
//   - Google SSO button: white + gray-700 + gray-200 chrome kept as a
//     documented external-brand exception (same rationale as TripAdvisor
//     green in FinderFilterBar Sprint 26j) — Google's brand guidelines
//     mandate the white/multi-colour-G mark, this is a legitimate cross-
//     brand surface, not app chrome.
//   - A11y: aria-label on the password show/hide toggle.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { X, Flame, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type AuthTab = "login" | "register";

interface AuthModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSuccess?: () => void;
}

// Official four-colour Google 'G' mark — no external asset needed.
// Hex literals are Google's mandated brand colours; documented external-brand
// exception, not app chrome.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [tab,           setTab]           = useState<AuthTab>("login");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [displayName,   setDisplayName]   = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setEmail(""); setPassword(""); setDisplayName("");
    setError(null); setSuccess(null); setLoading(false);
  };

  const switchTab = (newTab: AuthTab) => { reset(); setTab(newTab); };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    // Reset spinner after 30 s — covers the case where the user closes the
    // OAuth popup/tab and returns to the modal with the button still spinning.
    const resetTimer = setTimeout(() => setGoogleLoading(false), 30_000);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) {
        setError(t("errorGoogle"));
        setGoogleLoading(false);
      }
      // On success the browser navigates away — spinner stays intentionally.
    } catch {
      setError(t("errorUnexpected"));
      setGoogleLoading(false);
    } finally {
      clearTimeout(resetTimer);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();

    if (tab === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(
          err.message === "Invalid login credentials"
            ? t("errorWrongCredentials")
            : err.message
        );
        setLoading(false);
        return;
      }
      onSuccess?.();
      onClose();
      // Refresh the RSC tree so server components pick up the new session
      // cookie immediately — prevents the "frozen links" symptom where the
      // router is stale after login until a manual locale change.
      router.refresh();
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName.trim() || undefined },
        },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSuccess(t("errorCheckEmail"));
      setLoading(false);
    }
  };

  // Friendly error mapping
  const friendlyError = (msg: string) => {
    if (msg.includes("already registered")) return t("errorEmailExists");
    if (msg.includes("Password should be at least")) return t("errorPasswordShort");
    if (msg.includes("valid email")) return t("errorInvalidEmail");
    return msg;
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface border border-border rounded-card shadow-soft-xl overflow-hidden">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-chip bg-primary/15 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-widest uppercase">
              Chev<span className="text-vatra-hover">App</span>
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {tab === "login" ? t("loginTitle") : t("registerTitle")}
          </p>
          <button
            onClick={() => { reset(); onClose(); }}
            aria-label={tCommon("close")}
            className="absolute top-4 right-4 w-8 h-8 rounded-chip flex items-center justify-center text-muted hover:text-foreground hover:bg-border/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["login", "register"] as AuthTab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => switchTab(tabKey)}
              className={cn(
                "flex-1 py-3 text-sm font-semibold transition-colors",
                tab === tabKey
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted hover:text-foreground"
              )}
            >
              {tabKey === "login" ? t("tabSignIn") : t("tabRegister")}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* ── Google SSO ─────────────────────────────────────────────────
              External-brand button: white background + Google's 4-colour
              G mark per Google brand guidelines. Documented exception. */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-chip bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200 shadow-soft-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              : <GoogleIcon />}
            {t("continueWithGoogle")}
          </button>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted select-none">{t("dividerOr")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {tab === "register" && (
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t("fullName")}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-chip border border-border bg-background text-foreground text-sm placeholder:text-muted outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted mb-1.5 block">{t("email")}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tvoj@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-chip border border-border bg-background text-foreground text-sm placeholder:text-muted outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">{t("password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? t("passwordMin") : "••••••••"}
                className="w-full pl-10 pr-10 py-2.5 rounded-chip border border-border bg-background text-foreground text-sm placeholder:text-muted outline-none focus:border-primary/60 transition-colors"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error / Success — DS alert + confirm token families */}
          {error && (
            <div role="alert" className="rounded-chip bg-zar-red/10 border border-zar-red/30 px-4 py-3 text-sm text-zar-red">
              {friendlyError(error)}
            </div>
          )}
          {success && (
            <div role="status" className="rounded-chip bg-ember-green/10 border border-ember-green/30 px-4 py-3 text-sm text-ember-green">
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !!success}
            className="font-display w-full py-2.5 rounded-chip bg-primary text-primary-fg text-sm font-bold tracking-wide uppercase hover:bg-vatra-hover active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? (tab === "login" ? t("signingIn") : t("signingUp"))
              : (tab === "login" ? t("tabSignIn") : t("createAccount"))}
          </button>

          {/* Switch tab hint */}
          <p className="text-center text-xs text-muted">
            {tab === "login" ? (
              <>{t("noAccount")}{" "}
                <button type="button" onClick={() => switchTab("register")}
                  className="text-primary hover:underline">
                  {t("tabRegister")}
                </button>
              </>
            ) : (
              <>{t("hasAccount")}{" "}
                <button type="button" onClick={() => switchTab("login")}
                  className="text-primary hover:underline">
                  {t("tabSignIn")}
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
