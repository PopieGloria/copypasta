// =============================================================================
// CopyPasta — Supabase Browser Client
// =============================================================================
// Uses the ANON key only. This client is safe to use in React components and
// client-side code. It respects Row Level Security (RLS) policies.
//
// IMPORTANT: Never use the service-role key here.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Copy .env.local.example to .env.local and fill in your values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // No auth in v0.1; disable persistence to avoid unnecessary localStorage usage
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
