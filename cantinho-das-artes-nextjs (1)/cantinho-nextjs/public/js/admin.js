/* =====================================================================
   admin.js — comportamento do painel administrativo
   (versão conectada ao banco via API — todas as leituras/escritas no
   Banco agora são assíncronas, então as funções daqui usam async/await)
   ===================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const logado = await Banco.Admin.estaLogado();
  if (logado) {
    await mostrarPainelAdmin();
  } else {
    document.getElementById('tela-login').style.display = 'flex';
  }

  document.getElementById('form-login-admin').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const usuario = document.getElementById('campo-usuario-login').value.trim();
    const senha = document.getElementById('campo-senha-login').value;
    const botao = ev.target.querySelector('button[type=submit]');
    botao.disabled = true;
    const ok = await Banco.Admin.login(usuario, senha);
    botao.disabled = false;
    if (ok) {
      await mostrarPainelAdmin();
    } else {
      const erro = document.getElementById('erro-login');
      erro.textContent = 'Usuário ou senha incorretos. Tente novamente.';
      erro.classList.add('mostrar');
    }
  });
});

async function mostrarPainelAdmin() {
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('app-admin').style.display = 'flex';
  await carregarConfiguracoesNosFormularios();
  await trocarPainel('dashboard');
}

async function logoutAdmin() {
  await Banco.Admin.logout();
  location.reload();
}

// ---------------------------------------------------------------
// NAVEGAÇÃO ENTRE PAINÉIS
// ---------------------------------------------------------------
async function trocarPainel(nome) {
  document.querySelectorAll('.painel-admin').forEach((p) => p.classList.remove('ativo'));
  document.querySelectorAll('.menu-admin button').forEach((b) => b.classList.remove('ativo'));
  document.getElementById(`painel-${nome}`).classList.add('ativo');
  document.getElementById(`menu-${nome}`).classList.add('ativo');

  const titulos = {
    dashboard: ['📊 Visão geral', 'Resumo de vendas e atividade da loja'],
    pedidos: ['🧾 Pedidos', 'Acompanhe e atualize os pedidos recebidos'],
    catalogo: ['🎀 Catálogo', 'Gerencie produtos, categorias e estoque'],
    promocoes: ['🏷️ Promoções', 'Crie descontos e cupons para seus clientes'],
    pagamento: ['💳 Formas de pagamento', 'Configure Mercado Pago e Pix'],
    aparencia: ['🎨 Aparência da loja', 'Personalize topo, rodapé e identidade visual'],
    clientes: ['👥 Clientes', 'Veja quem já visitou e comprou na sua loja'],
  };
  const [titulo, sub] = titulos[nome] || ['', ''];
  document.getElementById('titulo-pagina-admin').textContent = titulo;
  document.getElementById('subtitulo-pagina-admin').textContent = sub;

  if (nome === 'dashboard') await renderizarDashboard();
  if (nome === 'pedidos') await renderizarPedidos();
  if (nome === 'catalogo') {
    await renderizarCategoriasAdmin();
    await renderizarProdutosAdmin();
  }
  if (nome === 'promocoes') {
    await popularSelectProdutosPromocao();
    await renderizarPromocoes();
  }
  if (nome === 'clientes') await renderizarClientes();
}

// ---------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------
async function renderizarDashboard() {
  const [pedidos, totalVendidoMes, totalHoje, totalOntem, pedidosMes, clientes, produtos] = await Promise.all([
    Banco.Pedidos.listar(),
    Banco.Pedidos.totalVendidoMesAtual(),
    Banco.Pedidos.totalVendidoHoje(),
    Banco.Pedidos.totalVendidoOntem(),
    Banco.Pedidos.pedidosMesAtual(),
    Banco.Clientes.listarTodos(),
    Banco.Produtos.listar(false),
  ]);

  document.getElementById('metrica-total-vendido').textContent = `R$ ${totalVendidoMes.toFixed(2).replace('.', ',')}`;
  document.getElementById('legenda-vendido-hoje-ontem').textContent =
    `Ontem: R$ ${totalOntem.toFixed(2).replace('.', ',')} · Hoje: R$ ${totalHoje.toFixed(2).replace('.', ',')}`;
  document.getElementById('metrica-total-pedidos').textContent = pedidosMes.length;
  document.getElementById('metrica-total-clientes').textContent = clientes.length;
  document.getElementById('metrica-total-produtos').textContent = produtos.length;

  const recentes = pedidos.slice(0, 5);
  const corpo = document.getElementById('corpo-pedidos-recentes');
  if (!recentes.length) {
    corpo.innerHTML = `<tr><td colspan="5"><div class="estado-vazio-admin"><span class="emoji-vazio">🧾</span>Nenhum pedido ainda. Quando alguém comprar, vai aparecer aqui!</div></td></tr>`;
    return;
  }
  corpo.innerHTML = recentes
    .map((p) => {
      return `
      <tr>
        <td data-rotulo="Pedido">#${String(p.id).padStart(4, '0')}</td>
        <td data-rotulo="Cliente">${p.cliente_nome || 'Cliente removido'}</td>
        <td data-rotulo="Total">R$ ${Number(p.total).toFixed(2).replace('.', ',')}</td>
        <td data-rotulo="Status"><span class="selo-status ${p.status}">${rotuloStatus(p.status)}</span></td>
        <td data-rotulo="Data">${formatarData(p.criado_em)}</td>
      </tr>`;
    })
    .join('');
}

function rotuloStatus(status) {
  const mapa = { novo: 'Novo', pago: 'Pago', em_preparo: 'Em preparo', enviado: 'Enviado', concluido: 'Concluído', cancelado: 'Cancelado' };
  return mapa[status] || status;
}

function formatarData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------
// PEDIDOS
// ---------------------------------------------------------------
async function renderizarPedidos() {
  const pedidos = await Banco.Pedidos.listar();
  const corpo = document.getElementById('corpo-tabela-pedidos');

  if (!pedidos.length) {
    corpo.innerHTML = `<tr><td colspan="6"><div class="estado-vazio-admin"><span class="emoji-vazio">🧾</span>Ainda não há pedidos registrados.</div></td></tr>`;
    return;
  }

  corpo.innerHTML = pedidos
    .map((p) => {
      const itensTexto = (p.itens || []).map((i) => `${i.quantidade}x ${i.nome_produto}`).join(', ');
      return `
      <tr>
        <td data-rotulo="Pedido">#${String(p.id).padStart(4, '0')}</td>
        <td data-rotulo="Cliente">${p.cliente_nome ? `${p.cliente_nome}<br><small style="color:var(--texto-suave)">${formatarTelefone(p.cliente_telefone)}</small>` : 'Cliente removido'}</td>
        <td data-rotulo="Itens" style="max-width:220px; font-size:0.8rem;">${itensTexto}</td>
        <td data-rotulo="Total">R$ ${Number(p.total).toFixed(2).replace('.', ',')}</td>
        <td data-rotulo="Status">
          <select onchange="mudarStatusPedido(${p.id}, this.value)" style="padding:6px 8px; border-radius:8px; border:1px solid #fce6ee; font-size:0.78rem;">
            ${['novo', 'pago', 'em_preparo', 'enviado', 'concluido', 'cancelado']
              .map((s) => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${rotuloStatus(s)}</option>`)
              .join('')}
          </select>
        </td>
        <td data-rotulo="Data">${formatarData(p.criado_em)}</td>
      </tr>`;
    })
    .join('');
}

function formatarTelefone(tel) {
  if (!tel) return '';
  return tel.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

async function mudarStatusPedido(id, novoStatus) {
  await Banco.Pedidos.atualizarStatus(id, novoStatus);
  mostrarToast('Status do pedido atualizado ✅');
}

// ---------------------------------------------------------------
// CATÁLOGO — CATEGORIAS
// ---------------------------------------------------------------
async function renderizarCategoriasAdmin() {
  const [categorias, produtos] = await Promise.all([Banco.Categorias.listar(false), Banco.Produtos.listar(false)]);
  const cont = document.getElementById('lista-categorias-admin');
  cont.innerHTML =
    categorias
      .map((c) => {
        const qtd = produtos.filter((p) => p.categoria_id === c.id).length;
        return `
    <div class="lista-promo-item">
      <div class="info-promo">
        <strong>${c.nome}</strong>
        <span>${qtd} produto(s)</span>
      </div>
      <div class="acoes-tabela">
        <button onclick="removerCategoria(${c.id})" class="excluir" title="Excluir">🗑️</button>
      </div>
    </div>`;
      })
      .join('') || `<p style="color:var(--texto-suave); font-size:0.85rem;">Nenhuma categoria cadastrada.</p>`;

  await popularSelectCategorias();
}

async function popularSelectCategorias() {
  const categorias = await Banco.Categorias.listar();
  const select = document.getElementById('campo-produto-categoria');
  select.innerHTML = categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join('');
}

async function adicionarCategoria() {
  const input = document.getElementById('campo-nova-categoria');
  const nome = input.value.trim();
  if (!nome) return;
  await Banco.Categorias.criar({ nome });
  input.value = '';
  await renderizarCategoriasAdmin();
  mostrarToast('Categoria adicionada 🎀');
}

async function removerCategoria(id) {
  if (!confirm('Remover esta categoria? Os produtos dela ficarão sem categoria.')) return;
  await Banco.Categorias.remover(id);
  await renderizarCategoriasAdmin();
  await renderizarProdutosAdmin();
}

// ---------------------------------------------------------------
// CATÁLOGO — PRODUTOS
// ---------------------------------------------------------------
let produtoEditandoId = null;

async function renderizarProdutosAdmin() {
  const [produtos, categorias] = await Promise.all([Banco.Produtos.listar(false), Banco.Categorias.listar(false)]);
  const corpo = document.getElementById('corpo-tabela-produtos');

  if (!produtos.length) {
    corpo.innerHTML = `<tr><td colspan="6"><div class="estado-vazio-admin"><span class="emoji-vazio">🎀</span>Nenhum produto cadastrado ainda.</div></td></tr>`;
    return;
  }

  corpo.innerHTML = produtos
    .map((p) => {
      const categoria = categorias.find((c) => c.id === p.categoria_id);
      const imagem = p.imagem_url ? `<img src="${p.imagem_url}">` : '🛍️';
      return `
      <tr>
        <td data-rotulo="Imagem"><div class="miniatura-tabela">${imagem}</div></td>
        <td data-rotulo="Produto"><strong>${p.nome}</strong>${p.destaque ? ' ⭐' : ''}</td>
        <td data-rotulo="Categoria">${categoria ? categoria.nome : '—'}</td>
        <td data-rotulo="Preço">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}${p.preco_promo ? `<br><small style="color:var(--rosa-forte)">Promo: R$ ${Number(p.preco_promo).toFixed(2).replace('.', ',')}</small>` : ''}</td>
        <td data-rotulo="Status"><span class="selo-status ${p.ativo ? 'pago' : 'cancelado'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td data-rotulo="Ações">
          <div class="acoes-tabela">
            <button onclick="abrirEdicaoProduto(${p.id})" title="Editar">✏️</button>
            <button onclick="removerProduto(${p.id})" class="excluir" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>`;
    })
    .join('');
}

async function abrirModalProduto() {
  produtoEditandoId = null;
  document.getElementById('titulo-modal-produto').textContent = 'Novo produto';
  document.getElementById('form-produto').reset();
  document.getElementById('previa-imagem-produto').innerHTML = '🖼️ Pré-visualização da imagem';
  await popularSelectCategorias();
  abrirModal('modal-produto');
}

async function abrirEdicaoProduto(id) {
  const p = await Banco.Produtos.obter(id);
  if (!p) return;
  produtoEditandoId = id;
  document.getElementById('titulo-modal-produto').textContent = 'Editar produto';
  await popularSelectCategorias();

  document.getElementById('campo-produto-nome').value = p.nome;
  document.getElementById('campo-produto-categoria').value = p.categoria_id || '';
  document.getElementById('campo-produto-descricao').value = p.descricao || '';
  document.getElementById('campo-produto-preco').value = p.preco;
  document.getElementById('campo-produto-preco-promo').value = p.preco_promo || '';
  document.getElementById('campo-produto-estoque').value = p.estoque || 0;
  document.getElementById('campo-produto-imagem-url').value = p.imagem_url || '';
  document.getElementById('campo-produto-destaque').checked = !!p.destaque;
  document.getElementById('campo-produto-ativo').checked = !!p.ativo;
  document.getElementById('campo-produto-mp-link').value = p.mercadopago_link || '';
  document.getElementById('campo-produto-pix-qr-url').value = p.pix_qr_imagem_url || '';

  atualizarPreviaImagemProduto();
  abrirModal('modal-produto');
}

function atualizarPreviaImagemProduto() {
  const url = document.getElementById('campo-produto-imagem-url').value.trim();
  const previa = document.getElementById('previa-imagem-produto');
  previa.innerHTML = url ? `<img src="${url}">` : '🖼️ Pré-visualização da imagem';
}

async function salvarProduto(ev) {
  ev.preventDefault();
  const dados = {
    nome: document.getElementById('campo-produto-nome').value.trim(),
    categoria_id: Number(document.getElementById('campo-produto-categoria').value) || null,
    descricao: document.getElementById('campo-produto-descricao').value.trim(),
    preco: parseFloat(document.getElementById('campo-produto-preco').value) || 0,
    preco_promo: parseFloat(document.getElementById('campo-produto-preco-promo').value) || null,
    estoque: parseInt(document.getElementById('campo-produto-estoque').value) || 0,
    imagem_url: document.getElementById('campo-produto-imagem-url').value.trim(),
    destaque: document.getElementById('campo-produto-destaque').checked,
    ativo: document.getElementById('campo-produto-ativo').checked,
    mercadopago_link: document.getElementById('campo-produto-mp-link').value.trim(),
    pix_qr_imagem_url: document.getElementById('campo-produto-pix-qr-url').value.trim(),
  };

  if (produtoEditandoId) {
    await Banco.Produtos.atualizar(produtoEditandoId, dados);
    mostrarToast('Produto atualizado ✅');
  } else {
    await Banco.Produtos.criar(dados);
    mostrarToast('Produto cadastrado 🎀');
  }

  fecharModal('modal-produto');
  await renderizarProdutosAdmin();
}

async function removerProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  await Banco.Produtos.remover(id);
  await renderizarProdutosAdmin();
  mostrarToast('Produto removido');
}

// ---------------------------------------------------------------
// PROMOÇÕES
// ---------------------------------------------------------------
async function popularSelectProdutosPromocao() {
  const select = document.getElementById('campo-promo-produto');
  const produtos = await Banco.Produtos.listar();
  select.innerHTML = `<option value="">Toda a loja</option>` + produtos.map((p) => `<option value="${p.id}">${p.nome}</option>`).join('');
}

function alternarCampoCupom() {
  const tipo = document.getElementById('campo-promo-tipo').value;
  document.getElementById('linha-campo-cupom').style.display = tipo === 'cupom' ? 'block' : 'none';
}

async function renderizarPromocoes() {
  const [promocoes, produtos] = await Promise.all([Banco.Promocoes.listar(), Banco.Produtos.listar(false)]);
  const lista = document.getElementById('lista-promocoes-admin');

  if (!promocoes.length) {
    lista.innerHTML = `<div class="estado-vazio-admin"><span class="emoji-vazio">🏷️</span>Nenhuma promoção criada ainda.</div>`;
    return;
  }

  lista.innerHTML = promocoes
    .map((promo) => {
      const produto = promo.produto_id ? produtos.find((p) => p.id === promo.produto_id) : null;
      const valor = Number(promo.valor);
      const valorTexto =
        promo.tipo === 'percentual'
          ? `${valor}% de desconto`
          : promo.tipo === 'valor_fixo'
          ? `R$ ${valor.toFixed(2).replace('.', ',')} de desconto`
          : `Cupom ${promo.codigo_cupom}: ${valor}% de desconto`;
      return `
      <div class="lista-promo-item">
        <div class="info-promo">
          <strong>${promo.titulo}</strong>
          <span>${valorTexto} · ${produto ? produto.nome : 'Toda a loja'}</span>
        </div>
        <div class="acoes-tabela">
          <button onclick="removerPromocao(${promo.id})" class="excluir" title="Excluir">🗑️</button>
        </div>
      </div>`;
    })
    .join('');
}

async function salvarPromocao(ev) {
  ev.preventDefault();
  const tipo = document.getElementById('campo-promo-tipo').value;
  const dados = {
    titulo: document.getElementById('campo-promo-titulo').value.trim(),
    tipo,
    valor: parseFloat(document.getElementById('campo-promo-valor').value) || 0,
    codigo_cupom: tipo === 'cupom' ? document.getElementById('campo-promo-codigo').value.trim().toUpperCase() : null,
    produto_id: Number(document.getElementById('campo-promo-produto').value) || null,
    ativo: true,
  };
  await Banco.Promocoes.criar(dados);

  document.getElementById('form-promocao').reset();
  document.getElementById('linha-campo-cupom').style.display = 'none';
  await renderizarPromocoes();
  await renderizarProdutosAdmin();
  mostrarToast('Promoção criada 🏷️');
}

async function removerPromocao(id) {
  await Banco.Promocoes.remover(id);
  await renderizarPromocoes();
  mostrarToast('Promoção removida');
}

// ---------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------
async function renderizarClientes() {
  const [clientes, pedidos] = await Promise.all([Banco.Clientes.listarTodos(), Banco.Pedidos.listar()]);
  const corpo = document.getElementById('corpo-tabela-clientes');

  if (!clientes.length) {
    corpo.innerHTML = `<tr><td colspan="4"><div class="estado-vazio-admin"><span class="emoji-vazio">👥</span>Ainda não há clientes cadastrados.</div></td></tr>`;
    return;
  }

  corpo.innerHTML = clientes
    .map((c) => {
      const pedidosCliente = pedidos.filter((p) => p.cliente_id === c.id);
      return `
      <tr>
        <td data-rotulo="Nome"><strong>${c.nome}</strong></td>
        <td data-rotulo="Telefone">${formatarTelefone(c.telefone)}</td>
        <td data-rotulo="Pedidos">${pedidosCliente.length} pedido(s)</td>
        <td data-rotulo="Última visita">${formatarData(c.ultimo_acesso)}</td>
      </tr>`;
    })
    .join('');
}

// ---------------------------------------------------------------
// CONFIGURAÇÕES — APARÊNCIA / TOPO / RODAPÉ / PAGAMENTO
// ---------------------------------------------------------------
async function carregarConfiguracoesNosFormularios() {
  const cfg = await Banco.Config.obterTodas();

  document.getElementById('campo-nome-loja').value = cfg.nome_loja || '';
  document.getElementById('campo-subtitulo-loja').value = cfg.subtitulo_loja || '';
  document.getElementById('campo-aviso-topo').value = cfg.topo_aviso || '';
  document.getElementById('campo-rodape-texto').value = cfg.rodape_texto || '';
  document.getElementById('campo-whatsapp').value = cfg.whatsapp_numero || '';
  document.getElementById('campo-instagram').value = cfg.instagram || '';
  document.getElementById('campo-logo-url').value = cfg.logo_url || '';

  document.getElementById('campo-mercadopago-link').value = cfg.mercadopago_link || '';
  document.getElementById('campo-pix-chave').value = cfg.pix_chave || '';
  document.getElementById('campo-pix-qr-url').value = cfg.pix_qr_imagem_url || '';

  document.getElementById('campo-hero-titulo').value = cfg.hero_titulo || '';
  document.getElementById('campo-hero-texto').value = cfg.hero_texto || '';
  document.getElementById('campo-hero-imagem-url').value = cfg.hero_imagem_url || '';

  document.getElementById('campo-banner-meio-ativo').checked = !!cfg.banner_meio_ativo;
  document.getElementById('campo-banner-meio-titulo').value = cfg.banner_meio_titulo || '';
  document.getElementById('campo-banner-meio-texto').value = cfg.banner_meio_texto || '';
  document.getElementById('campo-banner-meio-imagem-url').value = cfg.banner_meio_imagem_url || '';
  document.getElementById('campo-banner-meio-link').value = cfg.banner_meio_link || '';
}

async function salvarAparencia(ev) {
  ev.preventDefault();
  await Banco.Config.salvar({
    nome_loja: document.getElementById('campo-nome-loja').value.trim(),
    subtitulo_loja: document.getElementById('campo-subtitulo-loja').value.trim(),
    topo_aviso: document.getElementById('campo-aviso-topo').value.trim(),
    rodape_texto: document.getElementById('campo-rodape-texto').value.trim(),
    whatsapp_numero: document.getElementById('campo-whatsapp').value.trim().replace(/\D/g, ''),
    instagram: document.getElementById('campo-instagram').value.trim(),
    logo_url: document.getElementById('campo-logo-url').value.trim(),
  });
  mostrarToast('Aparência da loja atualizada ✅ — confira na página principal!');
}

async function salvarBannerPrincipal(ev) {
  ev.preventDefault();
  await Banco.Config.salvar({
    hero_titulo: document.getElementById('campo-hero-titulo').value.trim(),
    hero_texto: document.getElementById('campo-hero-texto').value.trim(),
    hero_imagem_url: document.getElementById('campo-hero-imagem-url').value.trim(),
  });
  mostrarToast('Banner principal atualizado ✅ — confira na página principal!');
}

async function salvarBannerMeio(ev) {
  ev.preventDefault();
  await Banco.Config.salvar({
    banner_meio_ativo: document.getElementById('campo-banner-meio-ativo').checked,
    banner_meio_titulo: document.getElementById('campo-banner-meio-titulo').value.trim(),
    banner_meio_texto: document.getElementById('campo-banner-meio-texto').value.trim(),
    banner_meio_imagem_url: document.getElementById('campo-banner-meio-imagem-url').value.trim(),
    banner_meio_link: document.getElementById('campo-banner-meio-link').value.trim(),
  });
  mostrarToast('Banner secundário atualizado ✅ — confira na página principal!');
}

async function salvarPagamento(ev) {
  ev.preventDefault();
  await Banco.Config.salvar({
    mercadopago_link: document.getElementById('campo-mercadopago-link').value.trim(),
    pix_chave: document.getElementById('campo-pix-chave').value.trim(),
    pix_qr_imagem_url: document.getElementById('campo-pix-qr-url').value.trim(),
  });
  mostrarToast('Formas de pagamento atualizadas ✅');
}

// ---------------------------------------------------------------
// TOAST / MODAIS (compartilhado)
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
