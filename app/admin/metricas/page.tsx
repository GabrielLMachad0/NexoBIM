'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import Cabecalho from '../../../components/Cabecalho';

type Aula = { id: string; titulo: string };
type Nivel = { id: string; nome: string; aulas: Aula[]; tarefas_padrao: { id: string }[] };
type Curso = { id: string; nome: string; niveis: Nivel[] };

type LinhaNivel = {
  id: string;
  nome: string;
  curso: string;
  totalAulas: number;
  visualizacoes: number;
  certificados: number;
};

export default function AdminMetricas() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [assinantes, setAssinantes] = useState(0);
  const [particulares, setParticulares] = useState(0);
  const [certificadosEmitidos, setCertificadosEmitidos] = useState(0);
  const [linhas, setLinhas] = useState<LinhaNivel[]>([]);
  const [aulaTop, setAulaTop] = useState<{ titulo: string; vezes: number } | null>(null);

  useEffect(() => {
    guardaEcarrega();
  }, []);

  async function guardaEcarrega() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { router.push('/login'); return; }
    const { data: perfil } = await supabase.from('profiles').select('is_admin').eq('id', sessao.session.user.id).single();
    if (!perfil?.is_admin) { router.push('/dashboard'); return; }
    await carregar();
    setCarregando(false);
  }

  async function carregar() {
    // As quatro consultas abaixo não dependem uma da outra — buscam em paralelo.
    const [{ data: alunos }, { data: certs }, { data: cursosData }, { data: progAulas }] = await Promise.all([
      supabase.from('profiles').select('is_admin, is_assinante, is_aluno_particular').eq('is_admin', false),
      supabase.from('certificados').select('nivel_id'),
      supabase.from('cursos').select('id, nome, niveis(id, nome, aulas(id, titulo), tarefas_padrao(id))').order('ordem'),
      supabase.from('progresso_aulas').select('aula_id'),
    ]);

    setTotalAlunos((alunos || []).length);
    setAssinantes((alunos || []).filter((a: any) => a.is_assinante).length);
    setParticulares((alunos || []).filter((a: any) => a.is_aluno_particular).length);
    setCertificadosEmitidos((certs || []).length);

    const cursos = (cursosData as any as Curso[]) || [];

    const contagemPorAula = new Map<string, number>();
    for (const p of progAulas || []) {
      contagemPorAula.set(p.aula_id, (contagemPorAula.get(p.aula_id) || 0) + 1);
    }

    const contagemCertPorNivel = new Map<string, number>();
    for (const c of certs || []) {
      contagemCertPorNivel.set(c.nivel_id, (contagemCertPorNivel.get(c.nivel_id) || 0) + 1);
    }

    const linhasCalculadas: LinhaNivel[] = [];
    let melhorAula: { titulo: string; vezes: number } | null = null;

    for (const curso of cursos) {
      for (const nivel of curso.niveis) {
        let visualizacoes = 0;
        for (const aula of nivel.aulas) {
          const vezes = contagemPorAula.get(aula.id) || 0;
          visualizacoes += vezes;
          if (vezes > 0 && (!melhorAula || vezes > melhorAula.vezes)) {
            melhorAula = { titulo: aula.titulo, vezes };
          }
        }
        linhasCalculadas.push({
          id: nivel.id,
          nome: nivel.nome,
          curso: curso.nome,
          totalAulas: nivel.aulas.length,
          visualizacoes,
          certificados: contagemCertPorNivel.get(nivel.id) || 0,
        });
      }
    }

    setLinhas(linhasCalculadas);
    setAulaTop(melhorAula);
  }

  if (carregando) return <div className="envolucro">Carregando...</div>;

  return (
    <div>
      <Cabecalho ehAdmin />
      <div className="envolucro">
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Métricas</h1>

        <div className="grade-metricas">
          <div className="painel metrica"><span className="metrica-numero">{totalAlunos}</span><span className="painel-legenda">alunos cadastrados</span></div>
          <div className="painel metrica"><span className="metrica-numero">{assinantes}</span><span className="painel-legenda">assinantes</span></div>
          <div className="painel metrica"><span className="metrica-numero">{particulares}</span><span className="painel-legenda">alunos particulares</span></div>
          <div className="painel metrica"><span className="metrica-numero">{certificadosEmitidos}</span><span className="painel-legenda">certificados emitidos</span></div>
        </div>

        {aulaTop && (
          <div className="painel">
            <p className="painel-titulo">Aula mais assistida</p>
            <p className="painel-legenda" style={{ margin: 0 }}>{aulaTop.titulo} — {aulaTop.vezes} visualização{aulaTop.vezes === 1 ? '' : 'ões'}</p>
          </div>
        )}

        <p className="painel-legenda" style={{ marginTop: 24, marginBottom: 8 }}>Progresso por nível</p>
        <div className="painel">
          {linhas.map((l) => (
            <div className="aula-linha" key={l.id}>
              <div>
                <div className="aula-titulo">{l.nome}</div>
                <p className="painel-legenda" style={{ margin: 0 }}>{l.curso} · {l.totalAulas} aula{l.totalAulas === 1 ? '' : 's'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="marcador">{l.visualizacoes} visualizaç{l.visualizacoes === 1 ? 'ão' : 'ões'}</div>
                {l.certificados > 0 && <div className="marcador feito">{l.certificados} certificado{l.certificados === 1 ? '' : 's'}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
