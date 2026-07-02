// app/api/produtos/route.js
//
// GET    -> lista produtos (?somente_ativos=true para filtrar)
// POST   -> cria um novo produto
// PUT    -> atualiza um produto existente (precisa de "id" no corpo)
// DELETE -> remove um produto (?id=...)

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const somenteAtivos = new URL(request.url).searchParams.get('somente_ativos') === 'true';
    const produtos = somenteAtivos
      ? await sql`SELECT * FROM produtos WHERE ativo = true ORDER BY id ASC`
      : await sql`SELECT * FROM produtos ORDER BY id ASC`;
    return NextResponse.json(produtos);
  } catch (erro) {
    console.error('Erro ao listar produtos:', erro);
    return NextResponse.json({ erro: 'Não foi possível carregar os produtos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const p = await request.json();
    const [produto] = await sql`
      INSERT INTO produtos (
        categoria_id, nome, descricao, preco, preco_promo, imagem_url,
        estoque, destaque, ativo, mercadopago_link, pix_qr_imagem_url
      ) VALUES (
        ${p.categoria_id || null}, ${p.nome}, ${p.descricao || ''},
        ${p.preco || 0}, ${p.preco_promo || null}, ${p.imagem_url || ''},
        ${p.estoque || 0}, ${!!p.destaque}, ${p.ativo !== false},
        ${p.mercadopago_link || ''}, ${p.pix_qr_imagem_url || ''}
      )
      RETURNING *
    `;
    return NextResponse.json(produto, { status: 201 });
  } catch (erro) {
    console.error('Erro ao criar produto:', erro);
    return NextResponse.json({ erro: 'Não foi possível criar o produto.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const p = await request.json();
    if (!p.id) {
      return NextResponse.json({ erro: 'ID do produto é obrigatório.' }, { status: 400 });
    }
    const [produto] = await sql`
      UPDATE produtos SET
        categoria_id = ${p.categoria_id || null},
        nome = ${p.nome},
        descricao = ${p.descricao || ''},
        preco = ${p.preco || 0},
        preco_promo = ${p.preco_promo || null},
        imagem_url = ${p.imagem_url || ''},
        estoque = ${p.estoque || 0},
        destaque = ${!!p.destaque},
        ativo = ${p.ativo !== false},
        mercadopago_link = ${p.mercadopago_link || ''},
        pix_qr_imagem_url = ${p.pix_qr_imagem_url || ''},
        atualizado_em = NOW()
      WHERE id = ${p.id}
      RETURNING *
    `;
    return NextResponse.json(produto);
  } catch (erro) {
    console.error('Erro ao atualizar produto:', erro);
    return NextResponse.json({ erro: 'Não foi possível atualizar o produto.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ erro: 'ID do produto é obrigatório.' }, { status: 400 });
    }
    await sql`DELETE FROM produtos WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao remover produto:', erro);
    return NextResponse.json({ erro: 'Não foi possível remover o produto.' }, { status: 500 });
  }
}
