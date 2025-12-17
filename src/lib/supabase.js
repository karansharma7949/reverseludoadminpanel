import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Debug: Log if keys are present (not the actual values)
if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('Supabase Key:', (supabaseServiceKey || supabaseAnonKey) ? '✓ Set' : '✗ Missing');
}

// Use service role key for admin operations (bypasses RLS)
// Falls back to anon key if service key not available
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseServiceKey || supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
