import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pixhzujqhtevmpekbnyg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeGh6dWpxaHRldm1wZWtibnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzI3OTQsImV4cCI6MjA4ODA0ODc5NH0.nS--h4auCc6j0-i12SVMueEubjIe3iit8A7i84u_TM0s';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
