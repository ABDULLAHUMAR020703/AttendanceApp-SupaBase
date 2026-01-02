// Supabase Configuration for Reporting Service
// This service uses Service Role Key for read-only database access
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('✗ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  throw new Error('Supabase configuration missing');
}

// Create Supabase client with service role key (admin privileges)
// Service role key bypasses Row Level Security (RLS) policies
// IMPORTANT: This service only performs READ operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✓ Reporting Service: Supabase client initialized successfully');

module.exports = {
  supabase,
  supabaseUrl,
  initialized: true,
};

