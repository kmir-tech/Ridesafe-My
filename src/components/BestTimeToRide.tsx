"use client";

import { ForecastData, ForecastHour, SafetyLevel } from "@/lib/types";
import { getSafetyColor } from "@/lib/safety";
import { useI18n } from "@/contexts/I18nContext";

interface BestTimeToRideProps {
  data: ForecastData | null;
  loading: boolean;
}

interface RideWindow {
  startIdx: number;
  endIdx: number;
  avgScore: number;
}

function findBestWindow(hourly: ForecastHour[]): RideWindow | null {
  let best: RideWindow | null = null;
  let i = 0;

  while (i < hourly.length) {
    if (hourly[i].safety_score >= 60) {
      let j = i;
      let sum = 0;
      while (j < hourly.length && hourly[j].safety_score >= 60) {
        sum += hourly[j].safety_score;
        j++;
      }
      const len = j - i;
      if (len >= 2) {
        const avg = Math.round(sum / len);
        if (!best || avg > best.avgScore) {
          best = { startIdx: i, endIdx: j - 1, avgScore: avg };
        }
      }
      i = j;
    } else {
      i++;
    }
  }

  // If no 2+ hour window, find the single safest hour
  if (!best) {
    let maxScore = -1;
    let maxIdx = 0;
    for (let k = 0; k < hourly.length; k++) {
      if (hourly[k].safety_score > maxScore) {
        maxScore = hourly[k].safety_score;
        maxIdx = k;
      }
    }
    if (maxScore >= 40) {
      best = { startIdx: maxIdx, endIdx: maxIdx, avgScore: maxScore };
    }
  }

  return best;
}

function formatHour(timeStr: string): string {
  const date = new Date(timeStr);
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}${ampm}`;
}

export default function BestTimeToRide({
  data,
  loading,
}: BestTimeToRideProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-slate-700/50 rounded w-2/5 mb-4" />
        <div className="h-2.5 bg-slate-700/50 rounded-full mb-6" />
        <div className="h-12 bg-slate-700/50 rounded-lg" />
      </div>
    );
  }

  if (!data || data.hourly.length === 0) return null;

  const { hourly } = data;
  const bestWindow = findBestWindow(hourly);
  const allSafe = hourly.every((h) => h.safety_score >= 70);
  const allDangerous = hourly.every((h) => h.safety_score < 40);

  // Time labels at regular intervals
  const labelStep = Math.max(1, Math.floor(hourly.length / 4));
  const labelIndices: number[] = [];
  for (let i = 0; i < hourly.length; i += labelStep) {
    labelIndices.push(i);
  }
  if (labelIndices[labelIndices.length - 1] !== hourly.length - 1) {
    labelIndices.push(hourly.length - 1);
  }

  const windowLevel: SafetyLevel = allSafe
    ? "Safe"
    : allDangerous
      ? "Dangerous"
      : bestWindow
        ? bestWindow.avgScore >= 70
          ? "Safe"
          : "Caution"
        : "Dangerous";

  const windowColor = getSafetyColor(windowLevel);

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-lg font-bold mb-3">{t("bestTimeToRide")}</h3>

      {/* Timeline bar */}
      <div className="flex rounded-full overflow-hidden h-2.5 mb-1">
        {hourly.map((h, i) => (
          <div
            key={i}
            className="flex-1 transition-opacity"
            style={{
              backgroundColor: getSafetyColor(h.safety_level as SafetyLevel),
              opacity:
                bestWindow &&
                i >= bestWindow.startIdx &&
                i <= bestWindow.endIdx
                  ? 1
                  : 0.3,
            }}
          />
        ))}
      </div>

      {/* Time labels */}
      <div className="relative h-4 mb-4">
        {labelIndices.map((idx) => (
          <span
            key={idx}
            className="absolute text-[10px] opacity-40"
            style={{
              left: `${(idx / (hourly.length - 1)) * 100}%`,
              transform:
                idx === 0
                  ? "none"
                  : idx === hourly.length - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {formatHour(hourly[idx].time)}
          </span>
        ))}
      </div>

      {/* Recommendation */}
      {allSafe ? (
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            backgroundColor: `${windowColor}10`,
            border: `1px solid ${windowColor}25`,
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{
              backgroundColor: `${windowColor}20`,
              color: windowColor,
              border: `2px solid ${windowColor}`,
            }}
          >
            OK
          </div>
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: windowColor }}
            >
              All clear for the next {hourly.length}h
            </div>
            <div className="text-xs opacity-60">
              Good riding conditions throughout
            </div>
          </div>
        </div>
      ) : allDangerous ? (
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            backgroundColor: `${windowColor}10`,
            border: `1px solid ${windowColor}25`,
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{
              backgroundColor: `${windowColor}20`,
              color: windowColor,
              border: `2px solid ${windowColor}`,
            }}
          >
            --
          </div>
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: windowColor }}
            >
              No safe windows found
            </div>
            <div className="text-xs opacity-60">
              Consider postponing your ride today
            </div>
          </div>
        </div>
      ) : bestWindow ? (
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            backgroundColor: `${windowColor}10`,
            border: `1px solid ${windowColor}25`,
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{
              backgroundColor: `${windowColor}20`,
              color: windowColor,
              border: `2px solid ${windowColor}`,
            }}
          >
            {bestWindow.avgScore}
          </div>
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: windowColor }}
            >
              {formatHour(hourly[bestWindow.startIdx].time)}
              {bestWindow.startIdx !== bestWindow.endIdx &&
                ` - ${formatHour(hourly[bestWindow.endIdx].time)}`}
            </div>
            <div className="text-xs opacity-60">
              Avg score: {bestWindow.avgScore}
              {bestWindow.startIdx !== bestWindow.endIdx &&
                ` \u00B7 ${bestWindow.endIdx - bestWindow.startIdx + 1}h window`}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
