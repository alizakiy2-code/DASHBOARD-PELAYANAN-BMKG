import { createClient } from '@supabase/supabase-js'

// URL dan Anon Key Supabase dari Environment Variables atau Fallback Kredensial
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pmzqdbfhtqkqxbthmkzv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kSYUavnacZZNcQj5-ZLi1A_R36G9tdJ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)