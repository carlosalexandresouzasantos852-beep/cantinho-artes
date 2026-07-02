// app/api/config/route.js
//
// GET  -> retorna todas as configurações da loja como um objeto { chave: valor }
// PUT  -> recebe um objeto parcial { chave: valor, ... } e salva/atualiza cada chave

import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// Converte o texto guardado no banco para o tipo certo (boolean, número ou string)
function converterValor(valorTexto) {
  if (valorTexto === 'true') return true;
  if (valorTexto === 'false') return false;
  return valorTexto;
}

export async function GET() {
  try {
    const linhas = await sql`SELECT chave, valor FROM configuracoes`;
    const config = {};
    for (const linha of linhas) {
      config[linha.chave] = converterValor(linha.valor);
    }
    return NextResponse.json(config);
  } catch (erro) {
    console.error('Erro ao buscar configurações:', erro);
    return NextResponse.json({ erro: 'Não foi possível carregar as configurações.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const dados = await request.json();
    const entradas = Object.entries(dados);

    for (const [chave, valor] of entradas) {
      const valorTexto = typeof valor === 'boolean' ? String(valor) : (valor ?? '');
      await sql`
        INSERT INTO configuracoes (chave, valor)
        VALUES (${chave}, ${valorTexto})
        ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao salvar configurações:', erro);
    return NextResponse.json({ erro: 'Não foi possível salvar as configurações.' }, { status: 500 });
  }
}
