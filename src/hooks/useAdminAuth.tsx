import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "owner" | "admin";

interface AdminAuth {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  role: AppRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  session: Session | null;
  token: string | null;
  refreshRole: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuth | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error || !data) {
        setRole(null);
        return;
      }

      const roles = data.map((r) => r.role);
      if (roles.includes("owner")) {
        setRole("owner");
      } else if (roles.includes("admin")) {
        setRole("admin");
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  }, []);

  const refreshRole = useCallback(async () => {
    if (session?.user) {
      await fetchRole(session.user.id);
    }
  }, [session?.user, fetchRole]);

  useEffect(() => {
    const handleSession = async (sess: Session | null) => {
      setSession(sess);
      if (sess?.user) {
        await fetchRole(sess.user.id);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      handleSession(sess);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      handleSession(sess);
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
  }, []);

  const isOwner = role === "owner";
  const isAdmin = role === "admin" || isOwner;

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading,
        user: session?.user ?? null,
        role,
        isOwner,
        isAdmin,
        session,
        token: session?.access_token ?? null,
        refreshRole,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
