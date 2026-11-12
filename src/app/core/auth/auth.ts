import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase';
import { AuthChangeEvent, isAuthSessionMissingError, Session, User } from '@supabase/supabase-js';
import { Database } from '../database.types';

const DEFAULT_MALE_AVATAR_URL = '/images/man.png';
const DEFAULT_FEMALE_AVATAR_URL = '/images/woman.png';

@Service()
export class Auth {
  // Reuse the Supabase client provided by the application's Supabase service.
  private supabase = inject(Supabase).supabase;

  async getUser(): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser();
    // A missing session is expected when signed out; report other lookup errors.
    if (error) {
      if (!isAuthSessionMissingError(error)) console.error(error);
      return null;
    }
    return data.user;
  }

  onAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    // Return the subscription so the caller can unsubscribe when it is destroyed.
    return this.supabase.auth.onAuthStateChange(callback).data.subscription;
  }

  signUp(email: string, password: string, fullName: string, gender: Database['public']['Enums']['gender']) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        // Signup metadata supplies profile details; it must not be used for authorization
        // because users can change their own metadata.
        data: {
          full_name: fullName,
          gender,
        },
      },
    });
  }

  signOutLocal() {
    // End the current session without signing out other sessions.
    return this.supabase.auth.signOut({ scope: 'local' });
  }

  signOutEverywhere() {
    // Sign out the user's sessions across devices.
    return this.supabase.auth.signOut({ scope: 'global' });
  }

  signInWithEmailPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  requestPasswordReset(email: string, redirectTo: string) {
    return this.supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }

  updatePassword(password: string) {
    return this.supabase.auth.updateUser({ password });
  }

  async getAvatarUrl(uid: string): Promise<string | null> {
    // maybeSingle allows a missing person row to return null instead of an error.
    const { data, error } = await this.supabase.from('people').select('gender, avatar_url').eq('id', uid).maybeSingle();
    if (error) {
      console.error('Error while fetching user avatar URL', error);
      return null;
    }

    // Prefer a saved avatar, then a gender-based default; null lets the caller use its own fallback.
    if (data?.avatar_url) return data.avatar_url;
    if (data?.gender === 'M') return DEFAULT_MALE_AVATAR_URL;
    if (data?.gender === 'F') return DEFAULT_FEMALE_AVATAR_URL;
    return null;
  }
}
