"use client";

import { MALAYSIA_LOCATIONS } from "@/lib/locations";
import { MalaysiaLocation, SafetyLevel } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";

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
  return (
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
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-all ${
              isSelected
                ? "bg-accent-blue/20 border-accent-blue text-white font-semibold"
                : "bg-card-bg border-card-border hover:border-slate-500"
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
  );
}
