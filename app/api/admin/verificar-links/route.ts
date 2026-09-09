import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });

  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  if (!userData?.user) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });

  const { data: perfil } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userData.user.id).single();
  if (!perfil?.is_admin) return NextResponse.json({ erro: 'apenas admin' }, { status: 403 });

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
  return NextResponse.json({ verificados: resultados.length, comProblema });
}
