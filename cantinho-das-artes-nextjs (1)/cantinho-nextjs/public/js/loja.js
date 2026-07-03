/* =====================================================================
   loja.js — comportamento da página principal da loja
   (versão conectada ao banco via API — todas as leituras/escritas no
   Banco agora são assíncronas, então as funções daqui usam async/await)
   ===================================================================== */

let categoriaSelecionada = 'todas';
let termoBusca = '';
let categoriasCache = []; // usado para montar os cartões de produto sem refazer fetch a cada item

document.addEventListener('DOMContentLoaded', () => {
  iniciar();
});

async function iniciar() {
  await aplicarConfiguracoes();
  await verificarIdentificacao();
  categoriasCache = await Banco.Categorias.listar();
  await renderizarCategorias();
  await renderizarProdutos();
  atualizarContadorCarrinho();
  ligarEventosGlobais();
}

// ---------------------------------------------------------------
// CONFIGURAÇÕES VISUAIS (vindas do painel admin)
// ---------------------------------------------------------------
async function aplicarConfiguracoes() {
  const cfg = await Banco.Config.obterTodas();
  document.getElementById('texto-aviso-topo').textContent = cfg.topo_aviso || '';
  document.getElementById('nome-loja-cabecalho').textContent = cfg.nome_loja || 'Cantinho das Artes';
  document.getElementById('subtitulo-loja-cabecalho').textContent = cfg.subtitulo_loja || '';
  document.getElementById('rodape-texto').textContent = cfg.rodape_texto || '';
  document.getElementById('rodape-instagram').textContent = cfg.instagram || '';
  document.getElementById('rodape-instagram').href = `https://instagram.com/${(cfg.instagram || '').replace('@', '')}`;

  const logoEl = document.getElementById('marca-logo-img');
  if (cfg.logo_url) {
    logoEl.innerHTML = `<img src="${cfg.logo_url}" alt="Logo">`;
  } else {
    logoEl.textContent = cfg.mascote_emoji || '👧🎨';
  }

  const linkWhats = document.getElementById('link-whatsapp-flutuante');
  if (linkWhats && cfg.whatsapp_numero) {
    linkWhats.href = `https://wa.me/${cfg.whatsapp_numero}`;
  }

  // Banner principal (hero)
  document.getElementById('hero-titulo').textContent = cfg.hero_titulo || 'Tudo que você precisa, em um só lugar! 🌸';
  document.getElementById('hero-texto-p').textContent = cfg.hero_texto || '';
  const heroMascoteEl = document.getElementById('hero-mascote');
  if (cfg.hero_imagem_url) {
    heroMascoteEl.innerHTML = `<img src="${cfg.hero_imagem_url}" alt="Imagem da loja">`;
  } else {
    heroMascoteEl.textContent = cfg.mascote_emoji || '👧🎨';
  }

  // Banner secundário (opcional, no meio da loja)
  const secaoBannerMeio = document.getElementById('secao-banner-meio');
  if (cfg.banner_meio_ativo) {
    secaoBannerMeio.style.display = 'block';
    document.getElementById('banner-meio-titulo').textContent = cfg.banner_meio_titulo || '';
    const textoEl = document.getElementById('banner-meio-texto');
    textoEl.textContent = cfg.banner_meio_texto || '';
    textoEl.style.display = cfg.banner_meio_texto ? 'block' : 'none';

    const linkEl = document.getElementById('banner-meio-link');
    if (cfg.banner_meio_link) {
      linkEl.href = cfg.banner_meio_link;
      linkEl.style.display = 'inline-flex';
    } else {
      linkEl.style.display = 'none';
    }

    const imagemEl = document.getElementById('banner-meio-imagem');
    if (cfg.banner_meio_imagem_url) {
      imagemEl.innerHTML = `<img src="${cfg.banner_meio_imagem_url}" alt="Banner">`;
    } else {
      imagemEl.textContent = '🎁';
    }
  } else {
    secaoBannerMeio.style.display = 'none';
  }

  document.title = `${cfg.nome_loja || 'Cantinho das Artes'} — Loja Virtual`;
}

// ---------------------------------------------------------------
// IDENTIFICAÇÃO DO CLIENTE (nome + telefone)
// ---------------------------------------------------------------
async function verificarIdentificacao() {
  const cliente = await Banco.Clientes.sessaoAtual();
  if (cliente) {
    mostrarChipUsuario(cliente);
  } else {
    abrirModal('modal-identificacao');
  }
}

function mostrarChipUsuario(cliente) {
  const chip = document.getElementById('chip-usuario');
  chip.style.display = 'flex';
  const primeiroNome = cliente.nome.split(' ')[0];
  document.getElementById('nome-usuario-chip').textContent = primeiroNome;
  document.getElementById('inicial-usuario').textContent = primeiroNome.charAt(0).toUpperCase();
}

async function enviarIdentificacao(ev) {
  ev.preventDefault();
  const nome = document.getElementById('campo-nome-identificacao').value.trim();
  const telefone = document.getElementById('campo-telefone-identificacao').value.trim();
  const erro = document.getElementById('erro-identificacao');

  if (nome.length < 2) {
    erro.textContent = 'Digite seu nome completo, por favor 💗';
    erro.classList.add('mostrar');
    return;
  }
  const telefoneLimpo = telefone.replace(/\D/g, '');
  if (telefoneLimpo.length < 10) {
    erro.textContent = 'Digite um telefone válido com DDD.';
    erro.classList.add('mostrar');
    return;
  }

  erro.classList.remove('mostrar');
  try {
    const cliente = await Banco.Clientes.identificar(nome, telefoneLimpo);
    mostrarChipUsuario(cliente);
    fecharModal('modal-identificacao');
    mostrarToast(`Que alegria ter você aqui, ${nome.split(' ')[0]}! 🌸`);
  } catch (e) {
    erro.textContent = 'Não foi possível salvar seus dados agora. Tente de novo em alguns segundos.';
    erro.classList.add('mostrar');
  }
}

function alternarMenuUsuario() {
  document.getElementById('menu-dropdown-usuario').classList.toggle('aberto');
}

async function sairDaLoja() {
  await Banco.Clientes.sair();
  mostrarToast('Você saiu da loja. Até a próxima! 👋');
  setTimeout(() => location.reload(), 700);
}

// ---------------------------------------------------------------
// CATEGORIAS
// ---------------------------------------------------------------
async function renderizarCategorias() {
  const nav = document.getElementById('nav-categorias');
  let html = `<button class="chip-categoria ${categoriaSelecionada === 'todas' ? 'ativo' : ''}" onclick="selecionarCategoria('todas')">✨ Todos</button>`;
  categoriasCache.forEach((cat) => {
    html += `<button class="chip-categoria ${categoriaSelecionada === String(cat.id) ? 'ativo' : ''}" onclick="selecionarCategoria('${cat.id}')">${cat.nome}</button>`;
  });
  nav.innerHTML = html;
}

async function selecionarCategoria(id) {
  categoriaSelecionada = id;
  await renderizarCategorias();
  await renderizarProdutos();
}

// ---------------------------------------------------------------
// PRODUTOS / CATÁLOGO
// ---------------------------------------------------------------
function emojiParaCategoria(categoriaId) {
  const mapa = { 1: '💐', 2: '📔', 3: '🎁', 4: '🎀' };
  return mapa[categoriaId] || '🛍️';
}

function nomeCategoria(categoriaId) {
  const cat = categoriasCache.find((c) => c.id === categoriaId);
  return cat ? cat.nome : '';
}

async function renderizarProdutos() {
  let produtos = await Banco.Produtos.listar();

  if (categoriaSelecionada !== 'todas') {
    produtos = produtos.filter((p) => p.categoria_id === Number(categoriaSelecionada));
  }
  if (termoBusca) {
    const t = termoBusca.toLowerCase();
    produtos = produtos.filter((p) => p.nome.toLowerCase().includes(t) || (p.descricao || '').toLowerCase().includes(t));
  }

  // Destaques (somente quando vendo "todas" sem busca)
  const secaoDestaques = document.getElementById('secao-destaques');
  if (categoriaSelecionada === 'todas' && !termoBusca) {
    const destaques = (await Banco.Produtos.destaques());
    if (destaques.length) {
      secaoDestaques.style.display = 'block';
      document.getElementById('grid-destaques').innerHTML = destaques.map(cartaoProdutoHtml).join('');
    } else {
      secaoDestaques.style.display = 'none';
    }
  } else {
    secaoDestaques.style.display = 'none';
  }

  const grid = document.getElementById('grid-produtos');
  const tituloSecao = document.getElementById('titulo-secao-catalogo');

  if (categoriaSelecionada === 'todas') {
    tituloSecao.textContent = termoBusca ? `Resultados para "${termoBusca}"` : 'Todo o catálogo';
  } else {
    const cat = await Banco.Categorias.obter(categoriaSelecionada);
    tituloSecao.textContent = cat ? cat.nome : 'Catálogo';
  }

  if (!produtos.length) {
    grid.innerHTML = `<div class="sem-produtos">🔍 Nenhum produto encontrado por aqui.<br>Tente outra busca ou categoria.</div>`;
    return;
  }

  grid.innerHTML = produtos.map(cartaoProdutoHtml).join('');
}

function cartaoProdutoHtml(produto) {
  const temPromo = produto.preco_promo && Number(produto.preco_promo) < Number(produto.preco);
  const precoFinal = temPromo ? Number(produto.preco_promo) : Number(produto.preco);
  const imagem = produto.imagem_url
    ? `<img src="${produto.imagem_url}" alt="${produto.nome}">`
    : emojiParaCategoria(produto.categoria_id);

  return `
    <div class="cartao-produto">
      ${temPromo ? `<span class="selo">PROMOÇÃO</span>` : ''}
      <div class="imagem-produto">${imagem}</div>
      <div class="info-produto">
        <span class="categoria-tag">${nomeCategoria(produto.categoria_id)}</span>
        <h4>${produto.nome}</h4>
        <p class="descricao-curta">${produto.descricao || ''}</p>
        <div class="linha-preco">
          <span class="preco-atual">R$ ${precoFinal.toFixed(2).replace('.', ',')}</span>
          ${temPromo ? `<span class="preco-original">R$ ${Number(produto.preco).toFixed(2).replace('.', ',')}</span>` : ''}
        </div>
        <button class="botao-adicionar" onclick="adicionarAoCarrinho(${produto.id})">🛒 Adicionar</button>
      </div>
    </div>`;
}

async function buscarProdutos(valor) {
  termoBusca = valor.trim();
  categoriaSelecionada = 'todas';
  await renderizarCategorias();
  await renderizarProdutos();
}

// ---------------------------------------------------------------
// CARRINHO (continua local, no navegador)
// ---------------------------------------------------------------
async function adicionarAoCarrinho(produtoId) {
  Banco.Carrinho.adicionar(produtoId, 1);
  atualizarContadorCarrinho();
  const produto = await Banco.Produtos.obter(produtoId);
  mostrarToast(`"${produto.nome}" foi para o carrinho 🛍️`);
}

function atualizarContadorCarrinho() {
  const qtd = Banco.Carrinho.quantidadeTotal();
  const badge = document.getElementById('contador-carrinho');
  badge.textContent = qtd;
  badge.style.display = qtd > 0 ? 'flex' : 'none';
}

async function abrirCarrinho() {
  await renderizarCarrinho();
  abrirModal('modal-carrinho');
}

async function renderizarCarrinho() {
  const itens = await Banco.Carrinho.detalhado();
  const lista = document.getElementById('lista-itens-carrinho');
  const resumo = document.getElementById('resumo-carrinho');

  if (!itens.length) {
    lista.innerHTML = `<div class="carrinho-vazio"><span class="emoji-grande">🛒</span>Seu carrinho está vazio.<br>Que tal dar uma olhada no catálogo?</div>`;
    resumo.style.display = 'none';
    document.getElementById('botao-ir-checkout').style.display = 'none';
    return;
  }

  resumo.style.display = 'flex';
  document.getElementById('botao-ir-checkout').style.display = 'block';

  lista.innerHTML = itens
    .map((item) => {
      const imagem = item.produto.imagem_url
        ? `<img src="${item.produto.imagem_url}" alt="">`
        : emojiParaCategoria(item.produto.categoria_id);
      return `
      <div class="item-carrinho">
        <div class="mini-imagem">${imagem}</div>
        <div class="detalhes-item">
          <h5>${item.produto.nome}</h5>
          <span class="preco-item">R$ ${item.preco_unitario.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="controle-qtd">
          <button onclick="alterarQuantidade(${item.produto_id}, ${item.quantidade - 1})">−</button>
          <span>${item.quantidade}</span>
          <button onclick="alterarQuantidade(${item.produto_id}, ${item.quantidade + 1})">+</button>
        </div>
        <button class="remover-item" onclick="alterarQuantidade(${item.produto_id}, 0)" title="Remover">🗑️</button>
      </div>`;
    })
    .join('');

  const total = await Banco.Carrinho.total();
  document.getElementById('subtotal-carrinho').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  document.getElementById('total-carrinho').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

async function alterarQuantidade(produtoId, novaQtd) {
  Banco.Carrinho.atualizarQuantidade(produtoId, novaQtd);
  await renderizarCarrinho();
  atualizarContadorCarrinho();
}

// ---------------------------------------------------------------
// CHECKOUT
// ---------------------------------------------------------------
let escolhasPagamentoPorGrupo = {};

async function irParaCheckout() {
  if (!Banco.Carrinho.obter().length) return;
  fecharModal('modal-carrinho');
  escolhasPagamentoPorGrupo = {};
  await renderizarResumoCheckout();
  abrirModal('modal-checkout');
}

function chaveGrupo(grupo) {
  return grupo.ehGeral ? 'geral' : `mp:${grupo.mercadopago_link}|pix:${grupo.pix_qr_imagem_url}`;
}

async function renderizarResumoCheckout() {
  const total = await Banco.Carrinho.total();
  document.getElementById('total-checkout').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

  const grupos = await Banco.Carrinho.gruposDePagamento();
  document.getElementById('aviso-multiplos-pagamentos').style.display = grupos.length > 1 ? 'block' : 'none';

  const container = document.getElementById('lista-grupos-pagamento');
  container.innerHTML = grupos.map((grupo) => htmlGrupoPagamento(grupo)).join('');

  await atualizarBotaoFinalizar();
}

function htmlGrupoPagamento(grupo) {
  const chave = chaveGrupo(grupo);
  const nomesItens = grupo.itens.map((i) => `${i.quantidade}x ${i.produto.nome}`).join(', ');
  const temMP = !!(grupo.mercadopago_link || '').trim();
  const temPix = !!(grupo.pix_qr_imagem_url || '').trim() || !!(grupo.pix_chave || '').trim();

  return `
    <div class="grupo-pagamento" data-grupo="${chave}">
      <div class="cabecalho-grupo-pg">
        <strong>Pagamento ${grupo.ehGeral ? 'geral da loja' : 'deste produto'}</strong>
        <span>R$ ${grupo.subtotal.toFixed(2).replace('.', ',')}</span>
      </div>
      ${grupo.ehGeral ? `<span class="selo-geral-pg">💡 forma de pagamento padrão da loja</span>` : `<span class="selo-geral-pg">🎀 forma de pagamento específica deste produto</span>`}
      <div class="itens-grupo-pg">${nomesItens}</div>

      <div class="opcoes-pagamento">
        ${temMP ? `
        <label class="opcao-pagamento" onclick="escolherPagamentoGrupo('${chave}', 'mercado_pago', this)">
          <span class="icone-pg">💳</span>
          <span class="texto-pg"><strong>Mercado Pago</strong><span>Cartão, boleto ou saldo</span></span>
          <input type="radio" name="pagamento-${chave}">
        </label>` : ''}
        ${temPix ? `
        <label class="opcao-pagamento" onclick="escolherPagamentoGrupo('${chave}', 'pix', this)">
          <span class="icone-pg">🔳</span>
          <span class="texto-pg"><strong>Pix</strong><span>Pagamento instantâneo</span></span>
          <input type="radio" name="pagamento-${chave}">
        </label>` : ''}
      </div>

      ${!temMP && !temPix ? `<div class="erro-form mostrar">Nenhuma forma de pagamento configurada ainda. Fale com a loja antes de finalizar.</div>` : ''}

      <a href="${grupo.mercadopago_link || '#'}" target="_blank" class="link-mp-grupo" id="link-mp-${chave.replace(/[^a-zA-Z0-9]/g, '')}" style="display:none; margin-top:6px;">
        <button class="botao-fantasma" type="button">Abrir link do Mercado Pago ↗</button>
      </a>

      <div class="bloco-pix bloco-pix-grupo" id="pix-${chave.replace(/[^a-zA-Z0-9]/g, '')}" style="display:none; margin-top:10px;">
        ${grupo.pix_qr_imagem_url ? `<img src="${grupo.pix_qr_imagem_url}" alt="QR Code Pix">` : ''}
        <p style="font-size:0.85rem; color:var(--texto-suave); margin-bottom:8px;">Copie a chave Pix abaixo:</p>
        <div class="chave-pix-caixa">
          <span class="chave-pix-texto-grupo">${grupo.pix_chave || 'Chave Pix não cadastrada ainda'}</span>
          <button type="button" onclick="copiarChavePixGrupo(this)">Copiar</button>
        </div>
      </div>
    </div>`;
}

async function escolherPagamentoGrupo(chave, forma, el) {
  escolhasPagamentoPorGrupo[chave] = forma;

  const grupoEl = el.closest('.grupo-pagamento');
  grupoEl.querySelectorAll('.opcao-pagamento').forEach((o) => o.classList.remove('selecionada'));
  el.classList.add('selecionada');

  const idSeguro = chave.replace(/[^a-zA-Z0-9]/g, '');
  const blocoPix = document.getElementById(`pix-${idSeguro}`);
  const linkMp = document.getElementById(`link-mp-${idSeguro}`);
  if (blocoPix) blocoPix.style.display = forma === 'pix' ? 'block' : 'none';
  if (linkMp) linkMp.style.display = forma === 'mercado_pago' ? 'block' : 'none';

  await atualizarBotaoFinalizar();
}

async function atualizarBotaoFinalizar() {
  const grupos = await Banco.Carrinho.gruposDePagamento();
  const todosEscolhidos = grupos.every((g) => escolhasPagamentoPorGrupo[chaveGrupo(g)]);
  document.getElementById('botao-finalizar-pedido').disabled = !todosEscolhidos;
}

function copiarChavePixGrupo(botao) {
  const chaveTexto = botao.closest('.chave-pix-caixa').querySelector('.chave-pix-texto-grupo').textContent;
  navigator.clipboard?.writeText(chaveTexto);
  mostrarToast('Chave Pix copiada! 📋');
}

async function finalizarPedido() {
  const cliente = await Banco.Clientes.sessaoAtual();
  if (!cliente) {
    abrirModal('modal-identificacao');
    return;
  }

  const grupos = await Banco.Carrinho.gruposDePagamento();
  const todosEscolhidos = grupos.every((g) => escolhasPagamentoPorGrupo[chaveGrupo(g)]);
  if (!todosEscolhidos) return;

  const botaoFinalizar = document.getElementById('botao-finalizar-pedido');
  botaoFinalizar.disabled = true;
  botaoFinalizar.textContent = 'Enviando pedido...';

  try {
    const itens = await Banco.Carrinho.detalhado();
    const total = await Banco.Carrinho.total();
    const usouPix = grupos.some((g) => escolhasPagamentoPorGrupo[chaveGrupo(g)] === 'pix');
    const formasUsadas = [...new Set(grupos.map((g) => escolhasPagamentoPorGrupo[chaveGrupo(g)]))];

    const pedido = await Banco.Pedidos.criar({
      cliente_id: cliente.id,
      forma_pagamento: formasUsadas.join('+'),
      subtotal: total,
      desconto: 0,
      total: total,
      itens: itens.map((i) => ({
        produto_id: i.produto_id,
        nome_produto: i.produto.nome,
        preco_unitario: i.preco_unitario,
        quantidade: i.quantidade,
      })),
    });

    Banco.Carrinho.limpar();
    atualizarContadorCarrinho();
    fecharModal('modal-checkout');
    document.getElementById('numero-pedido-sucesso').textContent = `#${String(pedido.id).padStart(4, '0')}`;

    const blocoComprovante = document.getElementById('bloco-comprovante-sucesso');
    if (usouPix) {
      const cfg = await Banco.Config.obterTodas();
      const numeroWhats = (cfg.whatsapp_numero || '').replace(/\D/g, '');
      const mensagem = `Olá! Sou ${cliente.nome} e acabei de fazer o pedido #${String(pedido.id).padStart(4, '0')} (R$ ${total.toFixed(2).replace('.', ',')}) via Pix. Segue o comprovante:`;
      document.getElementById('link-comprovante-whatsapp').href = `https://wa.me/${numeroWhats}?text=${encodeURIComponent(mensagem)}`;
      blocoComprovante.style.display = 'block';
    } else {
      blocoComprovante.style.display = 'none';
    }

    abrirModal('modal-sucesso');
  } catch (e) {
    mostrarToast('Não foi possível registrar o pedido. Tente novamente.');
  } finally {
    botaoFinalizar.disabled = false;
    botaoFinalizar.textContent = 'Confirmar pedido 🎀';
  }
}

// ---------------------------------------------------------------
// MODAIS / TOAST
// ---------------------------------------------------------------
function abrirModal(id) { document.getElementById(id).classList.add('aberta'); }
function fecharModal(id) { document.getElementById(id).classList.remove('aberta'); }

function mostrarToast(mensagem) {
  const toast = document.getElementById('toast-global');
  toast.textContent = mensagem;
  toast.classList.add('mostrar');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('mostrar'), 2600);
}

function ligarEventosGlobais() {
  document.addEventListener('click', (ev) => {
    const chip = document.getElementById('chip-usuario');
    const menu = document.getElementById('menu-dropdown-usuario');
    if (chip && !chip.contains(ev.target)) {
      menu.classList.remove('aberto');
    }
  });

  document.querySelectorAll('.sobreposicao').forEach((overlay) => {
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) overlay.classList.remove('aberta');
    });
  });
}
