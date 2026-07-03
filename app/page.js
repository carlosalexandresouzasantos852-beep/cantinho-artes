// app/page.js
//
// A loja virtual. O HTML interno é o mesmo markup que já usávamos antes
// (com onclick, ids, etc.) — aqui ele só é injetado dentro de um Client
// Component, e os scripts banco.js + loja.js são carregados depois que a
// página estiver montada (igual antes, só que agora falando com as APIs
// do Next.js/Neon em vez de localStorage).

'use client';

import { useEffect } from 'react';

function carregarScript(src) {
  return new Promise((resolve, reject) => {
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
<!-- AVISO DE TOPO -->
<div class="aviso-topo" id="texto-aviso-topo">💖 Muito carinho em cada detalhe</div>

<!-- CABEÇALHO -->
<header class="cabecalho">
  <div class="cabecalho-interno">
    <div class="marca">
      <div class="marca-logo" id="marca-logo-img">👧🎨</div>
      <div class="marca-texto">
        <h1 id="nome-loja-cabecalho">Cantinho das Artes</h1>
        <span id="subtitulo-loja-cabecalho">Papelaria personalizada</span>
      </div>
    </div>

    <div class="busca-caixa">
      <span class="icone-busca">🔍</span>
      <input type="text" placeholder="Buscar produtos..." oninput="buscarProdutos(this.value)">
    </div>

    <div class="acoes-cabecalho">
      <a class="botao-icone" href="/admin" title="Painel administrativo">⚙️</a>

      <button class="botao-icone" onclick="abrirCarrinho()" title="Carrinho">
        🛒
        <span class="contador-carrinho" id="contador-carrinho" style="display:none">0</span>
      </button>

      <div id="area-usuario-anonimo"></div>

      <div class="usuario-chip" id="chip-usuario" style="display:none">
        <span class="avatar-mini" id="inicial-usuario">?</span>
        <span id="nome-usuario-chip">Visitante</span>
        <span class="pontinhos" onclick="alternarMenuUsuario()">⋯</span>
        <div class="menu-usuario" id="menu-dropdown-usuario">
          <button class="sair" onclick="sairDaLoja()">🚪 Sair da loja</button>
        </div>
      </div>
    </div>
  </div>

  <nav class="nav-categorias" id="nav-categorias"></nav>
</header>

<!-- HERO -->
<section class="hero">
  <div class="hero-card">
    <div class="hero-texto">
      <h2 id="hero-titulo">Tudo que você precisa, em um só lugar! 🌸</h2>
      <p id="hero-texto-p">Papelaria personalizada, buquês e presentes feitos com muito carinho em cada detalhe. Fazemos envios para todo o Brasil.</p>
      <a href="#secao-destaques" class="botao-principal">Ver novidades ✨</a>
    </div>
    <div class="hero-mascote" id="hero-mascote">👧🎨</div>
  </div>
</section>

<!-- DESTAQUES -->
<section class="secao" id="secao-destaques">
  <div class="secao-titulo">
    <h3>⭐ Destaques da loja</h3>
  </div>
  <div class="grid-produtos" id="grid-destaques"></div>
</section>

<!-- BANNER SECUNDÁRIO (opcional, configurável em Aparência) -->
<section class="secao" id="secao-banner-meio" style="display:none">
  <div class="hero-card hero-card-secundario" id="banner-meio-card">
    <div class="hero-texto">
      <h2 id="banner-meio-titulo">Confira nossas novidades!</h2>
      <p id="banner-meio-texto"></p>
      <a href="#" id="banner-meio-link" class="botao-principal" style="display:none">Ver mais ✨</a>
    </div>
    <div class="hero-mascote" id="banner-meio-imagem">🎁</div>
  </div>
</section>

<!-- CATÁLOGO -->
<section class="secao">
  <div class="secao-titulo">
    <h3 id="titulo-secao-catalogo">Todo o catálogo</h3>
  </div>
  <div class="grid-produtos" id="grid-produtos"></div>
</section>

<!-- RODAPÉ -->
<footer class="rodape">
  <div class="rodape-interno">
    <div>
      <h5>Cantinho das Artes</h5>
      <p id="rodape-texto">Papelaria e presentes personalizados, feitos com carinho.</p>
    </div>
    <div>
      <h5>Atendimento</h5>
      <ul>
        <li><a href="#" id="link-whatsapp-flutuante" target="_blank">📱 WhatsApp</a></li>
        <li><a id="rodape-instagram" target="_blank">📸 Instagram</a></li>
      </ul>
    </div>
    <div>
      <h5>Pagamento</h5>
      <ul>
        <li>💳 Mercado Pago</li>
        <li>🔳 Pix</li>
      </ul>
    </div>
  </div>
  <div class="rodape-base">© 2026 Cantinho das Artes — Todos os direitos reservados</div>
</footer>

<!-- ===================== MODAL: IDENTIFICAÇÃO ===================== -->
<div class="sobreposicao" id="modal-identificacao">
  <div class="caixa-modal">
    <div class="titulo-modal">
      <span class="emoji-modal">🌸</span>
      <h2>Seja bem-vinda(o)!</h2>
    </div>
    <p class="subtitulo-modal">Para continuar, conta pra gente seu nome e telefone — assim já deixamos tudo prontinho nas próximas visitas 💖</p>

    <form onsubmit="enviarIdentificacao(event)">
      <div class="erro-form" id="erro-identificacao"></div>
      <div class="campo">
        <label>Seu nome</label>
        <input type="text" id="campo-nome-identificacao" placeholder="Como você se chama?" required>
      </div>
      <div class="campo">
        <label>Seu telefone (com DDD)</label>
        <input type="tel" id="campo-telefone-identificacao" placeholder="(77) 99999-9999" required>
        <small>Usamos só para confirmar seu pedido, nada de spam 🙂</small>
      </div>
      <button type="submit" class="botao-cheio">Entrar na loja 🎀</button>
    </form>
  </div>
</div>

<!-- ===================== MODAL: CARRINHO ===================== -->
<div class="sobreposicao" id="modal-carrinho">
  <div class="caixa-modal">
    <button class="fechar-modal" onclick="fecharModal('modal-carrinho')">✕</button>
    <div class="titulo-modal">
      <span class="emoji-modal">🛒</span>
      <h2>Seu carrinho</h2>
    </div>

    <div class="lista-carrinho" id="lista-itens-carrinho"></div>

    <div class="resumo-total" id="resumo-carrinho" style="display:none">
      <div class="linha-resumo"><span>Subtotal</span><span id="subtotal-carrinho">R$ 0,00</span></div>
      <div class="linha-resumo total-final"><span>Total</span><span id="total-carrinho">R$ 0,00</span></div>
    </div>

    <button class="botao-cheio" id="botao-ir-checkout" onclick="irParaCheckout()" style="display:none">Finalizar compra 🎀</button>
  </div>
</div>

<!-- ===================== MODAL: CHECKOUT / PAGAMENTO ===================== -->
<div class="sobreposicao" id="modal-checkout">
  <div class="caixa-modal larga">
    <button class="fechar-modal" onclick="fecharModal('modal-checkout')">✕</button>
    <div class="titulo-modal">
      <span class="emoji-modal">💳</span>
      <h2>Como você quer pagar?</h2>
    </div>
    <p class="subtitulo-modal">Total do pedido: <strong id="total-checkout">R$ 0,00</strong></p>

    <div id="aviso-multiplos-pagamentos" class="aviso-form" style="display:none">
      ℹ️ Seu pedido tem produtos com formas de pagamento diferentes. Veja abaixo o pagamento de cada um.
    </div>

    <div id="lista-grupos-pagamento"></div>

    <button class="botao-cheio" id="botao-finalizar-pedido" onclick="finalizarPedido()" disabled>Confirmar pedido 🎀</button>
  </div>
</div>

<!-- ===================== MODAL: SUCESSO ===================== -->
<div class="sobreposicao" id="modal-sucesso">
  <div class="caixa-modal" style="text-align:center">
    <button class="fechar-modal" onclick="fecharModal('modal-sucesso')">✕</button>
    <div class="titulo-modal">
      <span class="emoji-modal">🎉</span>
      <h2>Pedido recebido!</h2>
    </div>
    <p class="subtitulo-modal">
      Seu pedido <strong id="numero-pedido-sucesso">#0000</strong> foi registrado com sucesso.<br>
      Em breve entraremos em contato pelo WhatsApp para confirmar tudo! 💖
    </p>

    <div id="bloco-comprovante-sucesso" style="display:none">
      <p class="subtitulo-modal" style="margin-top:14px;">Pagou com Pix? Envie o comprovante pra agente confirmar mais rápido:</p>
      <a id="link-comprovante-whatsapp" href="#" target="_blank" style="display:block; margin-bottom:10px;">
        <button class="botao-cheio" type="button" style="background:#2bb74a;">📎 Enviar comprovante pelo WhatsApp</button>
      </a>
    </div>

    <button class="botao-fantasma" onclick="fecharModal('modal-sucesso')">Continuar comprando 🌸</button>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast-global"></div>
`;

export default function PaginaLoja() {
  useEffect(() => {
    carregarScript('/js/banco.js')
      .then(() => carregarScript('/js/loja.js'))
      .catch((err) => console.error('Erro ao carregar scripts:', err));
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: corpoHtml }} />
  );
}
