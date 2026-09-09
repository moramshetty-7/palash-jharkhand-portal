import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase credentials not found.\n' +
    'Copy .env.example to .env and fill in your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'Get them from: https://supabase.com/dashboard → Project Settings → API'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

export default supabase
