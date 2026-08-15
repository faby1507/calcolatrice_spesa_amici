// src/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uyqzhqjhuzaaosuoumwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_AaLYZAIAWgFFI2rcbN6U3Q_4T9W-O7N';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});