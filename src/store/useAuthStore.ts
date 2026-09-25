import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { signInWithGoogleAndGetIdToken, signOutOfGoogle } from '../services/googleAuthService';
import { AppUser } from '../types';

interface AuthState {
  user: AppUser | null;
  initializing: boolean;
  signingIn: boolean;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /**
   * Email/password sign-in — shown on LoginScreen alongside Google Sign-In, mainly as a
   * fallback for devices without Google Play Services.
   */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /**
   * Self-serve email/password sign-up. Returns true if the account is signed in
   * immediately (email confirmation disabled project-wide), false if Supabase sent a
   * confirmation email instead (its default) — the caller should tell the user to check
   * their inbox in that case.
   */
  signUpWithPassword: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) {
    console.warn('Failed to load user profile', error);
    return null;
  }
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initializing: true,
  signingIn: false,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const user = session ? await fetchProfile(session.user.id) : null;
    set({ user, initializing: false });

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!newSession) {
        set({ user: null });
        return;
      }
      const profile = await fetchProfile(newSession.user.id);
      set({ user: profile });
    });
  },

  signInWithGoogle: async () => {
    if (get().signingIn) return;
    set({ signingIn: true });
    try {
      const idToken = await signInWithGoogleAndGetIdToken();
      if (!idToken) return; // user cancelled the account picker
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
    } finally {
      set({ signingIn: false });
    }
  },

  signInWithPassword: async (email: string, password: string) => {
    if (get().signingIn) return;
    set({ signingIn: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ signingIn: false });
    }
  },

  signUpWithPassword: async (email: string, password: string) => {
    if (get().signingIn) return false;
    set({ signingIn: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data.session != null;
    } finally {
      set({ signingIn: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    try {
      // No-ops harmlessly if the session started via signInWithPassword rather than Google.
      await signOutOfGoogle();
    } catch (error) {
      console.warn('Google sign-out skipped', error);
    }
    set({ user: null });
  },
}));
