# 🎨 Cantinho das Artes — Loja Virtual (Next.js + Neon)

Loja virtual completa para a **Cantinho das Artes** — papelaria personalizada, buquês e presentes.

Construída com **Next.js 16** (front-end e API) e banco de dados **Postgres no Neon** (dados reais, compartilhados entre todos os dispositivos).

---

## 🚀 Como subir no ar (passo a passo)

### Etapa 1 — Colocar o código no GitHub

1. Abra o [GitHub](https://github.com) e clique em **"New repository"**
2. Nome sugerido: `cantinho-das-artes`
3. Deixe **privado** (recomendado)
4. Clique em **"Create repository"**
5. No terminal, dentro da pasta deste projeto:

```bash
git init
git add .
git commit -m "Cantinho das Artes - loja virtual"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/cantinho-das-artes.git
git push -u origin main
```

---

### Etapa 2 — Criar o banco de dados no Neon

1. Acesse [console.neon.tech](https://console.neon.tech)
2. Crie um **novo projeto** (nome: `cantinho-das-artes`)
3. Clique em **"SQL Editor"**
4. Cole todo o conteúdo do arquivo `sql/schema-postgres.sql` e clique em **"Run"**
5. Copie a **connection string** do painel (começa com `postgresql://...`)

---

### Etapa 3 — Hospedar na Vercel

1. Acesse [vercel.com](https://vercel.com) → **"Add New… → Project"**
2. Conecte o repositório `cantinho-das-artes` do GitHub
3. Em **"Environment Variables"** adicione:
   - **Nome:** `DATABASE_URL`
   - **Valor:** a connection string do Neon
4. Clique em **"Deploy"** e aguarde (1-2 minutos)

Pronto — seu site vai estar no ar no link que a Vercel mostrar! 🎉

---

## 🔐 Primeiro acesso ao painel admin

Acesse `/admin` no seu site. Login padrão:

- **Usuário:** `admin`
- **Senha:** `cantinho123`

⚠️ Troque a senha assim que possível (via `PUT /api/admin-senha`).

---

## 🛠️ Desenvolvimento local

```bash
npm install
echo 'DATABASE_URL=postgresql://usuario:senha@host/banco' > .env.local
npm run dev
```

Acesse `http://localhost:3000` (loja) e `http://localhost:3000/admin` (painel).

---

## 📁 Estrutura

```
app/
  layout.js           → Layout base
  globals.css         → CSS da loja
  page.js             → Loja (/)
  admin/page.js       → Painel admin (/admin)
  api/
    config/           → Configurações (GET/PUT)
    categorias/       → Categorias (GET/POST/DELETE)
    produtos/         → Produtos (GET/POST/PUT/DELETE)
    promocoes/        → Promoções (GET/POST/DELETE)
    clientes/         → Identificação (GET/POST/DELETE)
    pedidos/          → Pedidos (GET/POST/PUT)
    admin-login/      → Login admin (GET/POST/DELETE)
    admin-senha/      → Troca de senha (PUT)
lib/db.js             → Conexão com Postgres
public/js/banco.js    → Camada de dados do front-end
public/js/loja.js     → Comportamento da loja
public/js/admin.js    → Comportamento do painel
sql/schema-postgres.sql → Schema do banco (rode no Neon)
```

---

## 🔒 Segurança

- Senhas admin em hash **bcrypt**
- Sessões via **cookies httpOnly**
- Queries **parametrizadas** (sem SQL injection)
- `DATABASE_URL` nunca vai ao repositório (está no `.gitignore`)
