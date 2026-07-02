// app/api/admin-senha/route.js
//
// PUT -> troca o usuário/senha do administrador logado.
// Exige que a sessão admin atual seja válida (cookie cda_admin_sessao).

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const NOME_COOKIE = 'cda_admin_sessao';

export async function PUT(request) {
  try {
    const token = request.cookies.get(NOME_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ erro: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
    }

    const [admin] = await sql`SELECT id FROM administradores WHERE sessao_token = ${token}`;
    if (!admin) {
      return NextResponse.json({ erro: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
    }

    const { novoUsuario, novaSenha } = await request.json();
    if (!novoUsuario?.trim() || !novaSenha || novaSenha.length < 4) {
      return NextResponse.json({ erro: 'Usuário e senha (mín. 4 caracteres) são obrigatórios.' }, { status: 400 });
    }

    const novoHash = await bcrypt.hash(novaSenha, 10);
    await sql`
      UPDATE administradores SET usuario = ${novoUsuario.trim()}, senha_hash = ${novoHash}
      WHERE id = ${admin.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao trocar senha do admin:', erro);
    return NextResponse.json({ erro: 'Não foi possível trocar a senha.' }, { status: 500 });
  }
}
