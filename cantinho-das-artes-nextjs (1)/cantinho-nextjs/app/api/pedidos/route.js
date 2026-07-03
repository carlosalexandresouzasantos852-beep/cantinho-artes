// app/api/pedidos/route.js
//
// GET  -> lista todos os pedidos, já com os itens e o cliente embutidos
// POST -> cria um pedido novo (recebe cliente_id, forma_pagamento, itens[], etc.)
// PUT  -> atualiza o status de um pedido (precisa de "id" e "status")

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pedidos = await sql`
      SELECT p.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.criado_em DESC
    `;

    const itensTodos = await sql`SELECT * FROM pedido_itens`;
    const itensPorPedido = {};
    for (const item of itensTodos) {
      (itensPorPedido[item.pedido_id] ||= []).push(item);
    }

    const pedidosComItens = pedidos.map((p) => ({
      ...p,
      itens: itensPorPedido[p.id] || [],
    }));

    return NextResponse.json(pedidosComItens);
  } catch (erro) {
    console.error('Erro ao listar pedidos:', erro);
    return NextResponse.json({ erro: 'Não foi possível carregar os pedidos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const dados = await request.json();
    const { cliente_id, forma_pagamento, subtotal, desconto, total, itens } = dados;

    if (!cliente_id || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
    }

    const [pedido] = await sql`
      INSERT INTO pedidos (cliente_id, forma_pagamento, subtotal, desconto, total, status)
      VALUES (${cliente_id}, ${forma_pagamento}, ${subtotal}, ${desconto || 0}, ${total}, 'novo')
      RETURNING *
    `;

    for (const item of itens) {
      await sql`
        INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, preco_unitario, quantidade)
        VALUES (${pedido.id}, ${item.produto_id}, ${item.nome_produto}, ${item.preco_unitario}, ${item.quantidade})
      `;
    }

    return NextResponse.json({ ...pedido, itens }, { status: 201 });
  } catch (erro) {
    console.error('Erro ao criar pedido:', erro);
    return NextResponse.json({ erro: 'Não foi possível registrar o pedido.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ erro: 'ID e status são obrigatórios.' }, { status: 400 });
    }
    const [pedido] = await sql`UPDATE pedidos SET status = ${status} WHERE id = ${id} RETURNING *`;
    return NextResponse.json(pedido);
  } catch (erro) {
    console.error('Erro ao atualizar pedido:', erro);
    return NextResponse.json({ erro: 'Não foi possível atualizar o pedido.' }, { status: 500 });
  }
}
