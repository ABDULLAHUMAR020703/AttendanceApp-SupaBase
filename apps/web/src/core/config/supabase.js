import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isConfigured) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy apps/web/.env.example to apps/web/.env and fill in values, then restart the Vite server.'
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'public-anon-placeholder',
  {
    auth: {
      autoRefreshToken: isConfigured,
      persistSession: isConfigured,
      detectSessionInUrl: isConfigured,
    },
  }
);
