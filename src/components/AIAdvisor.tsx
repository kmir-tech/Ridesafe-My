"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { AdvisorContext } from "@/lib/types";

interface AIAdvisorProps {
  context: AdvisorContext;
}

const SUGGESTED_QUESTIONS_EN = [
  "Is it safe to ride right now?",
  "Best time to ride today?",
  "What's causing the low score?",
  "Any hazards on my route?",
];

const SUGGESTED_QUESTIONS_BM = [
  "Adakah selamat menunggang sekarang?",
  "Masa terbaik untuk menunggang hari ini?",
  "Apakah punca skor rendah ini?",
  "Ada bahaya di laluan saya?",
];

export default function AIAdvisor({ context }: AIAdvisorProps) {
  const { t, lang } = useI18n();
  const { user, openAuthModal } = useSupabase();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [queriesLeft, setQueriesLeft] = useState<number | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions =
    lang === "bm" ? SUGGESTED_QUESTIONS_BM : SUGGESTED_QUESTIONS_EN;

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 100);
  }, [expanded]);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamText]);

  const handleSend = async (q?: string) => {
    const question = (q ?? message).trim();
    if (!question || streaming || rateLimited) return;

    setStreaming(true);
    setStreamText("");
    setError(null);
    setMessage("");

    try {
      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, context }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        setStreaming(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Request failed");
        setStreaming(false);
        return;
      }

      // Read remaining queries from header if present
      const remaining = res.headers.get("X-Queries-Remaining");
      if (remaining !== null) setQueriesLeft(parseInt(remaining, 10));

      // Stream the text
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamText(fullText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setStreaming(false);
    }
  };

  const maxDaily = user ? 10 : 3;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa" }}
          >
            ✦
          </div>
          <div>
            <span className="text-sm font-semibold">{t("aiAdvisor")}</span>
            <span
              className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd" }}
            >
              {t("aiAdvisorBeta")}
            </span>
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`opacity-40 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Suggested questions */}
              {!streamText && !streaming && (
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{
                        background: "rgba(139,92,246,0.1)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        color: "#c4b5fd",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Response area */}
              {(streamText || streaming) && (
                <div
                  ref={responseRef}
                  className="text-sm leading-relaxed p-3 rounded-lg"
                  style={{
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.15)",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {streamText}
                  {streaming && (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-purple-400 animate-pulse rounded-sm" />
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              {/* Rate limited */}
              {rateLimited && (
                <div className="text-xs text-orange-400 text-center py-2">
                  {t("aiAdvisorRateLimit")}
                  {!user && (
                    <button
                      onClick={() => openAuthModal("signup")}
                      className="ml-1 underline"
                    >
                      {t("signIn")}
                    </button>
                  )}
                </div>
              )}

              {/* Input */}
              {!rateLimited && (
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={t("aiAdvisorPlaceholder")}
                    disabled={streaming}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!message.trim() || streaming}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                    style={{
                      background: "rgba(139,92,246,0.25)",
                      border: "1px solid rgba(139,92,246,0.4)",
                      color: "#a78bfa",
                    }}
                  >
                    {t("aiAdvisorSend")}
                  </button>
                </div>
              )}

              {/* Queries remaining + disclaimer */}
              <div className="flex items-center justify-between">
                {queriesLeft !== null && !rateLimited && (
                  <span className="text-[10px] opacity-40">
                    {queriesLeft}/{maxDaily} {t("aiAdvisorQueriesLeft")}
                  </span>
                )}
                <span className="text-[10px] opacity-30 text-right flex-1">
                  {t("aiAdvisorDisclaimer")}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
