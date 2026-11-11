import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

@Service()
export class Auth {
  private supabase = inject(Supabase).supabase;

  async getUser(): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) {
      console.error(error);
      return null;
    }
    return data.user;
  }

  onAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    this.supabase.auth.onAuthStateChange(callback);
  }

  signUp(email: string, password: string, fullName: string) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  }

  signInWithEmailPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async getAvatarUrl(uid: string): Promise<string | null> {
    const { data, error } = await this.supabase.from('profiles').select('avatar_url').eq('id', uid).limit(1).single();
    if (error) {
      console.error('Error while fetching user avatar URL', error);
      return null;
    }

    return data?.avatar_url ?? null;
  }
}
