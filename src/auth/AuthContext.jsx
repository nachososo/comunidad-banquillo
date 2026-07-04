import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';

const AUTH_STORAGE_KEY = 'cdb-auth-session-v1';

const AuthContext = createContext(null);

const createUserFromEmail = ({ email, name }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name.trim() || normalizedEmail.split('@')[0] || 'Usuario';
  const role = normalizedEmail === 'admin@banquillo.local' ? 'admin' : 'member';

  return {
    id: `local-${normalizedEmail}`,
    email: normalizedEmail,
    name: displayName,
    role,
    createdAt: new Date().toISOString(),
  };
};

const getStoredLocalUser = () => {
  if (isSupabaseConfigured || typeof window === 'undefined') return null;

  const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedSession) return null;

  try {
    return JSON.parse(storedSession);
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const buildUserFromSupabaseAuth = (authUser, profile = null) => ({
  id: authUser.id,
  email: profile?.email || authUser.email,
  name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
  role: profile?.role || 'member',
  createdAt: profile?.created_at || authUser.created_at,
});

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve(fallback), ms);
    }),
  ]);

const getUserFromSupabaseUser = async (authUser) => {
  if (!authUser) return null;

  try {
    const { data: profile, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('id,email,name,role,created_at')
        .eq('id', authUser.id)
        .maybeSingle(),
      3500,
      { data: null, error: null },
    );

    if (error) {
      console.warn('No se pudo cargar el perfil de Supabase:', error.message);
    }

    return buildUserFromSupabaseAuth(authUser, profile);
  } catch (error) {
    console.warn('No se pudo cargar el perfil de Supabase:', error.message);
    return buildUserFromSupabaseAuth(authUser);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredLocalUser);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let isMounted = true;
    const loadingFallback = window.setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 4500);

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const nextUser = await getUserFromSupabaseUser(data.session?.user);
        if (isMounted) {
          setUser(nextUser);
        }
      } catch (error) {
        console.warn('No se pudo cargar la sesión de Supabase:', error.message);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          window.clearTimeout(loadingFallback);
          setLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(async () => {
        try {
          const nextUser = await getUserFromSupabaseUser(session?.user);
          if (isMounted) setUser(nextUser);
        } catch (error) {
          console.warn('No se pudo actualizar la sesión de Supabase:', error.message);
          if (isMounted) setUser(null);
        } finally {
          if (isMounted) setLoading(false);
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingFallback);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      const nextUser = createUserFromEmail({ email, name: '' });
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const nextUser = await getUserFromSupabaseUser(data.user);
    setUser(nextUser);
    return nextUser;
  };

  const signUp = async ({ email, name, password }) => {
    if (!isSupabaseConfigured) {
      const nextUser = createUserFromEmail({ email, name });
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return { user: nextUser, needsConfirmation: false };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const displayName = name.trim() || normalizedEmail.split('@')[0];
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: displayName,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data.session) return { user: null, needsConfirmation: true };

    const nextUser = await getUserFromSupabaseUser(data.user);
    setUser(nextUser);
    return { user: nextUser, needsConfirmation: false };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  const signInLocalOnly = ({ email, name }) => {
    const nextUser = createUserFromEmail({ email, name });
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      authMode: isSupabaseConfigured ? 'supabase' : 'local',
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      signIn,
      signUp,
      signInLocalOnly,
      signOut,
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};
