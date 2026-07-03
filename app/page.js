// app/admin/page.js
//
// Painel administrativo. Mesmo princípio da página da loja: o HTML
// original é preservado e os scripts banco.js + admin.js cuidam do
// comportamento, agora conversando com as APIs do Next.js/Neon.

'use client';

import { useEffect } from 'react';

function carregarScript(src) {
  return new Promise((resolve, reject) => {
    // Evitar carregar duas vezes
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

const corpoHtml = `
<!-- ===================== TELA DE LOGIN ===================== -->
<div class="tela-login-admin" id="tela-login">
  <div class="cartao-login">
    <span class="emoji-login">🔐</span>
    <h2>Painel Administrativo</h2>
    <p>Cantinho das Artes</p>

    <form id="form-login-admin">
      <div class="erro-form" id="erro-login"></div>
      <div class="campo">
        <label>Usuário</label>
        <input type="text" id="campo-usuario-login" placeholder="admin" required>
      </div>
      <div class="campo">
        <label>Senha</label>
        <input type="password" id="campo-senha-login" placeholder="••••••••" required>
      </div>
      <button type="submit" class="botao-cheio">Entrar no painel</button>
    </form>

    <div class="dica-login">
      🔑 Entre com o usuário e senha cadastrados no banco de dados.
    </div>
    <a href="/" style="display:block; margin-top:16px; font-size:0.8rem; color:var(--texto-suave);">← Voltar para a loja</a>
  </div>
</div>

<!-- ===================== APP ADMIN ===================== -->
<div class="corpo-admin" id="app-admin" style="display:none">

  <!-- BARRA LATERAL -->
  <aside class="barra-lateral">
    <div class="logo-admin">
      <span class="emoji">🎨</span>
      <div><strong>Cantinho das Artes</strong><span>Painel admin</span></div>
    </div>

    <ul class="menu-admin">
      <li><button id="menu-dashboard" class="ativo" onclick="trocarPainel('dashboard')"><span class="icone-menu">📊</span><span class="texto-menu">Visão geral</span></button></li>
      <li><button id="menu-pedidos" onclick="trocarPainel('pedidos')"><span class="icone-menu">🧾</span><span class="texto-menu">Pedidos</span></button></li>
      <li><button id="menu-catalogo" onclick="trocarPainel('catalogo')"><span class="icone-menu">🎀</span><span class="texto-menu">Catálogo</span></button></li>
      <li><button id="menu-promocoes" onclick="trocarPainel('promocoes')"><span class="icone-menu">🏷️</span><span class="texto-menu">Promoções</span></button></li>
      <li><button id="menu-pagamento" onclick="trocarPainel('pagamento')"><span class="icone-menu">💳</span><span class="texto-menu">Pagamento</span></button></li>
      <li><button id="menu-aparencia" onclick="trocarPainel('aparencia')"><span class="icone-menu">🎨</span><span class="texto-menu">Aparência</span></button></li>
      <li><button id="menu-clientes" onclick="trocarPainel('clientes')"><span class="icone-menu">👥</span><span class="texto-menu">Clientes</span></button></li>
    </ul>

    <div class="voltar-loja-admin">
      <a href="/">🛍️ <span class="texto-menu">Ver a loja</span></a>
      <a href="#" onclick="logoutAdmin()">🚪 <span class="texto-menu">Sair do painel</span></a>
    </div>
  </aside>

  <!-- ÁREA PRINCIPAL -->
  <main class="area-admin">
    <div class="cabecalho-admin">
      <div>
        <h2 id="titulo-pagina-admin">📊 Visão geral</h2>
        <p id="subtitulo-pagina-admin">Resumo de vendas e atividade da loja</p>
      </div>
    </div>

    <!-- PAINEL: DASHBOARD -->
    <section class="painel-admin ativo" id="painel-dashboard">
      <div class="grid-metricas">
        <div class="cartao-metrica">
          <div class="rotulo-metrica">💰 Total vendido (mês)</div>
          <div class="valor-metrica" id="metrica-total-vendido">R$ 0,00</div>
          <div class="legenda-metrica" id="legenda-vendido-hoje-ontem">Ontem: R$ 0,00 · Hoje: R$ 0,00</div>
        </div>
        <div class="cartao-metrica">
          <div class="rotulo-metrica">🧾 Pedidos (mês)</div>
          <div class="valor-metrica" id="metrica-total-pedidos">0</div>
          <div class="legenda-metrica">Pedidos recebidos neste mês</div>
        </div>
        <div class="cartao-metrica">
          <div class="rotulo-metrica">👥 Clientes</div>
          <div class="valor-metrica" id="metrica-total-clientes">0</div>
          <div class="legenda-metrica">Pessoas que já se identificaram na loja</div>
        </div>
        <div class="cartao-metrica">
          <div class="rotulo-metrica">🎀 Produtos</div>
          <div class="valor-metrica" id="metrica-total-produtos">0</div>
          <div class="legenda-metrica">Itens cadastrados no catálogo</div>
        </div>
      </div>

      <div class="caixa-admin">
        <h3>🕓 Pedidos recentes</h3>
        <table class="tabela-admin">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
          <tbody id="corpo-pedidos-recentes"></tbody>
        </table>
      </div>
    </section>

    <!-- PAINEL: PEDIDOS -->
    <section class="painel-admin" id="painel-pedidos">
      <div class="caixa-admin">
        <h3>🧾 Todos os pedidos</h3>
        <table class="tabela-admin">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
          <tbody id="corpo-tabela-pedidos"></tbody>
        </table>
      </div>
    </section>

    <!-- PAINEL: CATÁLOGO -->
    <section class="painel-admin" id="painel-catalogo">
      <div class="duas-colunas-admin">
        <div class="caixa-admin">
          <div class="barra-acoes-admin">
            <h3 style="margin:0">🎀 Produtos</h3>
            <button class="botao-admin" onclick="abrirModalProduto()">+ Novo produto</button>
          </div>
          <table class="tabela-admin">
            <thead><tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody id="corpo-tabela-produtos"></tbody>
          </table>
        </div>

        <div class="caixa-admin">
          <h3>📂 Categorias</h3>
          <div class="campo">
            <input type="text" id="campo-nova-categoria" placeholder="Nome da nova categoria">
          </div>
          <button class="botao-admin secundario" style="width:100%; justify-content:center; margin-bottom:16px;" onclick="adicionarCategoria()">+ Adicionar categoria</button>
          <div id="lista-categorias-admin"></div>
        </div>
      </div>
    </section>

    <!-- PAINEL: PROMOÇÕES -->
    <section class="painel-admin" id="painel-promocoes">
      <div class="duas-colunas-admin">
        <div class="caixa-admin">
          <h3>🏷️ Promoções ativas</h3>
          <div id="lista-promocoes-admin"></div>
        </div>

        <div class="caixa-admin">
          <h3>+ Nova promoção</h3>
          <form id="form-promocao" onsubmit="salvarPromocao(event)">
            <div class="campo">
              <label>Título da promoção</label>
              <input type="text" id="campo-promo-titulo" placeholder="Ex.: Semana das mães" required>
            </div>
            <div class="campo">
              <label>Tipo de desconto</label>
              <select id="campo-promo-tipo" onchange="alternarCampoCupom()">
                <option value="percentual">Percentual (%)</option>
                <option value="valor_fixo">Valor fixo (R$)</option>
                <option value="cupom">Cupom com código</option>
              </select>
            </div>
            <div class="campo" id="linha-campo-cupom" style="display:none">
              <label>Código do cupom</label>
              <input type="text" id="campo-promo-codigo" placeholder="Ex.: MAES10">
            </div>
            <div class="campo">
              <label>Valor do desconto</label>
              <input type="number" id="campo-promo-valor" step="0.01" min="0" placeholder="Ex.: 10" required>
            </div>
            <div class="campo">
              <label>Aplicar em</label>
              <select id="campo-promo-produto"></select>
            </div>
            <button type="submit" class="botao-cheio">Criar promoção 🏷️</button>
          </form>
        </div>
      </div>
    </section>

    <!-- PAINEL: PAGAMENTO -->
    <section class="painel-admin" id="painel-pagamento">
      <div class="caixa-admin">
        <div class="aviso-admin">
          💡 O link e o QR Code abaixo são as formas de pagamento <strong>gerais da loja</strong> — valem para todos os produtos que <strong>não tiverem</strong> um pagamento próprio cadastrado. Você pode definir um link/QR específico para um produto individual lá no cadastro/edição dele, em "Catálogo".
        </div>
        <h3>💳 Mercado Pago</h3>
        <form onsubmit="salvarPagamento(event)">
          <div class="campo">
            <label>Link de pagamento do Mercado Pago (geral da loja)</label>
            <input type="url" id="campo-mercadopago-link" placeholder="https://mpago.la/...">
            <small>Cole aqui o link de cobrança gerado no seu Mercado Pago. Vale para todos os produtos sem link próprio.</small>
          </div>

          <h3 style="margin-top:24px">🔳 Pix</h3>
          <div class="campo">
            <label>Chave Pix (geral da loja)</label>
            <input type="text" id="campo-pix-chave" placeholder="CPF, e-mail, telefone ou chave aleatória">
          </div>
          <div class="campo">
            <label>Link da imagem do QR Code Pix (geral da loja)</label>
            <input type="url" id="campo-pix-qr-url" placeholder="https://...">
            <small>Gere o QR Code no app do seu banco, hospede a imagem (ex.: Imgur) e cole o link aqui. Vale para todos os produtos sem QR próprio.</small>
          </div>

          <button type="submit" class="botao-cheio">Salvar formas de pagamento</button>
        </form>
      </div>
    </section>

    <!-- PAINEL: APARÊNCIA -->
    <section class="painel-admin" id="painel-aparencia">
      <div class="caixa-admin">
        <h3>🏷️ Cabeçalho e identidade</h3>
        <form onsubmit="salvarAparencia(event)">
          <div class="grade-form-admin">
            <div class="campo">
              <label>Nome da loja</label>
              <input type="text" id="campo-nome-loja">
            </div>
            <div class="campo">
              <label>Subtítulo (abaixo do nome)</label>
              <input type="text" id="campo-subtitulo-loja">
            </div>
            <div class="campo campo-largo">
              <label>Link do logo (opcional)</label>
              <input type="url" id="campo-logo-url" placeholder="https://...">
            </div>
            <div class="campo campo-largo">
              <label>Aviso no topo do site</label>
              <input type="text" id="campo-aviso-topo">
            </div>
            <div class="campo campo-largo">
              <label>Texto do rodapé</label>
              <textarea id="campo-rodape-texto"></textarea>
            </div>
            <div class="campo">
              <label>WhatsApp (com DDI e DDD)</label>
              <input type="text" id="campo-whatsapp" placeholder="5577999999999">
            </div>
            <div class="campo">
              <label>Instagram (com @)</label>
              <input type="text" id="campo-instagram" placeholder="@suaconta">
            </div>
          </div>
          <button type="submit" class="botao-cheio">Salvar aparência</button>
        </form>
      </div>

      <div class="caixa-admin">
        <h3>🖼️ Banner principal (topo da loja)</h3>
        <p style="font-size:0.82rem; color:var(--texto-suave); margin-top:-8px; margin-bottom:16px;">
          É o banner grande que aparece logo abaixo das categorias, com o botão "Ver novidades".
        </p>
        <form onsubmit="salvarBannerPrincipal(event)">
          <div class="grade-form-admin">
            <div class="campo campo-largo">
              <label>Título do banner</label>
              <input type="text" id="campo-hero-titulo" placeholder="Tudo que você precisa, em um só lugar! 🌸">
            </div>
            <div class="campo campo-largo">
              <label>Texto do banner</label>
              <textarea id="campo-hero-texto" placeholder="Papelaria personalizada, buquês e presentes..."></textarea>
            </div>
            <div class="campo campo-largo">
              <label>Link da imagem/logo do banner (opcional)</label>
              <input type="url" id="campo-hero-imagem-url" placeholder="https://...">
              <small>Se deixar em branco, usa o emoji padrão da loja. Funciona bem com uma imagem quadrada ou a logo da empresa.</small>
            </div>
          </div>
          <button type="submit" class="botao-cheio">Salvar banner principal</button>
        </form>
      </div>

      <div class="caixa-admin">
        <h3>🎁 Banner secundário (opcional, no meio da loja)</h3>
        <p style="font-size:0.82rem; color:var(--texto-suave); margin-top:-8px; margin-bottom:16px;">
          Aparece entre os "Destaques" e o catálogo. Útil para uma promoção específica, data comemorativa, ou aviso especial. Fica desligado até você ativar.
        </p>
        <form onsubmit="salvarBannerMeio(event)">
          <div class="campo">
            <label class="alterna-switch">
              <input type="checkbox" id="campo-banner-meio-ativo">
              <span class="trilho"></span>
              <span class="texto-switch">Mostrar este banner na loja</span>
            </label>
          </div>
          <div class="grade-form-admin">
            <div class="campo campo-largo">
              <label>Título do banner</label>
              <input type="text" id="campo-banner-meio-titulo" placeholder="Confira nossas novidades!">
            </div>
            <div class="campo campo-largo">
              <label>Texto do banner (opcional)</label>
              <textarea id="campo-banner-meio-texto" placeholder="Aproveite a promoção desta semana..."></textarea>
            </div>
            <div class="campo campo-largo">
              <label>Link da imagem do banner (opcional)</label>
              <input type="url" id="campo-banner-meio-imagem-url" placeholder="https://...">
            </div>
            <div class="campo campo-largo">
              <label>Link do botão "Ver mais" (opcional)</label>
              <input type="url" id="campo-banner-meio-link" placeholder="https://... ou deixe em branco para não mostrar o botão">
            </div>
          </div>
          <button type="submit" class="botao-cheio">Salvar banner secundário</button>
        </form>
      </div>
    </section>

    <!-- PAINEL: CLIENTES -->
    <section class="painel-admin" id="painel-clientes">
      <div class="caixa-admin">
        <h3>👥 Clientes da loja</h3>
        <table class="tabela-admin">
          <thead><tr><th>Nome</th><th>Telefone</th><th>Pedidos</th><th>Última visita</th></tr></thead>
          <tbody id="corpo-tabela-clientes"></tbody>
        </table>
      </div>
    </section>
  </main>
</div>

<!-- ===================== MODAL: PRODUTO ===================== -->
<div class="sobreposicao" id="modal-produto">
  <div class="caixa-modal larga">
    <button class="fechar-modal" onclick="fecharModal('modal-produto')">✕</button>
    <div class="titulo-modal">
      <h2 id="titulo-modal-produto">Novo produto</h2>
    </div>

    <form id="form-produto" onsubmit="salvarProduto(event)">
      <div class="previa-imagem" id="previa-imagem-produto">🖼️ Pré-visualização da imagem</div>

      <div class="grade-form-admin">
        <div class="campo campo-largo">
          <label>Nome do produto</label>
          <input type="text" id="campo-produto-nome" required>
        </div>
        <div class="campo">
          <label>Categoria</label>
          <select id="campo-produto-categoria"></select>
        </div>
        <div class="campo">
          <label>Estoque</label>
          <input type="number" id="campo-produto-estoque" min="0" value="0">
        </div>
        <div class="campo campo-largo">
          <label>Descrição</label>
          <textarea id="campo-produto-descricao"></textarea>
        </div>
        <div class="campo">
          <label>Preço (R$)</label>
          <input type="number" id="campo-produto-preco" step="0.01" min="0" required>
        </div>
        <div class="campo">
          <label>Preço promocional (opcional)</label>
          <input type="number" id="campo-produto-preco-promo" step="0.01" min="0">
        </div>
        <div class="campo campo-largo">
          <label>Link da imagem do produto</label>
          <input type="url" id="campo-produto-imagem-url" placeholder="https://..." oninput="atualizarPreviaImagemProduto()">
          <small>Cole o link de uma imagem hospedada (ex.: Imgur, Google Drive público).</small>
        </div>
        <div class="campo">
          <label class="alterna-switch">
            <input type="checkbox" id="campo-produto-destaque">
            <span class="trilho"></span>
            <span class="texto-switch">Mostrar em destaque</span>
          </label>
        </div>
        <div class="campo">
          <label class="alterna-switch">
            <input type="checkbox" id="campo-produto-ativo" checked>
            <span class="trilho"></span>
            <span class="texto-switch">Produto ativo na loja</span>
          </label>
        </div>

        <div class="campo campo-largo">
          <hr style="border:none; border-top:2px dashed var(--rosa-claro-2); margin:6px 0 14px;">
          <label style="font-size:0.92rem; display:flex; align-items:center; gap:6px;">💳 Pagamento específico deste produto <span style="font-weight:500; color:var(--texto-suave); font-size:0.78rem;">(opcional)</span></label>
          <small>Deixe em branco para usar o link/QR <strong>geral da loja</strong> (configurados em "Pagamento"). Preencha aqui só se este produto tiver uma cobrança própria no Mercado Pago ou um Pix específico.</small>
        </div>
        <div class="campo campo-largo">
          <label>Link do Mercado Pago deste produto</label>
          <input type="url" id="campo-produto-mp-link" placeholder="https://mpago.la/...">
        </div>
        <div class="campo campo-largo">
          <label>Link da imagem do QR Code Pix deste produto</label>
          <input type="url" id="campo-produto-pix-qr-url" placeholder="https://...">
        </div>
      </div>

      <button type="submit" class="botao-cheio">Salvar produto 🎀</button>
    </form>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast-global"></div>
`;

export default function PaginaAdmin() {
  useEffect(() => {
    // Carrega banco.js primeiro, depois admin.js (ordem importa)
    carregarScript('/js/banco.js')
      .then(() => carregarScript('/js/admin.js'))
      .catch((err) => console.error('Erro ao carregar scripts:', err));
  }, []);

  return (
    <>
      <link rel="stylesheet" href="/css/admin.css" />
      <div dangerouslySetInnerHTML={{ __html: corpoHtml }} />
    </>
  );
}
