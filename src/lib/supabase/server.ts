// =============================================================================
// CopyPasta — Supabase Server Client
// =============================================================================
// This module is used ONLY in Next.js API routes and server components.
// It uses the anon key (matching what the browser uses) so that RLS
// policies are still enforced uniformly.
//
// In v0.1 we don't need elevated permissions on the server side, so we
// intentionally do NOT use the service-role key here either.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

/**
 * Creates a new Supabase client for server-side use.
 * We create a new instance per-request to avoid shared state between requests.
 */
export function createServerSupabaseClient() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
