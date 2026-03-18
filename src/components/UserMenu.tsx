"use client";

import { useState, useRef, useEffect } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useI18n } from "@/contexts/I18nContext";

interface UserMenuProps {
  onRideHistoryOpen: () => void;
}

export default function UserMenu({ onRideHistoryOpen }: UserMenuProps) {
  const { user, signOut, openAuthModal } = useSupabase();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal("signin")}
        className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-90 transition-opacity"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {t("signIn")}
      </button>
    );
  }

  const initials = (user.user_metadata?.full_name || user.email || "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-xs font-bold text-white"
        aria-label="User menu"
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-44 rounded-xl z-50 py-1"
          style={{
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div className="px-3 py-2 border-b border-slate-700/50">
            <p className="text-xs font-medium truncate">{user.user_metadata?.full_name || user.email}</p>
            <p className="text-xs opacity-40 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); onRideHistoryOpen(); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors"
          >
            {t("rideHistory")}
          </button>
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700/50 transition-colors"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
