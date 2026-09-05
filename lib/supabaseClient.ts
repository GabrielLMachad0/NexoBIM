import { createClient } from '@supabase/supabase-js';

// Placeholders evitam que o build quebre antes de o .env.local ser preenchido;
// em produção, com as variáveis reais definidas, esses valores nunca são usados.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
