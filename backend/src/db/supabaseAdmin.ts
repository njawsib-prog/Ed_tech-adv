import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config, { SAFE_MODE } from '../config/env';
import mockSupabase from './mockSupabase';

// Create the appropriate Supabase client based on environment
let supabaseAdmin: SupabaseClient;

if (SAFE_MODE) {
  // Use mock client for safe mode
  console.log('[DB] Using mock Supabase client (SAFE MODE)');
  supabaseAdmin = mockSupabase as unknown as SupabaseClient;
} else {
  // Use real Supabase client
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    console.error('[DB] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('[DB] Cannot create real Supabase client');
    console.error('[DB] Enable SAFE MODE by setting NODE_ENV=development or provide credentials');

    // In production this should have already crashed, but handle it here too
    if (config.isProduction) {
      process.exit(1);
    }
  }

  supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('[DB] Connected to Supabase');
}

export { supabaseAdmin };
export default supabaseAdmin;