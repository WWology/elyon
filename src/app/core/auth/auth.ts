import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

const DEFAULT_MALE_AVATAR_URL = '/images/man.png';
const DEFAULT_FEMALE_AVATAR_URL = '/images/woman.png';

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
    const { data, error } = await this.supabase.from('people').select('gender, avatar_url').eq('id', uid).maybeSingle();
    if (error) {
      console.error('Error while fetching user avatar URL', error);
      return null;
    }

    if (data?.avatar_url) return data.avatar_url;
    if (data?.gender === 'M') return DEFAULT_MALE_AVATAR_URL;
    if (data?.gender === 'F') return DEFAULT_FEMALE_AVATAR_URL;
    return null;
  }
}
