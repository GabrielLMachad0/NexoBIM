import { NextRequest, NextResponse } from 'next/server';
import { aplicarAcesso } from '../../../../lib/supabaseAdmin';

// Eventos que liberam acesso, e eventos que revogam. Ajuste aqui se a Hotmart
// mudar os nomes — a lista atual está em Ferramentas > Webhook > Eventos.
const EVENTOS_LIBERA = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
const EVENTOS_REVOGA = ['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'SUBSCRIPTION_CANCELLATION'];

export async function POST(req: NextRequest) {
  const body = await req.json();

  // A Hotmart inclui o "Hottok" (copiado da aba Autenticação do seu Webhook)
  // dentro do próprio corpo da notificação — comparamos com o que está no .env.
  if (body.hottok !== process.env.HOTMART_HOTTOK) {
    return NextResponse.json({ erro: 'hottok inválido' }, { status: 401 });
  }

  const evento = body.event as string;
  const dados = body.data || {};

  // ATENÇÃO: confira esses caminhos no painel Hotmart (Webhook > Histórico > ver
  // Payload de uma notificação real) — a estrutura pode variar um pouco conforme
  // o tipo de produto. Ajuste as três linhas abaixo se os nomes forem diferentes.
  const email: string | undefined = dados?.buyer?.email;
  const produtoId: string | undefined = String(dados?.product?.id ?? '');

  if (!email) {
    console.log('Webhook Hotmart sem e-mail do comprador:', JSON.stringify(body));
    return NextResponse.json({ ok: true }); // responde 200 mesmo assim, pra Hotmart não ficar reenviando
  }

  let campo: 'is_assinante' | 'is_aluno_particular' | null = null;
  if (produtoId === process.env.HOTMART_ID_PRODUTO_ASSINATURA) campo = 'is_assinante';
  if (produtoId === process.env.HOTMART_ID_PRODUTO_AULA_PARTICULAR) campo = 'is_aluno_particular';

  if (campo && EVENTOS_LIBERA.includes(evento)) {
    await aplicarAcesso(email, campo, true);
  } else if (campo && EVENTOS_REVOGA.includes(evento)) {
    await aplicarAcesso(email, campo, false);
  } else {
    console.log('Webhook Hotmart não reconhecido — evento:', evento, 'produto:', produtoId);
  }

  return NextResponse.json({ ok: true });
}
