// app/api/promocoes/route.js
//
// GET    -> lista todas as promoções
// POST   -> cria uma nova promoção
// DELETE -> remove uma promoção (?id=...)

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const promocoes = await sql`SELECT * FROM promocoes ORDER BY id DESC`;
    return NextResponse.json(promocoes);
  } catch (erro) {
    console.error('Erro ao listar promoções:', erro);
    return NextResponse.json({ erro: 'Não foi possível carregar as promoções.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const promo = await request.json();
    const [nova] = await sql`
      INSERT INTO promocoes (titulo, tipo, valor, codigo_cupom, produto_id, ativo)
      VALUES (
        ${promo.titulo}, ${promo.tipo}, ${promo.valor},
        ${promo.codigo_cupom || null}, ${promo.produto_id || null}, true
      )
      RETURNING *
    `;

    // Se a promoção é de um produto específico (não cupom), já aplica o
    // preço promocional direto no produto, igual fazíamos no front-end.
    if (promo.produto_id && promo.tipo !== 'cupom') {
      const [produto] = await sql`SELECT preco FROM produtos WHERE id = ${promo.produto_id}`;
      if (produto) {
        const novoPreco = promo.tipo === 'percentual'
          ? produto.preco * (1 - promo.valor / 100)
          : Math.max(produto.preco - promo.valor, 0);
        await sql`UPDATE produtos SET preco_promo = ${Number(novoPreco.toFixed(2))} WHERE id = ${promo.produto_id}`;
      }
    }

    return NextResponse.json(nova, { status: 201 });
  } catch (erro) {
    console.error('Erro ao criar promoção:', erro);
    return NextResponse.json({ erro: 'Não foi possível criar a promoção.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ erro: 'ID da promoção é obrigatório.' }, { status: 400 });
    }
    await sql`DELETE FROM promocoes WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao remover promoção:', erro);
    return NextResponse.json({ erro: 'Não foi possível remover a promoção.' }, { status: 500 });
  }
}
