"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { RideLog } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";

interface RideHistoryProps {
  open: boolean;
  onClose: () => void;
}

function timeFormat(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RideHistory({ open, onClose }: RideHistoryProps) {
  const { t } = useI18n();
  const [logs, setLogs] = useState<RideLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const fetchLogs = useCallback(async (reset = false) => {
    setLoading(true);
    const o = reset ? 0 : offset;
    try {
      const res = await fetch(`/api/ride-logs?limit=${LIMIT}&offset=${o}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(reset ? data.logs : (prev: RideLog[]) => [...prev, ...data.logs]);
        setTotal(data.total);
        setOffset(o + data.logs.length);
      }
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    if (open) fetchLogs(true);
  }, [open, fetchLogs]);

  const avgScore =
    logs.length > 0
      ? Math.round(
          logs.reduce((s, l) => s + (l.safety_score ?? 0), 0) / logs.filter((l) => l.safety_score != null).length
        )
      : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9997] flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative ml-auto w-full max-w-sm h-full flex flex-col"
            style={{
              background: "rgba(10,18,34,0.98)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <h2 className="font-semibold">{t("rideHistory")}</h2>
              <button onClick={onClose} className="opacity-40 hover:opacity-80 text-xl leading-none">×</button>
            </div>

            {/* Stats */}
            {logs.length > 0 && (
              <div className="grid grid-cols-2 gap-3 p-4 border-b border-slate-700/30">
                <div className="text-center">
                  <div className="text-2xl font-bold">{total}</div>
                  <div className="text-xs opacity-50">{t("totalRides")}</div>
                </div>
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: avgScore !== null ? getSafetyColor(avgScore >= 70 ? "Safe" : avgScore >= 50 ? "Caution" : "Dangerous") : "#94a3b8" }}
                  >
                    {avgScore ?? "--"}
                  </div>
                  <div className="text-xs opacity-50">{t("avgSafetyScore")}</div>
                </div>
              </div>
            )}

            {/* Log list */}
            <div className="flex-1 overflow-y-auto">
              {loading && logs.length === 0 ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40 gap-2">
                  <span className="text-3xl">🏍️</span>
                  <p className="text-sm">{t("noRideLogs")}</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {logs.map((log) => {
                    const color = log.safety_level
                      ? getSafetyColor(log.safety_level)
                      : "#94a3b8";
                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl"
                        style={{
                          background: "rgba(30,41,59,0.6)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {log.from_name} → {log.to_name}
                            </p>
                            <p className="text-xs opacity-40 mt-0.5">{timeFormat(log.rode_at)}</p>
                          </div>
                          {log.safety_score != null && (
                            <span
                              className="text-sm font-bold shrink-0"
                              style={{ color }}
                            >
                              {log.safety_score}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs opacity-50">
                          {log.distance_km && <span>{log.distance_km} km</span>}
                          {log.duration_min && <span>~{log.duration_min} min</span>}
                          {log.weather_summary && (
                            <span className="capitalize">{log.weather_summary.description}</span>
                          )}
                        </div>
                        {log.notes && (
                          <p className="text-xs opacity-40 mt-1 italic">&ldquo;{log.notes}&rdquo;</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Load more */}
                  {logs.length < total && (
                    <button
                      onClick={() => fetchLogs(false)}
                      disabled={loading}
                      className="w-full py-2 text-sm opacity-50 hover:opacity-80"
                    >
                      {loading ? t("loading") : "Load more"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
