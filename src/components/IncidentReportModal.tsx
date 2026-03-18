"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { IncidentType, Incident } from "@/lib/types";

interface IncidentReportModalProps {
  open: boolean;
  lat: number | null;
  lon: number | null;
  onClose: () => void;
  onSubmitted: (incident: Incident) => void;
}

const INCIDENT_TYPES: { type: IncidentType; icon: string }[] = [
  { type: "flood", icon: "🌊" },
  { type: "accident", icon: "⚠️" },
  { type: "road_damage", icon: "🕳️" },
  { type: "fallen_tree", icon: "🌳" },
  { type: "oil_spill", icon: "🛢️" },
  { type: "police_roadblock", icon: "🚔" },
  { type: "traffic_jam", icon: "🚗" },
  { type: "other", icon: "📍" },
];

const TYPE_LABEL_KEYS: Record<IncidentType, string> = {
  flood: "incidentFlood",
  accident: "incidentAccident",
  road_damage: "incidentRoadDamage",
  fallen_tree: "incidentFallenTree",
  oil_spill: "incidentOilSpill",
  police_roadblock: "incidentPoliceRoadblock",
  traffic_jam: "incidentTrafficJam",
  other: "incidentOther",
} as const;

export default function IncidentReportModal({
  open,
  lat,
  lon,
  onClose,
  onSubmitted,
}: IncidentReportModalProps) {
  const { t } = useI18n();
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedType || lat === null || lon === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, description: description || undefined, lat, lon }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError("Sign in to report incidents.");
          return;
        }
        setError(data.error || "Failed to submit");
        return;
      }
      const data = await res.json();
      onSubmitted(data.incident);
      setSelectedType(null);
      setDescription("");
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-end justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-sm glass-card rounded-2xl p-5"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("reportIncident")}</h3>
              <button onClick={onClose} className="opacity-40 hover:opacity-80 text-xl leading-none">×</button>
            </div>

            {lat !== null && lon !== null && (
              <p className="text-xs opacity-40 mb-3">
                📍 {lat.toFixed(4)}, {lon.toFixed(4)}
              </p>
            )}

            <p className="text-xs opacity-60 mb-2 uppercase tracking-wide">{t("incidentType")}</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {INCIDENT_TYPES.map(({ type, icon }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center transition-all"
                  style={{
                    background: selectedType === type
                      ? "rgba(59,130,246,0.2)"
                      : "rgba(255,255,255,0.04)",
                    border: selectedType === type
                      ? "1px solid rgba(59,130,246,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-[9px] opacity-70 leading-tight">
                    {t(TYPE_LABEL_KEYS[type] as Parameters<typeof t>[0])}
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("incidentDescPlaceholder")}
              maxLength={280}
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none mb-3"
            />

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!selectedType || loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent-blue hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {loading ? t("submitting") : t("submitIncident")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
