-- =====================================================================
-- CANTINHO DAS ARTES — Banco de dados da loja virtual (Postgres / Neon)
-- =====================================================================
-- Como usar:
-- 1. Abra o seu projeto no Neon (https://console.neon.tech)
-- 2. Vá em "SQL Editor"
-- 3. Cole todo o conteúdo deste arquivo e clique em "Run"
-- Isso cria todas as tabelas e já popula com os dados iniciais da loja.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CLIENTES
-- Cada visitante se identifica uma vez (nome + telefone) e o sistema
-- lembra dele nas próximas visitas (token salvo no navegador).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  telefone      VARCHAR(20)  NOT NULL UNIQUE,
  token_sessao  VARCHAR(64)  NOT NULL UNIQUE,
  criado_em     TIMESTAMP DEFAULT NOW(),
  ultimo_acesso TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- CATEGORIAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id     SERIAL PRIMARY KEY,
  nome   VARCHAR(80) NOT NULL,
  ordem  INT DEFAULT 0,
  ativo  BOOLEAN DEFAULT true
);

-- ---------------------------------------------------------------------
-- PRODUTOS
-- (já inclui os campos de pagamento específico por produto)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
  id                  SERIAL PRIMARY KEY,
  categoria_id        INT REFERENCES categorias(id) ON DELETE SET NULL,
  nome                VARCHAR(150) NOT NULL,
  descricao           TEXT,
  preco               NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_promo         NUMERIC(10,2) DEFAULT NULL,
  imagem_url          VARCHAR(500) DEFAULT '',
  estoque             INT DEFAULT 0,
  destaque            BOOLEAN DEFAULT false,
  ativo               BOOLEAN DEFAULT true,
  mercadopago_link    VARCHAR(500) DEFAULT '',
  pix_qr_imagem_url   VARCHAR(500) DEFAULT '',
  criado_em           TIMESTAMP DEFAULT NOW(),
  atualizado_em       TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- PROMOÇÕES / CUPONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promocoes (
  id            SERIAL PRIMARY KEY,
  titulo        VARCHAR(120) NOT NULL,
  tipo          VARCHAR(20) NOT NULL DEFAULT 'percentual'
                CHECK (tipo IN ('percentual','valor_fixo','cupom')),
  valor         NUMERIC(10,2) NOT NULL,
  codigo_cupom  VARCHAR(40) DEFAULT NULL,
  produto_id    INT REFERENCES produtos(id) ON DELETE CASCADE,
  data_inicio   TIMESTAMP,
  data_fim      TIMESTAMP,
  ativo         BOOLEAN DEFAULT true
);

-- ---------------------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id              SERIAL PRIMARY KEY,
  cliente_id      INT NOT NULL REFERENCES clientes(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'novo'
                  CHECK (status IN ('novo','pago','em_preparo','enviado','concluido','cancelado')),
  forma_pagamento VARCHAR(40) NOT NULL,
  subtotal        NUMERIC(10,2) NOT NULL,
  desconto        NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL,
  observacoes     TEXT,
  criado_em       TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- ITENS DO PEDIDO
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_itens (
  id              SERIAL PRIMARY KEY,
  pedido_id       INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id      INT REFERENCES produtos(id),
  nome_produto    VARCHAR(150) NOT NULL,
  preco_unitario  NUMERIC(10,2) NOT NULL,
  quantidade      INT NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------
-- CONFIGURAÇÕES DA LOJA (modelo chave/valor)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracoes (
  chave  VARCHAR(80) PRIMARY KEY,
  valor  TEXT
);

-- ---------------------------------------------------------------------
-- ADMINISTRADORES (login do painel)
-- A senha fica como hash bcrypt, nunca em texto puro.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS administradores (
  id            SERIAL PRIMARY KEY,
  usuario       VARCHAR(60) NOT NULL UNIQUE,
  senha_hash    VARCHAR(255) NOT NULL,
  sessao_token  VARCHAR(64) DEFAULT NULL,
  criado_em     TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- DADOS INICIAIS
-- (só insere se as tabelas estiverem vazias — seguro rodar mais de uma vez)
-- =====================================================================

INSERT INTO configuracoes (chave, valor)
SELECT * FROM (VALUES
  ('nome_loja',             'Cantinho das Artes'),
  ('subtitulo_loja',        'Papelaria personalizada'),
  ('topo_aviso',            '💖 Muito carinho em cada detalhe — Fazemos envios para todo o Brasil!'),
  ('whatsapp_numero',       '5577999238352'),
  ('instagram',             '@cant.inhodasartes2'),
  ('rodape_texto',          'Cantinho das Artes — Papelaria e presentes personalizados, feitos com carinho.'),
  ('logo_url',              ''),
  ('mascote_emoji',         '👧🎨'),
  ('mercadopago_link',      ''),
  ('pix_chave',             ''),
  ('pix_qr_imagem_url',     ''),
  ('hero_titulo',           'Tudo que você precisa, em um só lugar! 🌸'),
  ('hero_texto',            'Papelaria personalizada, buquês e presentes feitos com muito carinho em cada detalhe. Fazemos envios para todo o Brasil.'),
  ('hero_imagem_url',       ''),
  ('banner_meio_ativo',     'false'),
  ('banner_meio_titulo',    'Confira nossas novidades!'),
  ('banner_meio_texto',     ''),
  ('banner_meio_imagem_url','' ),
  ('banner_meio_link',      '')
) AS v(chave, valor)
WHERE NOT EXISTS (SELECT 1 FROM configuracoes);

INSERT INTO categorias (nome, ordem)
SELECT * FROM (VALUES
  ('Buquês personalizados', 1),
  ('Papelaria personalizada', 2),
  ('Presentes', 3),
  ('Lembrancinhas', 4)
) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM categorias);

INSERT INTO produtos (categoria_id, nome, descricao, preco, preco_promo, imagem_url, estoque, destaque)
SELECT * FROM (VALUES
  (1, 'Buquê de Rosas para Mãe', 'Buquê de rosas vermelhas com cartões personalizados e fotos especiais.', 89.90, NULL::numeric, '', 8, true),
  (2, 'Kit Caderno + Adesivos', 'Caderno personalizado com kit de adesivos exclusivos do tema escolhido.', 39.90, NULL::numeric, '', 15, true),
  (3, 'Caixa Surpresa Personalizada', 'Caixa temática personalizada para presentes especiais e datas marcantes.', 54.90, 44.90, '', 6, false),
  (4, 'Topo de Bolo Personalizado', 'Topo de bolo em MDF com o tema da sua escolha, pintado à mão.', 24.90, NULL::numeric, '', 20, false),
  (2, 'Cartão de Visita Personalizado (50un)', 'Cartões de visita com acabamento premium, prontos para divulgar seu negócio.', 32.00, NULL::numeric, '', 30, false),
  (1, 'Buquê de Flores de Papel', 'Buquê artesanal de flores de papel, dura para sempre e não murcha.', 49.90, NULL::numeric, '', 10, false)
) AS v(categoria_id, nome, descricao, preco, preco_promo, imagem_url, estoque, destaque)
WHERE NOT EXISTS (SELECT 1 FROM produtos);

-- ---------------------------------------------------------------------
-- Administrador padrão (usuário: admin / senha: cantinho123)
-- O hash abaixo já corresponde à senha "cantinho123" (bcrypt, custo 10).
-- IMPORTANTE: troque essa senha pelo painel admin assim que possível.
-- ---------------------------------------------------------------------
INSERT INTO administradores (usuario, senha_hash)
SELECT 'admin', '$2b$10$p3Z7Z/srY3xEUW7u46mXhOmfi2zRSn0gHystLZGNBgabcndakUxNW'
WHERE NOT EXISTS (SELECT 1 FROM administradores);
