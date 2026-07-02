// app/api/categorias/route.js
//
// GET    -> lista todas as categorias
// POST   -> cria uma nova categoria { nome }
// DELETE -> remove uma categoria (?id=...)

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const categorias = await sql`SELECT * FROM categorias ORDER BY ordem ASC, id ASC`;
    return NextResponse.json(categorias);
  } catch (erro) {
    console.error('Erro ao listar categorias:', erro);
    return NextResponse.json({ erro: 'Não foi possível carregar as categorias.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { nome } = await request.json();
    if (!nome || !nome.trim()) {
      return NextResponse.json({ erro: 'Nome da categoria é obrigatório.' }, { status: 400 });
    }

    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM categorias`;
    const [categoria] = await sql`
      INSERT INTO categorias (nome, ordem, ativo)
      VALUES (${nome.trim()}, ${count + 1}, true)
      RETURNING *
    `;
    return NextResponse.json(categoria, { status: 201 });
  } catch (erro) {
    console.error('Erro ao criar categoria:', erro);
    return NextResponse.json({ erro: 'Não foi possível criar a categoria.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ erro: 'ID da categoria é obrigatório.' }, { status: 400 });
    }
    await sql`DELETE FROM categorias WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao remover categoria:', erro);
    return NextResponse.json({ erro: 'Não foi possível remover a categoria.' }, { status: 500 });
  }
}
