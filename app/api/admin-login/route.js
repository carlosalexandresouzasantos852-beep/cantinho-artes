// app/api/admin-login/route.js
//
// POST   -> recebe { usuario, senha }, verifica o hash bcrypt e, se correto,
//           define um cookie de sessão administrativa (httpOnly)
// GET    -> diz se a sessão admin atual está logada (true/false)
// DELETE -> logout (remove o cookie)

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const NOME_COOKIE = 'cda_admin_sessao';
const OITO_HORAS_EM_SEGUNDOS = 60 * 60 * 8;

// Sessões administrativas válidas ficam em memória do processo + tabela
// simples. Para manter as coisas robustas em ambiente serverless (onde a
// memória não persiste entre invocações), guardamos o token na própria
// tabela administradores como "sessao_token" — ver migração abaixo.

export async function POST(request) {
  try {
    const { usuario, senha } = await request.json();
    if (!usuario || !senha) {
      return NextResponse.json({ erro: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const [admin] = await sql`SELECT * FROM administradores WHERE usuario = ${usuario}`;
    if (!admin) {
      return NextResponse.json({ erro: 'Usuário ou senha incorretos.' }, { status: 401 });
    }

    const senhaCorreta = await bcrypt.compare(senha, admin.senha_hash);
    if (!senhaCorreta) {
      return NextResponse.json({ erro: 'Usuário ou senha incorretos.' }, { status: 401 });
    }

    const token = randomBytes(24).toString('hex');
    await sql`UPDATE administradores SET sessao_token = ${token} WHERE id = ${admin.id}`;

    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set(NOME_COOKIE, token, {
      maxAge: OITO_HORAS_EM_SEGUNDOS,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return resposta;
  } catch (erro) {
    console.error('Erro no login do admin:', erro);
    return NextResponse.json({ erro: 'Não foi possível fazer login.' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const token = request.cookies.get(NOME_COOKIE)?.value;
    if (!token) return NextResponse.json({ logado: false });
    const [admin] = await sql`SELECT id FROM administradores WHERE sessao_token = ${token}`;
    return NextResponse.json({ logado: !!admin });
  } catch (erro) {
    console.error('Erro ao verificar sessão admin:', erro);
    return NextResponse.json({ logado: false });
  }
}

export async function DELETE(request) {
  try {
    const token = request.cookies.get(NOME_COOKIE)?.value;
    if (token) {
      await sql`UPDATE administradores SET sessao_token = NULL WHERE sessao_token = ${token}`;
    }
  } catch (erro) {
    console.error('Erro ao fazer logout do admin:', erro);
  }
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(NOME_COOKIE, '', { maxAge: 0, path: '/' });
  return resposta;
}
