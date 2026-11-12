import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment.development';
import { Database } from './database.types';

@Service()
export class Supabase {
  public supabase: SupabaseClient<Database> = createClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );
}
