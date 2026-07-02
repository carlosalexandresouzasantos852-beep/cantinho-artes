// lib/db.js
//
// Conexão com o banco Postgres usando o driver padrão `pg` (node-postgres).
// Funciona com Neon na Vercel (usando a DATABASE_URL da integração) e também
// com qualquer Postgres local para desenvolvimento.
//
// Uso:
//   import { sql } from '@/lib/db';
//   const linhas = await sql('SELECT * FROM produtos WHERE ativo = $1', [true]);
//   // ou com template literals (helper sql``):
//   const linhas = await sql`SELECT * FROM produtos WHERE ativo = ${true}`;

import { Pool } from 'pg';

let pool = null;

function obterPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'Variável de ambiente DATABASE_URL não encontrada. ' +
        'Configure-a no painel da Vercel (Settings → Environment Variables) ' +
        'ou no arquivo .env.local durante o desenvolvimento local.'
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // No Neon (SSL obrigatório), a DATABASE_URL já inclui sslmode=require
      // ou a Vercel injeta a configuração correta. Para Postgres local sem SSL,
      // isso é ignorado automaticamente.
      ssl: process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
    });
  }
  return pool;
}

// Helper que funciona como template literal:  sql`SELECT * FROM t WHERE id = ${id}`
// equivalente ao comportamento do @neondatabase/serverless, sem mudar as API routes.
export async function sql(strings, ...values) {
  const client = obterPool();
  // Modo template literal
  if (Array.isArray(strings?.raw || strings)) {
    const partes = Array.isArray(strings.raw) ? strings : strings;
    let texto = '';
    const parametros = [];
    partes.forEach((parte, i) => {
      texto += parte;
      if (i < values.length) {
        parametros.push(values[i]);
        texto += `$${parametros.length}`;
      }
    });
    const resultado = await client.query(texto, parametros);
    return resultado.rows;
  }
  // Modo função direta: sql('SELECT ...', [params])
  const resultado = await client.query(strings, values[0] || []);
  return resultado.rows;
}

