"use client";

import { useState } from "react";
import { MALAYSIA_LOCATIONS } from "@/lib/locations";
import { MalaysiaLocation, SafetyLevel } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import { useI18n } from "@/contexts/I18nContext";

interface LocationSelectorProps {
  selected: MalaysiaLocation | null;
  onSelect: (location: MalaysiaLocation) => void;
  safetyScores: Record<string, { score: number; level: string }>;
}

export default function LocationSelector({
  selected,
  onSelect,
  safetyScores,
}: LocationSelectorProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs opacity-55 hover:opacity-80 transition-opacity mb-2"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        {t("quickCityShortcuts")}
      </button>

      {expanded && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-6 md:px-6">
          {MALAYSIA_LOCATIONS.map((loc) => {
            const isSelected = selected?.name === loc.name;
            const safety = safetyScores[loc.name];
            const color = safety
              ? getSafetyColor(safety.level as SafetyLevel)
              : undefined;

            return (
              <button
                key={loc.name}
                onClick={() => onSelect(loc)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all ${
                  isSelected
                    ? "bg-accent-blue/12 border-accent-blue/70 text-white font-semibold"
                    : "bg-slate-900/50 border-white/8 text-slate-300 hover:border-slate-500"
                }`}
              >
                {safety && (
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: color }}
                  />
                )}
                {loc.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
