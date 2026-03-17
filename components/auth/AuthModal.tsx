"use client";

import { useState } from "react";
import { X, Flame, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type AuthTab = "login" | "register";

interface AuthModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSuccess?: () => void;
}

// Official four-colour Google 'G' mark — no external asset needed
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

  const switchTab = (t: AuthTab) => { reset(); setTab(t); };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (err) {
      setError("Google prijava nije uspjela. Provjeri Supabase konfiguraciju.");
      setGoogleLoading(false);
    }
    // On success the browser navigates away — no need to call onClose/onSuccess.
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
            ? "Pogrešan e-mail ili lozinka."
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
      setSuccess("Provjeri e-mail i potvrdi registraciju. Nakon toga se možeš prijaviti.");
      setLoading(false);
    }
  };

  // Friendly error mapping
  const friendlyError = (msg: string) => {
    if (msg.includes("already registered")) return "Ovaj e-mail je već registriran.";
    if (msg.includes("Password should be at least")) return "Lozinka mora imati najmanje 6 znakova.";
    if (msg.includes("valid email")) return "Unesi ispravnu e-mail adresu.";
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
      <div className="relative w-full max-w-md bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[rgb(var(--primary)/0.15)] flex items-center justify-center">
              <Flame className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <span className="text-xl font-bold text-[rgb(var(--foreground))] tracking-widest uppercase"
              style={{ fontFamily: "Oswald, sans-serif" }}>
              Chev<span className="text-[rgb(var(--primary))]">App</span>
            </span>
          </div>
          <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
            {tab === "login" ? "Prijavi se u svoj account" : "Kreiraj besplatan account"}
          </p>
          <button
            onClick={() => { reset(); onClose(); }}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgb(var(--border))]">
          {(["login", "register"] as AuthTab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={cn(
                "flex-1 py-3 text-sm font-semibold transition-colors",
                tab === t
                  ? "text-[rgb(var(--primary))] border-b-2 border-[rgb(var(--primary))]"
                  : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              )}
            >
              {t === "login" ? "Prijavi se" : "Registriraj se"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* ── Google SSO ─────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              : <GoogleIcon />}
            Nastavi putem Googlea
          </button>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgb(var(--border))]" />
            <span className="text-xs text-[rgb(var(--muted))] select-none">ili</span>
            <div className="flex-1 h-px bg-[rgb(var(--border))]" />
          </div>

          {tab === "register" && (
            <div>
              <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">Ime i prezime</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tvoje ime"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.6)] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tvoj@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.6)] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">Lozinka</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? "Min. 6 znakova" : "••••••••"}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--foreground))] text-sm placeholder-[rgb(var(--muted))] outline-none focus:border-[rgb(var(--primary)/0.6)] transition-colors"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {friendlyError(error)}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-bold tracking-wide uppercase hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? (tab === "login" ? "Prijavljivanje…" : "Registriranje…")
              : (tab === "login" ? "Prijavi se" : "Kreiraj account")}
          </button>

          {/* Switch tab hint */}
          <p className="text-center text-xs text-[rgb(var(--muted))]">
            {tab === "login" ? (
              <>Nemaš account?{" "}
                <button type="button" onClick={() => switchTab("register")}
                  className="text-[rgb(var(--primary))] hover:underline">
                  Registriraj se
                </button>
              </>
            ) : (
              <>Već imaš account?{" "}
                <button type="button" onClick={() => switchTab("login")}
                  className="text-[rgb(var(--primary))] hover:underline">
                  Prijavi se
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
