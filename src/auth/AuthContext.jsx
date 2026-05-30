import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, status')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to load profile:', error);
    return null;
  }

  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function syncAuth(nextSession) {
      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setProfileLoaded(true);
        return;
      }

      setProfileLoaded(false);
      const nextProfile = await fetchProfile(nextSession.user.id);
      if (!mounted) return;

      setProfile(nextProfile);
      setProfileLoaded(true);
    }

    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error(error);
        await syncAuth(data?.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return;
      syncAuth(nextSession);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => {
    const isAdmin = profile?.role === 'admin' && profile?.status === 'active';

    return {
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      loading,
      profileLoaded,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setProfile(null);
        setProfileLoaded(true);
      },
      refreshProfile: async () => {
        if (!session?.user?.id) return;
        setProfileLoaded(false);
        const nextProfile = await fetchProfile(session.user.id);
        setProfile(nextProfile);
        setProfileLoaded(true);
      },
    };
  }, [session, profile, loading, profileLoaded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
