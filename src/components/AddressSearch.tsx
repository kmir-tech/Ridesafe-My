"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MalaysiaLocation } from "@/lib/types";
import { createCoordinateLocation } from "@/lib/places";
import { useI18n } from "@/contexts/I18nContext";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface AddressSearchProps {
  onSelect: (loc: MalaysiaLocation) => void;
  placeholder?: string;
}

export default function AddressSearch({ onSelect, placeholder }: AddressSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done">("idle");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      setOpen(false);
      return;
    }
    setStatus("searching");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + " Malaysia")}&format=json&limit=5&countrycodes=my`,
        {
          headers: {
            "User-Agent": "RideSafeMY/1.0 (motorcycle safety app)",
            "Accept-Language": "en",
          },
        }
      );
      if (!res.ok) throw new Error("Nominatim error");
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setStatus("done");
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const location = createCoordinateLocation(
      lat,
      lon,
      displayName(result),
      result.address?.state ?? "Malaysia"
    );
    onSelect(location);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  const displayName = (r: NominatimResult) => {
    // Trim to first two comma-separated parts for brevity
    const parts = r.display_name.split(",");
    return parts.slice(0, 3).join(",").trim();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? t("searchAddress")}
          className="w-full bg-slate-800/80 border border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {/* Spinner */}
        {status === "searching" && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin opacity-50"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-[1200]"
          style={{
            background: "rgba(15, 23, 42, 0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {results.length === 0 && status === "done" ? (
            <div className="px-4 py-3 text-sm opacity-50">{t("noResults")}</div>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-slate-700/60 transition-colors border-b last:border-0"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <span className="line-clamp-2 opacity-80">{displayName(r)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
