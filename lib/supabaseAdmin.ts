import { createClient } from '@supabase/supabase-js';

// Só use este cliente dentro de app/api/** (código que roda no servidor).
// A service role key ignora todas as regras de RLS — nunca exponha ela
// com o prefixo NEXT_PUBLIC_, e nunca importe este arquivo de um "use client".
// Placeholders evitam que o build quebre antes de o .env.local ser preenchido;
// em produção, com as variáveis reais definidas, esses valores nunca são usados.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
);

/**
 * Concede (ou revoga) acesso para um e-mail. Se a pessoa já tem conta na
 * plataforma, atualiza o perfil dela na hora. Se ainda não tem (comprou antes
 * de se cadastrar), guarda em "acessos_pendentes" — o próprio trigger do banco
 * aplica isso automaticamente quando ela criar a conta.
 */
export async function aplicarAcesso(
  email: string,
  campo: 'is_assinante' | 'is_aluno_particular',
  valor: boolean
) {
  const { data: perfil } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (perfil) {
    await supabaseAdmin.from('profiles').update({ [campo]: valor }).eq('id', perfil.id);
    return;
  }

  await supabaseAdmin
    .from('acessos_pendentes')
    .upsert({ email, [campo]: valor }, { onConflict: 'email' });
}
