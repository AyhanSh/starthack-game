import { createClient, SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

/**
 * Get the Supabase client singleton.
 * Returns null if env vars are not configured (offline mode).
 */
export function getSupabase(): SupabaseClient | null {
  if (instance) return instance;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[Supabase] Missing env vars. Running in offline mode.');
    return null;
  }

  if (!key.startsWith('eyJ')) {
    console.error(
      '[Supabase] VITE_SUPABASE_ANON_KEY does not look like a valid JWT. ' +
      'Go to Supabase Dashboard → Settings → API and copy the anon/public key (starts with "eyJ...").',
    );
  }

  instance = createClient(url, key);
  return instance;
}

/** Check if Supabase is available */
export function isOnline(): boolean {
  return getSupabase() !== null;
}
