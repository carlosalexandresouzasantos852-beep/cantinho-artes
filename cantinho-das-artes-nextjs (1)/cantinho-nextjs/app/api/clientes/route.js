// app/api/clientes/route.js
//
// GET    -> ?todos=true: lista todos os clientes (uso do painel admin)
//           sem esse parâmetro: retorna o cliente da sessão atual (cookie cda_token)
// POST   -> identifica um cliente (nome + telefone), cria/atualiza e define o cookie
// DELETE -> "sai da loja": remove o cookie de sessão

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const NOME_COOKIE = 'cda_token';
const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export async function GET(request) {
  try {
    const todos = new URL(request.url).searchParams.get('todos') === 'true';
    if (todos) {
      const clientes = await sql`SELECT * FROM clientes ORDER BY ultimo_acesso DESC`;
      return NextResponse.json({ clientes });
    }

    const token = request.cookies.get(NOME_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ cliente: null });
    }
    const [cliente] = await sql`SELECT * FROM clientes WHERE token_sessao = ${token}`;
    return NextResponse.json({ cliente: cliente || null });
  } catch (erro) {
    console.error('Erro ao buscar cliente(s):', erro);
    return NextResponse.json({ erro: 'Não foi possível verificar os clientes.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { nome, telefone } = await request.json();
    if (!nome?.trim() || !telefone?.trim()) {
      return NextResponse.json({ erro: 'Nome e telefone são obrigatórios.' }, { status: 400 });
    }
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      return NextResponse.json({ erro: 'Telefone inválido.' }, { status: 400 });
    }

    const [existente] = await sql`SELECT * FROM clientes WHERE telefone = ${telefoneLimpo}`;

    let cliente;
    if (existente) {
      [cliente] = await sql`
        UPDATE clientes SET nome = ${nome.trim()}, ultimo_acesso = NOW()
        WHERE id = ${existente.id}
        RETURNING *
      `;
    } else {
      const token = randomBytes(24).toString('hex');
      [cliente] = await sql`
        INSERT INTO clientes (nome, telefone, token_sessao)
        VALUES (${nome.trim()}, ${telefoneLimpo}, ${token})
        RETURNING *
      `;
    }

    const resposta = NextResponse.json({ cliente });
    resposta.cookies.set(NOME_COOKIE, cliente.token_sessao, {
      maxAge: UM_ANO_EM_SEGUNDOS,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return resposta;
  } catch (erro) {
    console.error('Erro ao identificar cliente:', erro);
    return NextResponse.json({ erro: 'Não foi possível identificar o cliente.' }, { status: 500 });
  }
}

export async function DELETE() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(NOME_COOKIE, '', { maxAge: 0, path: '/' });
  return resposta;
}
