import { NextRequest, NextResponse } from 'next/server';
import { aplicarAcesso } from '../../../../lib/supabaseAdmin';

const STATUS_LIBERA = ['paid', 'approved'];
const STATUS_REVOGA = ['refunded', 'chargedback', 'refused', 'canceled', 'subscription_canceled'];

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = await req.json();

  // A Kiwify (na configuração clássica de webhook por produto) usa um token na
  // própria URL cadastrada, ex.: .../api/webhooks/kiwify?token=SEU_TOKEN — o que
  // chegar aqui precisa bater com o que você colocou no .env. Ao registrar o
  // webhook no painel da Kiwify, confira no teste deles se é assim mesmo que a
  // verificação chega (pode ter mudado para um header de assinatura).
  if (url.searchParams.get('token') !== process.env.KIWIFY_WEBHOOK_TOKEN) {
    return NextResponse.json({ erro: 'token inválido' }, { status: 401 });
  }

  // ATENÇÃO: a Kiwify tem um botão de "testar webhook" no painel que mostra o
  // payload real — confira esses caminhos contra ele antes de ativar de vez,
  // os nomes de campo variam entre "Customer"/"customer" conforme a versão.
  const status: string | undefined = body.order_status ?? body.status;
  const email: string | undefined = body?.Customer?.email ?? body?.customer?.email;
  const produtoId: string | undefined = String(
    body?.Product?.product_id ?? body?.product?.id ?? body?.product_id ?? ''
  );

  if (!email) {
    console.log('Webhook Kiwify sem e-mail do comprador:', JSON.stringify(body));
    return NextResponse.json({ ok: true });
  }

  let campo: 'is_assinante' | 'is_aluno_particular' | null = null;
  if (produtoId === process.env.KIWIFY_ID_PRODUTO_ASSINATURA) campo = 'is_assinante';
  if (produtoId === process.env.KIWIFY_ID_PRODUTO_AULA_PARTICULAR) campo = 'is_aluno_particular';

  if (campo && status && STATUS_LIBERA.includes(status)) {
    await aplicarAcesso(email, campo, true);
  } else if (campo && status && STATUS_REVOGA.includes(status)) {
    await aplicarAcesso(email, campo, false);
  } else {
    console.log('Webhook Kiwify não reconhecido — status:', status, 'produto:', produtoId);
  }

  return NextResponse.json({ ok: true });
}
