"use client";

import { useState, useEffect, useRef } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useI18n } from "@/contexts/I18nContext";
import { AppNotification } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  route_alert: "#ef4444",
  incident_nearby: "#eab308",
  system: "#3b82f6",
};

export default function NotificationCenter() {
  const { user, openAuthModal } = useSupabase();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } finally {
      setLoading(false);
    }
  };

  // Poll every 60s when open
  useEffect(() => {
    if (!open || !user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [open, user]);

  // Also fetch unread count periodically when closed
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications?unread_only=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count);
        }
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 120000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleOpen = () => {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    setOpen(!open);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-lg transition-colors hover:bg-slate-700/50"
        aria-label={t("notifications")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-80 rounded-xl z-50 overflow-hidden"
          style={{
            background: "rgba(15,23,42,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <span className="text-sm font-semibold">{t("notifications")}</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-sm opacity-40">{t("loading")}</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm opacity-40">{t("noNotifications")}</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-slate-700/30 last:border-0"
                  style={{ opacity: n.read_at ? 0.6 : 1 }}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[n.type] ?? "#94a3b8" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{n.title}</p>
                      <p className="text-xs opacity-60 mt-0.5">{n.body}</p>
                      <p className="text-[10px] opacity-40 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read_at && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
