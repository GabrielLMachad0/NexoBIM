import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

// Duas formas de chamar essa rota:
// 1. Um admin logado, clicando em "Verificar agora" em /admin/recursos (Bearer = JWT do usuário).
// 2. O cron da Vercel, uma vez por semana (Bearer = CRON_SECRET, que a própria Vercel
//    injeta automaticamente quando essa env var existe no projeto — ver vercel.json).
async function autorizado(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return false;

  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;

  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData?.user) return false;
  const { data: perfil } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userData.user.id).single();
  return !!perfil?.is_admin;
}

export async function GET(req: NextRequest) {
  if (!(await autorizado(req))) return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });

  const { data: recursos } = await supabaseAdmin.from('recursos_download').select('id, nome, categoria, link_drive');

  const resultados = await Promise.all(
    (recursos || []).map(async (r) => {
      try {
        const resposta = await fetch(r.link_drive, { method: 'GET', redirect: 'follow' });
        return { id: r.id, nome: r.nome, categoria: r.categoria, ok: resposta.status < 400, status: resposta.status };
      } catch {
        return { id: r.id, nome: r.nome, categoria: r.categoria, ok: false, status: 0 };
      }
    })
  );

  const comProblema = resultados.filter((r) => !r.ok);

  await supabaseAdmin.from('verificacoes_links').insert({
    verificados: resultados.length,
    com_problema: comProblema,
  });

  return NextResponse.json({ verificados: resultados.length, comProblema });
}
