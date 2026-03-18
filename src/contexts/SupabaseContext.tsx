"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface SupabaseContextValue {
  supabase: SupabaseClient | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  openAuthModal: (defaultTab?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  authModalTab: "signin" | "signup";
}

const SupabaseContext = createContext<SupabaseContextValue>({
  supabase: null,
  user: null,
  loading: false,
  signOut: async () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
  authModalOpen: false,
  authModalTab: "signin",
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  // Initialize client lazily on first render (client-side only)
  const clientRef = useRef<SupabaseClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = createSupabaseBrowserClient();
  }
  const supabase = clientRef.current;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase); // only loading when Supabase is configured
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) setAuthModalOpen(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const openAuthModal = useCallback(
    (defaultTab: "signin" | "signup" = "signin") => {
      setAuthModalTab(defaultTab);
      setAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        user,
        loading,
        signOut,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
        authModalTab,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
