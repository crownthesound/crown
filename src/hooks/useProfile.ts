import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export type UserRole = 'user' | 'admin' | 'organizer';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string | null;
  updated_at: string | null;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          throw error;
        }

        if (!data) {
          console.error('No profile found for user');
          throw new Error('Profile not found');
        }

        // Validate and ensure proper role typing
        const validRoles: UserRole[] = ['user', 'admin', 'organizer'];
        const role = data.role as UserRole;

        // Create properly typed profile
        const typedProfile: Profile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: validRoles.includes(role) ? role : 'user', // Fallback to 'user' if invalid role
          created_at: data.created_at,
          updated_at: data.updated_at
        };

        setProfile(typedProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load user profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  return { profile, setProfile, loading };
}