// src/contexts/AuthContext.jsx

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ROLE } from "../utils/roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRoles = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      setRoles([]);
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error("プロフィール取得エラー:", profileError.message);
      }

      setProfile(profileData ?? null);

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select(`
          id,
          is_active,
          roles (
            code,
            name
          )
        `)
        .eq("user_id", currentUser.id)
        .eq("is_active", true);

      if (roleError) {
        console.error("ロール取得エラー:", roleError.message);
        setRoles([]);
        return;
      }

      const roleCodes =
        roleData?.map((item) => item.roles?.code).filter(Boolean) ?? [];

      setRoles(roleCodes);
    } catch (error) {
      console.error("ユーザー情報取得エラー:", error);
      setProfile(null);
      setRoles([]);
    }
  };

  const refreshMe = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("セッション取得エラー:", error.message);
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        return;
      }

      const currentSession = data.session;
      const currentUser = currentSession?.user ?? null;

      setSession(currentSession);
      setUser(currentUser);

      await fetchProfileAndRoles(currentUser);
    } catch (error) {
      console.error("認証情報取得エラー:", error);
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("初期セッション取得エラー:", error.message);
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          return;
        }

        const currentSession = data.session;
        const currentUser = currentSession?.user ?? null;

        setSession(currentSession);
        setUser(currentUser);

        await fetchProfileAndRoles(currentUser);
      } catch (error) {
        console.error("初期認証処理エラー:", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const currentUser = currentSession?.user ?? null;

      setSession(currentSession);
      setUser(currentUser);

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }

      // onAuthStateChange の中で直接 await しない
      setTimeout(async () => {
        try {
          await fetchProfileAndRoles(currentUser);
        } finally {
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isLoggedIn = !!user;

  const hasRole = (roleCode) => {
    return roles.includes(roleCode);
  };

  const canAccessAdmin = (allowedRoles = []) => {
    if (!isLoggedIn) return false;

    if (roles.includes(ROLE.SYSTEM_ADMIN)) {
      return true;
    }

    return allowedRoles.some((role) => roles.includes(role));
  };

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      roles,
      loading,
      isLoggedIn,
      hasRole,
      canAccessAdmin,
      refreshMe,
      setProfile,
    }),
    [session, user, profile, roles, loading, isLoggedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth は AuthProvider の中で使用してください。");
  }

  return context;
}