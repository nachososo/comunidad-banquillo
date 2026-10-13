import { readPasswordRecoveryCallback } from '../utils/passwordRecovery.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Capture the intent before the SDK consumes and removes the email callback hash.
export const passwordRecoveryCallback = readPasswordRecoveryCallback(typeof window === 'undefined' ? '' : window.location.hash);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
