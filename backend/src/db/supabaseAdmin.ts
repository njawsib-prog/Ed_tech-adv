import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config/env';

// Create the appropriate Supabase client based on environment
let supabaseAdmin: SupabaseClient;

if (config.isSafeMode) {
  // Import mock client for safe mode
  const { mockSupabase } = require('./mockSupabase');
  console.log('[DB] Using mock Supabase client (Safe Mode)');
  supabaseAdmin = mockSupabase as unknown as SupabaseClient;
} else {
  // Use real Supabase client
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    console.error('[DB] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('[DB] Cannot create real Supabase client');
    console.error('[DB] Enable Safe Mode by setting NODE_ENV=development or provide credentials');
    
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