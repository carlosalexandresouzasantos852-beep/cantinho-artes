/* =====================================================================
   banco.js — versão conectada ao Neon (via API routes do Next.js)
   =====================================================================
   Mantém a MESMA interface pública que a versão anterior (localStorage),
   então loja.js e admin.js continuam chamando Banco.Produtos.listar(),
   Banco.Config.obterTodas(), etc. — só que agora essas funções são
   assíncronas (retornam Promises) e os dados vêm do banco de verdade,
   compartilhados entre todo mundo que acessa a loja.

   O carrinho de compras continua no localStorage do navegador: é uma
   informação temporária, de uso pessoal durante a sessão de compra, e
   não precisa (nem deve) ser compartilhada entre dispositivos.
   ===================================================================== */

const Banco = (() => {

  // ------------------------------------------------------------------
  // Helper de requisição HTTP
  // ------------------------------------------------------------------
  async function api(caminho, opcoes = {}) {
    const resposta = await fetch(`/api/${caminho}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...opcoes,
    });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      throw new Error(corpo.erro || `Erro na requisição: ${caminho}`);
    }
    return resposta.json();
  }

  // ------------------------------------------------------------------
  // Cache simples em memória — evita refazer a mesma consulta várias
  // vezes na mesma navegação. É invalidado a cada escrita (criar/editar).
  // ------------------------------------------------------------------
  const cache = {
    config: null,
    categorias: null,
    produtos: null,
    promocoes: null,
  };

  // ===================================================================
  // CONFIGURAÇÕES
  // ===================================================================
  const Config = {
    async obterTodas() {
      if (!cache.config) cache.config = await api('config');
      return cache.config;
    },
    async obter(chave) {
      const todas = await this.obterTodas();
      return todas[chave];
    },
    async salvar(objetoParcial) {
      await api('config', { method: 'PUT', body: JSON.stringify(objetoParcial) });
      cache.config = { ...(cache.config || {}), ...objetoParcial };
    },
  };

  // ===================================================================
  // CATEGORIAS
  // ===================================================================
  const Categorias = {
    async listar(somenteAtivas = true) {
      if (!cache.categorias) cache.categorias = await api('categorias');
      return somenteAtivas ? cache.categorias.filter((c) => c.ativo) : cache.categorias;
    },
    async obter(id) {
      const todas = await this.listar(false);
      return todas.find((c) => c.id === Number(id));
    },
    async criar(dados) {
      const nova = await api('categorias', { method: 'POST', body: JSON.stringify(dados) });
      cache.categorias = null;
      return nova;
    },
    async remover(id) {
      await api(`categorias?id=${id}`, { method: 'DELETE' });
      cache.categorias = null;
    },
  };

  // ===================================================================
  // PRODUTOS
  // ===================================================================
  const Produtos = {
    async listar(somenteAtivos = true) {
      if (!cache.produtos) cache.produtos = await api('produtos');
      return somenteAtivos ? cache.produtos.filter((p) => p.ativo) : cache.produtos;
    },
    async obter(id) {
      const todos = await this.listar(false);
      return todos.find((p) => p.id === Number(id));
    },
    async destaques() {
      const todos = await this.listar();
      return todos.filter((p) => p.destaque);
    },
    async porCategoria(categoriaId) {
      const todos = await this.listar();
      return todos.filter((p) => p.categoria_id === Number(categoriaId));
    },
    async buscar(termo) {
      const todos = await this.listar();
      const t = termo.toLowerCase();
      return todos.filter(
        (p) => p.nome.toLowerCase().includes(t) || (p.descricao || '').toLowerCase().includes(t)
      );
    },
    async criar(dados) {
      const novo = await api('produtos', { method: 'POST', body: JSON.stringify(dados) });
      cache.produtos = null;
      return novo;
    },
    async atualizar(id, dados) {
      const atualizado = await api('produtos', {
        method: 'PUT',
        body: JSON.stringify({ id: Number(id), ...dados }),
      });
      cache.produtos = null;
      return atualizado;
    },
    async remover(id) {
      await api(`produtos?id=${id}`, { method: 'DELETE' });
      cache.produtos = null;
    },
  };

  // ===================================================================
  // PROMOÇÕES
  // ===================================================================
  const Promocoes = {
    async listar() {
      if (!cache.promocoes) cache.promocoes = await api('promocoes');
      return cache.promocoes;
    },
    async ativas() {
      const todas = await this.listar();
      const agora = new Date();
      return todas.filter((p) => {
        if (!p.ativo) return false;
        if (p.data_inicio && new Date(p.data_inicio) > agora) return false;
        if (p.data_fim && new Date(p.data_fim) < agora) return false;
        return true;
      });
    },
    async criar(dados) {
      const nova = await api('promocoes', { method: 'POST', body: JSON.stringify(dados) });
      cache.promocoes = null;
      cache.produtos = null; // o preço promocional do produto pode ter mudado
      return nova;
    },
    async remover(id) {
      await api(`promocoes?id=${id}`, { method: 'DELETE' });
      cache.promocoes = null;
    },
  };

  // ===================================================================
  // CLIENTES — identificação por nome + telefone (sessão via cookie)
  // ===================================================================
  const Clientes = {
    async identificar(nome, telefone) {
      const { cliente } = await api('clientes', {
        method: 'POST',
        body: JSON.stringify({ nome, telefone }),
      });
      return cliente;
    },
    async sessaoAtual() {
      const { cliente } = await api('clientes');
      return cliente;
    },
    async listarTodos() {
      const { clientes } = await api('clientes?todos=true');
      return clientes;
    },
    async sair() {
      await api('clientes', { method: 'DELETE' });
    },
  };

  // ===================================================================
  // PEDIDOS
  // ===================================================================
  const Pedidos = {
    async listar() {
      return api('pedidos');
    },
    async criar(dados) {
      return api('pedidos', { method: 'POST', body: JSON.stringify(dados) });
    },
    async atualizarStatus(id, status) {
      return api('pedidos', { method: 'PUT', body: JSON.stringify({ id, status }) });
    },
    async porCliente(clienteId) {
      const todos = await this.listar();
      return todos.filter((p) => p.cliente_id === Number(clienteId));
    },
    _mesmoDia(dataIso, referencia) {
      const d = new Date(dataIso);
      return (
        d.getFullYear() === referencia.getFullYear() &&
        d.getMonth() === referencia.getMonth() &&
        d.getDate() === referencia.getDate()
      );
    },
    _mesmoMes(dataIso, referencia) {
      const d = new Date(dataIso);
      return d.getFullYear() === referencia.getFullYear() && d.getMonth() === referencia.getMonth();
    },
    async totalVendidoHoje() {
      const hoje = new Date();
      const todos = await this.listar();
      return todos
        .filter((p) => p.status !== 'cancelado' && this._mesmoDia(p.criado_em, hoje))
        .reduce((s, p) => s + Number(p.total), 0);
    },
    async totalVendidoOntem() {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const todos = await this.listar();
      return todos
        .filter((p) => p.status !== 'cancelado' && this._mesmoDia(p.criado_em, ontem))
        .reduce((s, p) => s + Number(p.total), 0);
    },
    async totalVendidoMesAtual() {
      const agora = new Date();
      const todos = await this.listar();
      return todos
        .filter((p) => p.status !== 'cancelado' && this._mesmoMes(p.criado_em, agora))
        .reduce((s, p) => s + Number(p.total), 0);
    },
    async pedidosMesAtual() {
      const agora = new Date();
      const todos = await this.listar();
      return todos.filter((p) => this._mesmoMes(p.criado_em, agora));
    },
  };

  // ===================================================================
  // ADMIN — login via API, sessão em cookie httpOnly
  // ===================================================================
  const Admin = {
    async estaLogado() {
      const { logado } = await api('admin-login');
      return logado;
    },
    async login(usuario, senha) {
      try {
        await api('admin-login', { method: 'POST', body: JSON.stringify({ usuario, senha }) });
        return true;
      } catch {
        return false;
      }
    },
    async logout() {
      await api('admin-login', { method: 'DELETE' });
    },
    async trocarSenha(novoUsuario, novaSenha) {
      await api('admin-senha', { method: 'PUT', body: JSON.stringify({ novoUsuario, novaSenha }) });
    },
  };

  // ===================================================================
  // CARRINHO — continua local (por navegador), não vai para o banco
  // ===================================================================
  function lerLocal(chave, padrao) {
    try {
      const bruto = localStorage.getItem(chave);
      return bruto ? JSON.parse(bruto) : padrao;
    } catch {
      return padrao;
    }
  }
  function salvarLocal(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
  }

  const Carrinho = {
    chave() {
      return 'cda_carrinho';
    },
    obter() {
      return lerLocal(this.chave(), []);
    },
    salvar(itens) {
      salvarLocal(this.chave(), itens);
    },
    adicionar(produtoId, quantidade = 1) {
      const itens = this.obter();
      const existente = itens.find((i) => i.produto_id === produtoId);
      if (existente) {
        existente.quantidade += quantidade;
      } else {
        itens.push({ produto_id: produtoId, quantidade });
      }
      this.salvar(itens);
      return itens;
    },
    atualizarQuantidade(produtoId, quantidade) {
      let itens = this.obter();
      if (quantidade <= 0) {
        itens = itens.filter((i) => i.produto_id !== produtoId);
      } else {
        const item = itens.find((i) => i.produto_id === produtoId);
        if (item) item.quantidade = quantidade;
      }
      this.salvar(itens);
      return itens;
    },
    remover(produtoId) {
      const itens = this.obter().filter((i) => i.produto_id !== produtoId);
      this.salvar(itens);
      return itens;
    },
    limpar() {
      this.salvar([]);
    },
    async detalhado() {
      const itens = this.obter();
      const resultado = [];
      for (const item of itens) {
        const produto = await Produtos.obter(item.produto_id);
        if (!produto) continue;
        const preco = produto.preco_promo ?? produto.preco;
        resultado.push({ ...item, produto, preco_unitario: Number(preco), subtotal: Number(preco) * item.quantidade });
      }
      return resultado;
    },
    async total() {
      const detalhes = await this.detalhado();
      return detalhes.reduce((s, i) => s + i.subtotal, 0);
    },
    quantidadeTotal() {
      return this.obter().reduce((s, i) => s + i.quantidade, 0);
    },
    async gruposDePagamento() {
      const cfg = await Config.obterTodas();
      const itens = await this.detalhado();
      const grupos = {};

      itens.forEach((item) => {
        const mpProprio = (item.produto.mercadopago_link || '').trim();
        const pixProprio = (item.produto.pix_qr_imagem_url || '').trim();
        const temProprio = mpProprio || pixProprio;

        const chaveGrupo = temProprio ? `produto_${item.produto.id}` : 'geral';
        if (!grupos[chaveGrupo]) {
          grupos[chaveGrupo] = {
            ehGeral: !temProprio,
            mercadopago_link: temProprio ? mpProprio : cfg.mercadopago_link || '',
            pix_qr_imagem_url: temProprio ? pixProprio : cfg.pix_qr_imagem_url || '',
            pix_chave: cfg.pix_chave || '',
            itens: [],
            subtotal: 0,
          };
        }
        grupos[chaveGrupo].itens.push(item);
        grupos[chaveGrupo].subtotal += item.subtotal;
      });

      return Object.values(grupos);
    },
  };

  return { Config, Categorias, Produtos, Promocoes, Clientes, Pedidos, Admin, Carrinho };
})();
