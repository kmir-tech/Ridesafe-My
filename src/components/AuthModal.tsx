"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useI18n } from "@/contexts/I18nContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
}

export default function AuthModal({ open, onClose, defaultTab = "signin" }: AuthModalProps) {
  const { supabase } = useSupabase();
  const { t } = useI18n();
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
  };

  const handleSignIn = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
  };

  const handleSignUp = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSuccessMsg("Check your email to confirm your account.");
  };

  const handleGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const inputClass =
    "w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm glass-card rounded-2xl p-6"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 opacity-40 hover:opacity-80 text-xl leading-none"
            >
              ×
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center text-sm font-bold">
                R
              </div>
              <span className="font-bold">RideSafe MY</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 bg-slate-800/60 rounded-lg">
              <button
                onClick={() => { setTab("signin"); reset(); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "signin" ? "bg-accent-blue text-white" : "text-slate-400"}`}
              >
                {t("signIn")}
              </button>
              <button
                onClick={() => { setTab("signup"); reset(); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "signup" ? "bg-accent-blue text-white" : "text-slate-400"}`}
              >
                {t("signUp")}
              </button>
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("continueWithGoogle")}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs opacity-40">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Form */}
            <div className="space-y-3">
              {tab === "signup" && (
                <input
                  type="text"
                  placeholder={t("displayName")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              )}
              <input
                type="email"
                placeholder={t("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                onKeyDown={(e) => e.key === "Enter" && (tab === "signin" ? handleSignIn() : handleSignUp())}
              />
              <input
                type="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                onKeyDown={(e) => e.key === "Enter" && (tab === "signin" ? handleSignIn() : handleSignUp())}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs mt-3">{error}</p>
            )}
            {successMsg && (
              <p className="text-green-400 text-xs mt-3">{successMsg}</p>
            )}

            <button
              onClick={tab === "signin" ? handleSignIn : handleSignUp}
              disabled={loading || !email || !password}
              className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold bg-accent-blue hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {loading
                ? tab === "signin" ? t("signingIn") : t("signingUp")
                : tab === "signin" ? t("signIn") : t("signUp")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
