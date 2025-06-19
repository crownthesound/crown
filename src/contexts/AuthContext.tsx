import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useProfile';

interface AuthContextType {
  session: any;
  profile: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profile, loading: profileLoading, setProfile } = useProfile(session?.user?.id);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setLoading(false);

      // Handle session refresh
      if (event === 'TOKEN_REFRESHED' && session) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user?.id)
            .single();

          if (error) throw error;
          setProfile(profile);
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      }
    });

    // Enable realtime subscriptions
    supabase.channel('public:video_links')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'video_links' 
      }, payload => {
        // Trigger a custom event that components can listen to
        window.dispatchEvent(new CustomEvent('videoUpdate', { detail: payload }));
      })
      .subscribe();

    supabase.channel('public:leaderboard_config')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'leaderboard_config' 
      }, payload => {
        window.dispatchEvent(new CustomEvent('contestUpdate', { detail: payload }));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        profile,
        loading: loading || profileLoading,
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}