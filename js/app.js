import { DB } from './db.js';
import { trilha, efeitos, trilhaSintetica } from './audio.js';
import { ic } from './icones.js';
import { TATICAS, TATICA_PADRAO, slotsDaTatica } from './taticas.js';

/* =========================================================
   Domínio
   ========================================================= */

const POSICOES = [
  { sigla: 'GOL', nome: 'Goleiro', grupo: 'gol' },
  { sigla: 'ZAG', nome: 'Zagueiro', grupo: 'def' },
  { sigla: 'LE', nome: 'Lateral esquerdo', grupo: 'def' },
  { sigla: 'LD', nome: 'Lateral direito', grupo: 'def' },
  { sigla: 'VOL', nome: 'Volante', grupo: 'mei' },
  { sigla: 'MC', nome: 'Meio-campo', grupo: 'mei' },
  { sigla: 'MEI', nome: 'Meia armador', grupo: 'mei' },
  { sigla: 'PE', nome: 'Ponta esquerda', grupo: 'ata' },
  { sigla: 'PD', nome: 'Ponta direita', grupo: 'ata' },
  { sigla: 'ATA', nome: 'Atacante', grupo: 'ata' },
];

const ATRIBUTOS = [
  { chave: 'rit', sigla: 'RIT', nome: 'Ritmo' },
  { chave: 'fin', sigla: 'FIN', nome: 'Finalização' },
  { chave: 'pas', sigla: 'PAS', nome: 'Passe' },
  { chave: 'dri', sigla: 'DRI', nome: 'Drible' },
  { chave: 'def', sigla: 'DEF', nome: 'Defesa' },
  { chave: 'fis', sigla: 'FIS', nome: 'Físico' },
];

// Quanto cada característica pesa na nota, por posição. Somam 1 em cada linha.
// Antes o goleiro tinha 10% de finalização e o zagueiro 10% — distorcia as notas.
const PESOS = {
  GOL: { def: .45, fis: .22, pas: .15, dri: .08, rit: .06, fin: .04 },
  ZAG: { def: .38, fis: .26, pas: .12, rit: .12, dri: .07, fin: .05 },
  LE:  { def: .24, rit: .24, pas: .18, dri: .16, fis: .13, fin: .05 },
  LD:  { def: .24, rit: .24, pas: .18, dri: .16, fis: .13, fin: .05 },
  VOL: { def: .28, pas: .26, fis: .20, dri: .13, rit: .09, fin: .04 },
  MC:  { pas: .30, dri: .22, fis: .13, rit: .13, def: .12, fin: .10 },
  MEI: { pas: .26, dri: .26, fin: .21, rit: .14, fis: .08, def: .05 },
  PE:  { rit: .25, dri: .25, fin: .24, pas: .11, fis: .10, def: .05 },
  PD:  { rit: .25, dri: .25, fin: .24, pas: .11, fis: .10, def: .05 },
  ATA: { fin: .35, rit: .20, dri: .15, fis: .15, pas: .10, def: .05 },
};

const PERFIS = {
  GOL: { rit: 45, fin: 25, pas: 52, dri: 40, def: 78, fis: 72 },
  ZAG: { rit: 58, fin: 35, pas: 55, dri: 45, def: 80, fis: 78 },
  LE:  { rit: 76, fin: 45, pas: 66, dri: 66, def: 70, fis: 66 },
  LD:  { rit: 76, fin: 45, pas: 66, dri: 66, def: 70, fis: 66 },
  VOL: { rit: 65, fin: 50, pas: 72, dri: 62, def: 76, fis: 75 },
  MC:  { rit: 68, fin: 62, pas: 78, dri: 74, def: 60, fis: 65 },
  MEI: { rit: 72, fin: 70, pas: 79, dri: 80, def: 42, fis: 58 },
  PE:  { rit: 85, fin: 70, pas: 68, dri: 82, def: 35, fis: 55 },
  PD:  { rit: 85, fin: 70, pas: 68, dri: 82, def: 35, fis: 55 },
  ATA: { rit: 80, fin: 84, pas: 62, dri: 76, def: 32, fis: 70 },
};

const FUNCOES = [
  'Técnico', 'Auxiliar técnico', 'Preparador físico', 'Treinador de goleiros',
  'Analista de desempenho', 'Médico', 'Massagista',
];

const ORDEM_GRUPOS = ['gol', 'def', 'mei', 'ata'];
const SETORES = [
  { chave: 'gol', nome: 'Gol' },
  { chave: 'def', nome: 'Defesa' },
  { chave: 'mei', nome: 'Meio-campo' },
  { chave: 'ata', nome: 'Ataque' },
];
const grupoDe = (sigla) => POSICOES.find((p) => p.sigla === sigla)?.grupo ?? 'mei';
// GOL, ZAG, LE, LD, VOL, MC, MEI, PE, PD, ATA — a ordem em que POSICOES é declarada
const ordemPosicao = (sigla) => POSICOES.findIndex((p) => p.sigla === sigla);

/* =========================================================
   Estado
   ========================================================= */

const estado = {
  time: null,
  jogadores: [],
  comissao: [],
  aba: 'elenco',
  escalacao: { ...TATICA_PADRAO, slots: {} },
  somLigado: lerPref('som', true),
  // seleção ativa: { tipo: 'slot'|'trilho', slotId?, jogadorId? }
  selecao: null,
};

const $ = (sel) => document.querySelector(sel);

function lerPref(chave, padrao) {
  try {
    const v = localStorage.getItem('elenco:' + chave);
    return v === null ? padrao : JSON.parse(v);
  } catch { return padrao; }
}
function gravarPref(chave, valor) {
  try { localStorage.setItem('elenco:' + chave, JSON.stringify(valor)); } catch { /* modo privado */ }
}

/* =========================================================
   Utilidades
   ========================================================= */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function escapar(txt = '') {
  const d = document.createElement('div');
  d.textContent = txt;
  return d.innerHTML;
}

// Nota do jogador atuando numa posição específica: usa os pesos DAQUELA posição.
// É o que permite dizer que um goleiro no ataque rende menos — porque ali
// cobram finalização e ritmo dele, não defesa.
function notaNaPosicao(j, posicao) {
  const pesos = PESOS[posicao] || PESOS[j.posicao] || {};
  let soma = 0, total = 0;
  for (const { chave } of ATRIBUTOS) {
    const p = pesos[chave] ?? 1 / 6;
    soma += (j[chave] ?? 50) * p;
    total += p;
  }
  const nota = soma / (total || 1);

  // "Defesa" de um jogador de linha é marcação, não defender gol — são ofícios
  // diferentes. Cruzar a fronteira do gol derruba a nota de verdade.
  const goleiro = (pos) => pos === 'GOL';
  if (goleiro(posicao) !== goleiro(j.posicao)) return Math.round(nota * .6);

  return Math.round(nota);
}

// Nota natural — a que aparece na carta, na posição para a qual ele foi criado.
const notaDe = (j) => notaNaPosicao(j, j.posicao);

function tierDe(nota) {
  if (nota >= 85) return 'elite';
  if (nota >= 75) return 'ouro';
  if (nota >= 65) return 'prata';
  return 'bronze';
}

const slotsFormacao = () => slotsDaTatica(estado.escalacao.formacao, estado.escalacao.variacao);
const jogadorPorId = (id) => estado.jogadores.find((j) => j.id === id) || null;
const jogadorNoSlot = (slotId) => jogadorPorId(estado.escalacao.slots[slotId]);
const idsEscalados = () => new Set(Object.values(estado.escalacao.slots).filter(Boolean));

// Força = média das notas NA POSIÇÃO em que cada um foi escalado, não da nota
// natural. Escalar alguém fora de posição custa força de verdade.
function notaTime() {
  const notas = slotsFormacao()
    .map((slot) => { const j = jogadorNoSlot(slot.id); return j ? notaNaPosicao(j, slot.pos) : null; })
    .filter((n) => n !== null);
  if (!notas.length) return null;
  return Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
}

// Sintonia com a tática: posição exata vale 100, mesmo setor 60, setor vizinho 25.
function sintonia() {
  const slots = slotsFormacao();
  let pontos = 0;
  for (const slot of slots) {
    const j = jogadorNoSlot(slot.id);
    if (!j) continue;
    if (j.posicao === slot.pos) pontos += 100;
    else {
      const a = ORDEM_GRUPOS.indexOf(grupoDe(j.posicao));
      const b = ORDEM_GRUPOS.indexOf(grupoDe(slot.pos));
      const dist = Math.abs(a - b);
      pontos += dist === 0 ? 60 : dist === 1 ? 25 : 0;
    }
  }
  return Math.round(pontos / slots.length);
}

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function comprimirImagem(file, max = 480, qualidade = .85) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
        else if (h > max) { w = Math.round(w * max / h); h = max; }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', qualidade));
      };
      img.onerror = reject;
      img.src = leitor.result;
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(file);
  });
}

/* =========================================================
   Carta
   ========================================================= */

// apelidos compridos diminuem a fonte para caber inteiros na carta
// Campinho reutilizável: serve de prévia da tática e de seletor de posição.
function miniCampoHTML(conteudo, classe = '') {
  return `<div class="mini-campo ${classe}">
      <i class="meio"></i><i class="circulo"></i>
      <i class="area area-cima"></i><i class="area area-baixo"></i>
      ${conteudo}
    </div>`;
}

// apelidos compridos diminuem a fonte para caber inteiros na carta
function classeNome(apelido = '') {
  if (apelido.length > 12) return ' nome-xg';
  if (apelido.length > 9) return ' nome-g';
  return '';
}

function cartaHTML(j, detalhada = false, foraDePosicao = false) {
  const nota = notaDe(j);
  const foto = j.foto
    ? `<img src="${j.foto}" alt="">`
    : ic.pessoa;
  const stats = ATRIBUTOS
    .map((a) => `<div><b>${j[a.chave] ?? 50}</b><i>${a.sigla}</i></div>`)
    .join('');

  return `
    <div class="carta ${tierDe(nota)}${detalhada ? ' detalhada' : ''}${foraDePosicao ? ' fora-de-posicao' : ''}" data-jogador="${j.id}">
      <div class="carta-corpo">
        <span class="carta-nota"><b>${nota}</b><span>${j.posicao}</span></span>
        ${foraDePosicao ? '<span class="aviso-posicao" title="Fora de posição">!</span>' : ''}
        <span class="carta-foto">${foto}</span>
      </div>
      <div class="carta-nome${classeNome(j.apelido)}">${escapar(j.apelido)}</div>
      <div class="carta-stats">${stats}</div>
    </div>`;
}

// Credencial da comissão — retângulo com foto e função, deliberadamente
// diferente da carta chanfrada dos jogadores.
function credencialHTML(m) {
  const foto = m.foto ? `<img src="${m.foto}" alt="">` : ic.pessoa;
  return `
    <div class="credencial" data-membro="${m.id}">
      <span class="credencial-fita"></span>
      <span class="credencial-foto">${foto}</span>
      <b class="credencial-nome">${escapar(m.nome)}</b>
      <span class="credencial-funcao">${escapar(m.funcao)}</span>
    </div>`;
}

const cartaVaziaHTML = () =>
  `<div class="carta vazia"><span class="carta-vazia-interna"><span>${ic.mais}</span></span></div>`;

/* =========================================================
   Animação (FLIP: mede antes, mede depois, anima a diferença)
   ========================================================= */

const menosMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// O mesmo jogador aparece duas vezes na tela (em campo e no elenco), então a
// posição precisa ser guardada por contexto — senão a carta do campo tentaria
// voar a partir da carta do elenco, que fica longe e às vezes fora da tela.
const chaveCarta = (carta) =>
  (carta.closest('.slot') ? 'campo:' : 'elenco:') + carta.dataset.jogador;

// Onde cada carta está agora, antes de mexer no estado.
function capturarCartas() {
  if (menosMovimento()) return null;
  const mapa = new Map();
  for (const c of document.querySelectorAll('.carta[data-jogador]')) {
    mapa.set(chaveCarta(c), c.getBoundingClientRect());
  }
  return mapa;
}

// Depois de redesenhar, faz cada carta "voar" da posição antiga para a nova.
function animarTransicao(mapa, { destaque, apenas, troca } = {}) {
  if (!mapa) return;
  // 'apenas' limita a animação a quem realmente mudou de lugar —
  // sem isso o time inteiro parece se mexer numa troca simples.
  const envolvidos = apenas ? new Set(apenas.filter(Boolean)) : null;

  for (const carta of document.querySelectorAll('.carta[data-jogador]')) {
    if (envolvidos && !envolvidos.has(carta.dataset.jogador)) continue;

    // sem posição no mesmo contexto, aceita a do outro (ex.: reserva que entra
    // em campo voa a partir da carta dele no elenco)
    const antes = mapa.get(chaveCarta(carta))
      ?? mapa.get((carta.closest('.slot') ? 'elenco:' : 'campo:') + carta.dataset.jogador);
    if (!antes) { entrarCarta(carta); continue; }

    const agora = carta.getBoundingClientRect();
    const dx = antes.left - agora.left;
    const dy = antes.top - agora.top;
    const escala = agora.width ? antes.width / agora.width : 1;
    if (Math.hypot(dx, dy) < 2 && Math.abs(escala - 1) < .03) continue;

    const pai = carta.closest('.slot, .item-trilho');
    if (pai) pai.style.zIndex = '40';

    const anim = carta.animate(quadrosDoVoo(dx, dy, escala, troca), {
      duration: troca ? 540 : 440,
      easing: 'cubic-bezier(.34, .05, .2, 1)',
    });

    anim.finished.catch(() => {}).then(() => { if (pai) pai.style.zIndex = ''; });
  }

  if (destaque) {
    const alvo = document.querySelector(`.slot[data-slot="${destaque}"]`);
    if (alvo) {
      alvo.classList.remove('aterrissou');
      void alvo.offsetWidth;
      alvo.classList.add('aterrissou');
      setTimeout(() => alvo.classList.remove('aterrissou'), 700);
    }
  }
}

// Numa troca as cartas saem pela perpendicular do trajeto. Como os vetores
// das duas são opostos, elas contornam uma pela outra em vez de se atravessarem.
function quadrosDoVoo(dx, dy, escala, troca) {
  const inicio = { transform: `translate(${dx}px, ${dy}px) scale(${escala})` };
  const fim = { transform: 'translate(0, 0) scale(1)' };

  const dist = Math.hypot(dx, dy);
  if (!troca || dist < 12) {
    return [inicio, { transform: `translate(${dx * .4}px, ${dy * .4}px) scale(1.1)`, offset: .5 }, fim];
  }

  const arco = Math.min(34, dist * .3);
  const meioX = dx / 2 + (-dy / dist) * arco;
  const meioY = dy / 2 + (dx / dist) * arco;

  return [
    inicio,
    { transform: `translate(${meioX}px, ${meioY}px) scale(1.16)`, offset: .5 },
    fim,
  ];
}

// carta nova (acabou de ser criada) entra crescendo
function entrarCarta(carta) {
  carta.animate([
    { transform: 'scale(.7)', opacity: 0 },
    { transform: 'scale(1)', opacity: 1 },
  ], { duration: 320, easing: 'cubic-bezier(.2, .9, .3, 1)' });
}

function pulsar(el) {
  if (menosMovimento()) return;
  el.classList.remove('pulso');
  void el.offsetWidth;
  el.classList.add('pulso');
}

/* =========================================================
   Renderização
   ========================================================= */

function renderTudo() {
  renderTopo();
  renderBarraTatica();
  renderCampo();
  renderElenco();
}

function renderTopo() {
  const t = estado.time;
  $('#topo-escudo').innerHTML = t?.escudo ? `<img src="${t.escudo}" alt="Escudo">` : ic.escudo;
  $('#topo-nome').textContent = t?.nome || 'Meu Time';

  const escalados = idsEscalados().size;
  $('#topo-sub').textContent = t
    ? `${estado.jogadores.length} ${estado.jogadores.length === 1 ? 'jogador' : 'jogadores'} · ${escalados}/11 em campo`
    : 'Toque para dar nome e escudo';

  const btnSom = $('#btn-som');
  btnSom.innerHTML = estado.somLigado ? ic.som : ic.semSom;
  btnSom.classList.toggle('ativo', estado.somLigado && (trilha.tocando || trilhaSintetica.tocando));
  btnSom.setAttribute('aria-label', estado.somLigado ? 'Desligar trilha sonora' : 'Ligar trilha sonora');
}

function renderBarraTatica() {
  $('#tatica-nome').textContent = estado.escalacao.formacao;
  $('#tatica-variacao').textContent = estado.escalacao.variacao;

  const escalados = idsEscalados().size;
  const forca = String(notaTime() ?? '--');
  const sint = escalados ? sintonia() + '%' : '--';

  const elForca = $('#valor-forca');
  const elSintonia = $('#valor-encaixe');
  if (elForca.textContent !== forca) { elForca.textContent = forca; pulsar(elForca); }
  if (elSintonia.textContent !== sint) { elSintonia.textContent = sint; pulsar(elSintonia); }
}

function renderCampo() {
  const alvo = $('#slots');
  alvo.innerHTML = '';

  const escudoCampo = $('#escudo-campo');
  if (estado.time?.escudo) escudoCampo.setAttribute('href', estado.time.escudo);
  else escudoCampo.removeAttribute('href');

  const sel = estado.selecao;

  for (const slot of slotsFormacao()) {
    const j = jogadorNoSlot(slot.id);
    const fora = j && j.posicao !== slot.pos;
    const selecionado = sel?.tipo === 'slot' && sel.slotId === slot.id;
    // com algo selecionado, os demais slots viram destino possível
    const destino = !!sel && !selecionado;

    const el = document.createElement('div');
    el.className = 'slot'
      + (selecionado ? ' selecionado' : '')
      + (destino ? ' destino' : '');
    el.dataset.slot = slot.id;
    el.style.left = slot.x + '%';
    el.style.top = slot.y + '%';
    el.style.setProperty('--escala', (0.86 + slot.y / 100 * 0.18).toFixed(3));

    el.innerHTML = (j ? cartaHTML(j, false, fora) : cartaVaziaHTML())
      + `<span class="pilula ${fora ? 'fora' : ''}">${slot.pos}</span>`
      + (selecionado && j ? acoesCartaHTML(slot.x > 55) : '');

    tornarInterativo(el, {
      tipo: 'slot',
      slotId: slot.id,
      jogadorId: j?.id || null,
      aoTocar: () => aoTocarSlot(slot),
    });

    if (selecionado && j) ligarAcoesCarta(el, { jogador: j, slotId: slot.id });

    alvo.appendChild(el);
  }

  renderVazioCampo();
  renderBarraTatica();
}

// Barrinha de ações presa na borda da carta (padrão do squad builder de referência).
function acoesCartaHTML(paraEsquerda) {
  return `
    <div class="acoes-carta ${paraEsquerda ? 'esquerda' : ''}">
      <button data-acao="editar" aria-label="Editar jogador">${ic.lapis}</button>
      <button data-acao="tirar" aria-label="Tirar do time">${ic.fechar}</button>
    </div>`;
}

function acoesCartaTrilhoHTML() {
  return `
    <div class="acoes-carta">
      <button data-acao="escalar" aria-label="Escalar em campo">${ic.campo}</button>
      <button data-acao="editar" aria-label="Editar jogador">${ic.lapis}</button>
      <button data-acao="excluir" aria-label="Excluir do elenco">${ic.lixeira}</button>
    </div>`;
}

function ligarAcoesCarta(el, { jogador, slotId }) {
  el.querySelectorAll('.acoes-carta button').forEach((btn) => {
    // impede que o toque no botão vire seleção/arrasto da carta
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const acao = btn.dataset.acao;
      if (acao === 'editar') { limparSelecao(); folhaJogador(jogador); }
      else if (acao === 'tirar') { limparSelecao(); await tirarDoTime(slotId); }
      else if (acao === 'excluir') { limparSelecao(); excluirJogador(jogador); }
      else if (acao === 'escalar') { limparSelecao(); await escalarAutomatico(jogador); }
    });
  });
}

/* ---------- seleção: trocar jogador em dois toques ---------- */

function limparSelecao() {
  if (!estado.selecao) return;
  estado.selecao = null;
  renderCampo();
  renderElenco();
}

async function aoTocarSlot(slot) {
  const sel = estado.selecao;
  const j = jogadorNoSlot(slot.id);

  if (sel) {
    if (sel.tipo === 'slot' && sel.slotId === slot.id) return limparSelecao();
    if (sel.tipo === 'slot') {                 // troca entre duas posições
      const idOrigem = estado.escalacao.slots[sel.slotId];
      estado.selecao = null;
      if (idOrigem) await escalar(slot.id, idOrigem);
      else if (j) await escalar(sel.slotId, j.id);
      renderElenco();
      return;
    }
    if (sel.tipo === 'trilho') {               // reserva entra na posição
      const id = sel.jogadorId;
      estado.selecao = null;
      await escalar(slot.id, id);
      return;
    }
  }

  if (!j && !estado.jogadores.length) return toast('Crie um jogador antes de escalar');
  estado.selecao = { tipo: 'slot', slotId: slot.id, jogadorId: j?.id || null };
  efeitos.tocar('toque');
  renderCampo();
  renderElenco();
}

async function aoTocarTrilho(j) {
  const sel = estado.selecao;

  if (sel?.tipo === 'slot') {                  // já havia uma posição escolhida
    const slotId = sel.slotId;
    estado.selecao = null;
    await escalar(slotId, j.id);
    return;
  }
  if (sel?.tipo === 'trilho' && sel.jogadorId === j.id) return limparSelecao();

  estado.selecao = { tipo: 'trilho', jogadorId: j.id };
  efeitos.tocar('toque');
  renderCampo();
  renderElenco();
}

function renderVazioCampo() {
  document.querySelector('.vazio-campo')?.remove();
  if (estado.jogadores.length) return;

  const semTime = !estado.time;
  const el = document.createElement('div');
  el.className = 'vazio-campo';
  el.innerHTML = `
    <h3>${semTime ? 'Comece pelo seu time' : 'Monte seu elenco'}</h3>
    <p>${semTime
      ? 'Defina o nome e o escudo. Depois crie seus jogadores e escale o time em campo.'
      : 'Cada jogador tem foto, posição e seis características. Crie o primeiro e escale em campo.'}</p>
    <button class="btn btn-acento" id="btn-comecar">${semTime ? 'Configurar time' : 'Criar jogador'}</button>`;
  $('#gramado').appendChild(el);
  el.querySelector('#btn-comecar').onclick = () => semTime ? folhaTime() : folhaJogador(null);
}

function cartaNovoJogador() {
  const el = document.createElement('button');
  el.className = 'carta-nova';
  el.id = 'btn-novo';
  el.innerHTML = `<span class="carta-nova-interna">
      <span class="aro">${ic.mais}</span>
      <b>Criar<br>jogador</b>
    </span>`;
  el.onclick = () => { limparSelecao(); folhaJogador(null); };
  return el;
}

function renderElenco() {
  const trilho = $('#trilho');
  $('#qtd-elenco').textContent = estado.jogadores.length;
  $('#qtd-comissao').textContent = estado.comissao.length;
  $('#abas').querySelectorAll('.aba').forEach((b) =>
    b.classList.toggle('ativa', b.dataset.aba === estado.aba));

  trilho.innerHTML = '';
  trilho.classList.toggle('escolhendo', estado.aba === 'elenco' && estado.selecao?.tipo === 'slot');

  if (estado.aba === 'comissao') return renderComissao(trilho);

  trilho.appendChild(cartaNovoJogador());

  if (!estado.jogadores.length) {
    const aviso = document.createElement('div');
    aviso.className = 'trilho-vazio';
    aviso.innerHTML = 'Seu elenco está vazio.<br>Crie jogadores para escalar em campo.';
    trilho.appendChild(aviso);
    return;
  }

  const escalados = idsEscalados();
  const sel = estado.selecao;

  // Ordem do vestiário: goleiro, defensores, volantes, meias, pontas, atacantes.
  // Dentro da mesma posição, o de maior nota primeiro.
  const ordenados = [...estado.jogadores].sort((a, b) =>
    ordemPosicao(a.posicao) - ordemPosicao(b.posicao) || notaDe(b) - notaDe(a));

  for (const j of ordenados) {
    const emCampo = escalados.has(j.id);
    const selecionado = !emCampo && sel?.tipo === 'trilho' && sel.jogadorId === j.id;

    const el = document.createElement('div');
    el.className = 'item-trilho'
      + (emCampo ? ' escalado' : '')
      + (selecionado ? ' selecionado' : '');
    el.dataset.jogador = j.id;
    el.innerHTML = cartaHTML(j) + (selecionado ? acoesCartaTrilhoHTML() : '');

    if (emCampo) {
      el.addEventListener('click', () => toast(`${j.apelido} já está em campo`));
    } else {
      tornarInterativo(el, { tipo: 'trilho', jogadorId: j.id, aoTocar: () => aoTocarTrilho(j) });
      if (selecionado) ligarAcoesCarta(el, { jogador: j });
    }

    trilho.appendChild(el);
  }
}

function renderComissao(trilho) {
  const novo = document.createElement('button');
  novo.className = 'carta-nova comissao';
  novo.innerHTML = `<span class="carta-nova-interna">
      <span class="aro">${ic.mais}</span>
      <b>Novo<br>membro</b>
    </span>`;
  novo.onclick = () => { limparSelecao(); folhaMembro(null); };
  trilho.appendChild(novo);

  if (!estado.comissao.length) {
    const aviso = document.createElement('div');
    aviso.className = 'trilho-vazio';
    aviso.innerHTML = 'Sem comissão técnica ainda.<br>Adicione o técnico e a equipe.';
    trilho.appendChild(aviso);
    return;
  }

  const ordem = (m) => {
    const i = FUNCOES.indexOf(m.funcao);
    return i < 0 ? FUNCOES.length : i;
  };
  for (const m of [...estado.comissao].sort((a, b) => ordem(a) - ordem(b))) {
    const el = document.createElement('div');
    el.className = 'item-comissao';
    el.innerHTML = credencialHTML(m);
    el.onclick = () => folhaMembro(m);
    trilho.appendChild(el);
  }
}

/* =========================================================
   Arrastar e soltar (pointer events — funciona no toque e no mouse)
   ========================================================= */

let arrasto = null;

function tornarInterativo(el, dados) {
  el.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (!dados.jogadorId && dados.tipo === 'slot') { // slot vazio: só toque
      const aoSoltarVazio = () => { dados.aoTocar(); limpar(); };
      const limpar = () => {
        window.removeEventListener('pointerup', aoSoltarVazio);
        window.removeEventListener('pointercancel', limpar);
      };
      window.addEventListener('pointerup', aoSoltarVazio, { once: true });
      window.addEventListener('pointercancel', limpar, { once: true });
      return;
    }

    const x0 = ev.clientX, y0 = ev.clientY;
    let ativo = false, desistiu = false;
    const arrastaAoMover = dados.tipo === 'slot';

    const timer = setTimeout(() => { if (!desistiu) comecar(x0, y0); }, 200);

    function comecar(x, y) {
      ativo = true;
      el.classList.add('arrastando');
      navigator.vibrate?.(8);
      criarFantasma(dados.jogadorId, x, y);
    }

    function aoMover(e) {
      if (!ativo) {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) {
          clearTimeout(timer);
          if (arrastaAoMover) comecar(e.clientX, e.clientY);
          else { desistiu = true; limpar(); } // no trilho, deixa rolar
        }
        return;
      }
      e.preventDefault();
      moverFantasma(e.clientX, e.clientY);
      destacarAlvo(e.clientX, e.clientY);
    }

    function aoSoltar(e) {
      clearTimeout(timer);
      const arrastou = ativo;
      if (ativo) soltar(e.clientX, e.clientY, dados);
      limpar();
      if (!arrastou && !desistiu) dados.aoTocar();
    }

    function limpar() {
      ativo = false;
      el.classList.remove('arrastando');
      removerFantasma();
      document.querySelectorAll('.slot.alvo').forEach((s) => s.classList.remove('alvo'));
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
      window.removeEventListener('pointercancel', limpar);
    }

    window.addEventListener('pointermove', aoMover, { passive: false });
    window.addEventListener('pointerup', aoSoltar);
    window.addEventListener('pointercancel', limpar);
  });
}

function criarFantasma(jogadorId, x, y) {
  const j = jogadorPorId(jogadorId);
  if (!j) return;
  const el = document.createElement('div');
  el.className = 'fantasma';
  el.innerHTML = cartaHTML(j);
  $('#camada-arrasto').appendChild(el);
  arrasto = { el, jogadorId };
  moverFantasma(x, y);
}

function moverFantasma(x, y) {
  if (!arrasto) return;
  arrasto.el.style.left = x + 'px';
  arrasto.el.style.top = y + 'px';
}

function removerFantasma() {
  arrasto?.el.remove();
  arrasto = null;
}

function destacarAlvo(x, y) {
  document.querySelectorAll('.slot.alvo').forEach((s) => s.classList.remove('alvo'));
  const slot = document.elementFromPoint(x, y)?.closest('.slot');
  slot?.classList.add('alvo');
}

function soltar(x, y, dados) {
  const destino = document.elementFromPoint(x, y)?.closest('.slot');
  if (destino) {
    escalar(destino.dataset.slot, dados.jogadorId);
  } else if (dados.tipo === 'slot') {
    tirarDoTime(dados.slotId);
  }
}

/* =========================================================
   Ações de escalação
   ========================================================= */

async function escalar(slotId, jogadorId) {
  const posicoesAntes = capturarCartas();
  const slots = estado.escalacao.slots;
  const anterior = slots[slotId] || null;
  const slotDeOrigem = Object.keys(slots).find((s) => slots[s] === jogadorId);

  if (slotDeOrigem === slotId) return;

  if (slotDeOrigem) slots[slotDeOrigem] = anterior; // troca de lugar
  else if (anterior) delete slots[slotId];

  slots[slotId] = jogadorId;
  Object.keys(slots).forEach((k) => { if (!slots[k]) delete slots[k]; });

  await DB.salvarEscalacao(estado.escalacao);
  renderTudo();
  animarTransicao(posicoesAntes, { destaque: slotId, apenas: [jogadorId, anterior], troca: !!anterior });
  efeitos.tocar('pouso');
}

async function tirarDoTime(slotId) {
  const antes = capturarCartas();
  const saindo = estado.escalacao.slots[slotId];
  delete estado.escalacao.slots[slotId];
  await DB.salvarEscalacao(estado.escalacao);
  renderTudo();
  animarTransicao(antes, { apenas: [saindo] });
  efeitos.tocar('tirar');
}

async function escalarAutomatico(jogador) {
  const slots = slotsFormacao();
  const vazio = slots.find((s) => s.pos === jogador.posicao && !estado.escalacao.slots[s.id])
    || slots.find((s) => grupoDe(s.pos) === grupoDe(jogador.posicao) && !estado.escalacao.slots[s.id])
    || slots.find((s) => !estado.escalacao.slots[s.id]);
  if (!vazio) { toast('Os 11 já estão em campo. Tire alguém antes.'); return; }
  await escalar(vazio.id, jogador.id);
  toast(`${jogador.apelido} escalado como ${vazio.pos}`);
}

async function trocarTatica(formacao, variacao) {
  // Reencaixa os titulares na tática nova pela posição natural de cada um,
  // para a escalação continuar coerente (e a troca ser reversível).
  const escalados = slotsFormacao()
    .map((slot) => estado.escalacao.slots[slot.id])
    .filter(Boolean)
    .map(jogadorPorId)
    .filter(Boolean);

  const destino = slotsDaTatica(formacao, variacao);
  const novos = {};
  const pendentes = [...escalados];

  const encaixar = (criterio) => {
    for (const slot of destino) {
      if (novos[slot.id]) continue;
      const i = pendentes.findIndex((j) => criterio(j, slot));
      if (i >= 0) novos[slot.id] = pendentes.splice(i, 1)[0].id;
    }
  };

  encaixar((j, slot) => j.posicao === slot.pos);                     // posição exata
  encaixar((j, slot) => grupoDe(j.posicao) === grupoDe(slot.pos));   // mesmo setor
  encaixar(() => true);                                              // o que sobrar

  const antes = capturarCartas();
  estado.escalacao = { formacao, variacao, slots: novos };
  await DB.salvarEscalacao(estado.escalacao);
  renderTudo();
  animarTransicao(antes);
  efeitos.tocar('tatica');
}

/* =========================================================
   Folha (painel deslizante)
   ========================================================= */

const folha = $('#folha');
const folhaFundo = $('#folha-fundo');

function abrirFolha({ titulo, corpo, rodape = '', aoMontar }) {
  $('#folha-titulo').textContent = titulo;
  $('#folha-corpo').innerHTML = corpo;
  $('#folha-rodape').innerHTML = rodape;
  folha.style.transform = '';
  folha.classList.add('aberta');
  efeitos.tocar('abrir');
  folhaFundo.classList.add('aberta');
  $('#folha-corpo').scrollTop = 0;
  aoMontar?.();
}

function fecharFolha() {
  if (folha.classList.contains('aberta')) efeitos.tocar('fechar');
  folha.classList.remove('aberta');
  folhaFundo.classList.remove('aberta');
  folha.style.transform = '';
}

$('#folha-fechar').innerHTML = ic.fechar;
folhaFundo.addEventListener('click', fecharFolha);
$('#folha-fechar').addEventListener('click', fecharFolha);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fecharFolha(); limparSelecao(); } });

// arrastar a alça para fechar
(() => {
  const alca = $('#folha-alca');
  let y0 = 0, arrastando = false;
  alca.addEventListener('pointerdown', (e) => {
    y0 = e.clientY; arrastando = true;
    folha.classList.add('arrastando');
    alca.setPointerCapture(e.pointerId);
  });
  alca.addEventListener('pointermove', (e) => {
    if (!arrastando) return;
    const dy = Math.max(0, e.clientY - y0);
    folha.style.transform = `translate(-50%, ${dy}px)`;
  });
  alca.addEventListener('pointerup', (e) => {
    if (!arrastando) return;
    arrastando = false;
    folha.classList.remove('arrastando');
    (e.clientY - y0 > 90) ? fecharFolha() : (folha.style.transform = '');
  });
})();

/* =========================================================
   Folhas específicas
   ========================================================= */

function folhaTime() {
  const t = estado.time || { nome: '', escudo: '' };
  let escudo = t.escudo;

  abrirFolha({
    titulo: estado.time ? 'Seu clube' : 'Criar clube',
    corpo: `
      <div class="cena-time">
        <label class="escudo-grande ${escudo ? 'tem-img' : ''}" id="up-escudo">
          ${escudo ? `<img src="${escudo}" alt="">` : `${ic.escudo}<span>Enviar escudo</span>`}
          <span class="troca-escudo" data-manter>${ic.camera}</span>
          <input type="file" accept="image/*" id="in-escudo">
        </label>

        <input class="entrada entrada-titulo" id="in-nome-time" maxlength="26"
               placeholder="NOME DO CLUBE" value="${escapar(t.nome)}">

        <p class="ajuda" style="text-align:center;max-width:280px">
          O escudo aparece no topo do app e pintado no círculo central do gramado.
        </p>
      </div>`,
    rodape: `<button class="btn btn-acento btn-largo" id="salvar-time">Salvar clube</button>`,
    aoMontar: () => {
      ligarUpload('#in-escudo', '#up-escudo', 420, (d) => escudo = d);
      $('#salvar-time').onclick = async () => {
        const nome = $('#in-nome-time').value.trim();
        if (!nome) return toast('O clube precisa de um nome');
        estado.time = { nome, escudo };
        await DB.salvarTime(estado.time);
        fecharFolha();
        renderTudo();
        efeitos.tocar('guardar');
        toast('Clube salvo');
      };
    },
  });
}

/* ---------- Comissão técnica ---------- */

function folhaMembro(existente) {
  const novo = !existente;
  const base = existente || { nome: '', funcao: FUNCOES[0], foto: '' };
  let foto = base.foto || '';

  abrirFolha({
    titulo: novo ? 'Novo membro' : 'Comissão',
    corpo: `
      <div class="palco-credencial" id="previa-membro"></div>

      <div class="linha-2" style="align-items:start">
        <div class="campo">
          <label>Foto</label>
          <label class="upload ${foto ? 'tem-img' : ''}" id="up-foto-membro" style="height:112px;min-height:0">
            ${foto ? `<img src="${foto}" alt="">` : `${ic.camera}<span>Enviar</span>`}
            <input type="file" accept="image/*" id="in-foto-membro">
          </label>
        </div>
        <div class="campo">
          <label>Nome</label>
          <input class="entrada" id="in-nome-membro" maxlength="18"
                 placeholder="Ex.: Seu Zé" value="${escapar(base.nome)}">
        </div>
      </div>

      <div class="campo">
        <label>Função</label>
        <div class="chips" id="chips-funcao">
          ${FUNCOES.map((f) => `
            <button class="chip-funcao ${f === base.funcao ? 'ativa' : ''}" data-funcao="${f}">${f}</button>`).join('')}
        </div>
      </div>`,
    rodape: `
      ${novo ? '' : `<button class="btn btn-perigo" id="excluir-membro">${ic.lixeira}</button>`}
      <button class="btn btn-acento" id="salvar-membro">Salvar membro</button>`,
    aoMontar: () => {
      const lerFormulario = () => ({
        nome: $('#in-nome-membro').value.trim() || 'Sem nome',
        funcao: $('#chips-funcao .ativa').dataset.funcao,
        foto,
      });
      const atualizar = () => { $('#previa-membro').innerHTML = credencialHTML(lerFormulario()); };
      atualizar();

      $('#in-nome-membro').addEventListener('input', atualizar);
      $('#chips-funcao').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip-funcao');
        if (!chip) return;
        $('#chips-funcao .ativa')?.classList.remove('ativa');
        chip.classList.add('ativa');
        efeitos.tocar('toque');
        atualizar();
      });
      ligarUpload('#in-foto-membro', '#up-foto-membro', 420, (d) => { foto = d; atualizar(); });

      $('#salvar-membro').onclick = async () => {
        if (!$('#in-nome-membro').value.trim()) return toast('O membro precisa de um nome');
        const registro = { id: existente?.id || uid(), ...lerFormulario() };
        await DB.salvarMembro(registro);
        const i = estado.comissao.findIndex((m) => m.id === registro.id);
        i >= 0 ? estado.comissao[i] = registro : estado.comissao.push(registro);
        fecharFolha();
        renderElenco();
        efeitos.tocar('guardar');
        toast(novo ? `${registro.nome} entrou na comissão` : `${registro.nome} atualizado`);
      };

      $('#excluir-membro')?.addEventListener('click', async () => {
        const ok = await confirmar({
          titulo: `Excluir ${existente.nome}?`,
          texto: 'O membro sai da comissão técnica. Não dá para desfazer.',
          acao: 'Excluir membro',
        });
        if (!ok) return;
        await DB.removerMembro(existente.id);
        estado.comissao = estado.comissao.filter((m) => m.id !== existente.id);
        fecharFolha();
        renderElenco();
        efeitos.tocar('excluir');
        toast(`${existente.nome} saiu da comissão`);
      });
    },
  });
}

/* ---------- Tática ---------- */

function folhaTatica() {
  const atual = estado.escalacao;

  const opcoes = Object.entries(TATICAS).flatMap(([formacao, dados]) =>
    Object.keys(dados.variacoes).map((variacao) => {
      const pontos = slotsDaTatica(formacao, variacao)
        .map((slot) => `<b style="left:${slot.x}%;top:${slot.y}%"></b>`).join('');
      const ativa = formacao === atual.formacao && variacao === atual.variacao;
      return `<button class="opcao-tatica ${ativa ? 'ativa' : ''}"
                data-formacao="${formacao}" data-variacao="${variacao}">
          ${miniCampoHTML(pontos)}
          <b>${formacao}</b>
          <small>${variacao}</small>
        </button>`;
    })
  ).join('');

  abrirFolha({
    titulo: 'Escolher tática',
    corpo: `
      <p class="ajuda" style="margin:0 0 18px">
        Toque no desenho que combina com seu time. Os titulares são reencaixados
        automaticamente pela posição de cada um.
      </p>
      <div class="grade-taticas">${opcoes}</div>`,
    aoMontar: () => {
      $('#folha-corpo').querySelectorAll('.opcao-tatica').forEach((b) => {
        b.onclick = async () => {
          fecharFolha();
          await trocarTatica(b.dataset.formacao, b.dataset.variacao);
          toast(`${b.dataset.formacao} · ${b.dataset.variacao}`);
        };
      });
    },
  });
}

/* ---------- Força: o quanto o time é forte ---------- */

function dadosDoTime() {
  const slots = slotsFormacao();
  const dupla = slots.map((slot) => ({ slot, j: jogadorNoSlot(slot.id) }));
  const escalados = dupla.filter((d) => d.j);
  return { slots, dupla, escalados, vazios: slots.length - escalados.length };
}

const mediaDe = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

function barraHTML(rotulo, valor) {
  return `
    <div class="medida">
      <div class="medida-topo"><span>${rotulo}</span><b>${valor ?? '--'}</b></div>
      <div class="medida-trilho"><i style="width:${valor ?? 0}%"></i></div>
    </div>`;
}

function folhaForca() {
  const { escalados, vazios } = dadosDoTime();
  const porSetor = { def: [], mei: [], ata: [] };
  for (const { slot, j } of escalados) {
    const g = grupoDe(slot.pos);
    porSetor[g === 'gol' ? 'def' : g].push(notaNaPosicao(j, slot.pos));
  }

  // quem perde nota por estar fora da posição natural
  const perdas = escalados
    .map((d) => ({ ...d, natural: notaDe(d.j), efetiva: notaNaPosicao(d.j, d.slot.pos) }))
    .filter((d) => d.efetiva < d.natural)
    .sort((a, b) => (a.efetiva - a.natural) - (b.efetiva - b.natural));

  const ordenados = [...escalados]
    .map((d) => ({ ...d, nota: notaNaPosicao(d.j, d.slot.pos) }))
    .sort((a, b) => b.nota - a.nota);
  const craque = ordenados[0];
  const fraco = ordenados[ordenados.length - 1];

  abrirFolha({
    titulo: 'Força do time',
    corpo: `
      <div class="destaque">
        <div class="destaque-num">${notaTime() ?? '--'}</div>
        <div>
          <b>Média dos titulares em campo</b>
          <p>A nota de cada um é calculada com os pesos da posição <b>em que ele está
             jogando</b>. Um zagueiro vale pela defesa e pelo físico; um atacante,
             pela finalização e pelo ritmo. Por isso quem joga fora da posição rende menos.</p>
        </div>
      </div>

      <div class="titulo-bloco">Por setor</div>
      ${barraHTML('Defesa', mediaDe(porSetor.def))}
      ${barraHTML('Meio-campo', mediaDe(porSetor.mei))}
      ${barraHTML('Ataque', mediaDe(porSetor.ata))}

      ${craque ? `
        <div class="titulo-bloco">Destaques</div>
        <div class="linha-info"><span>Melhor em campo</span><b>${escapar(craque.j.apelido)} · ${craque.nota}</b></div>
        <div class="linha-info"><span>Rendendo menos</span><b>${escapar(fraco.j.apelido)} · ${fraco.nota}</b></div>` : ''}

      ${perdas.length ? `
        <div class="titulo-bloco">Perdendo nota fora da posição</div>
        ${perdas.map((d) => `
          <div class="linha-info">
            <span>${escapar(d.j.apelido)} <i class="mini-tag">${d.j.posicao} → ${d.slot.pos}</i></span>
            <b class="queda">${d.natural} → ${d.efetiva}</b>
          </div>`).join('')}` : ''}

      ${vazios ? `<p class="ajuda" style="margin-top:16px">Faltam ${vazios} ${vazios === 1 ? 'posição' : 'posições'} para completar o time.</p>` : ''}
      <div style="height:10px"></div>`,
  });
}

/* ---------- Sintonia: o quanto cada um joga onde deve ---------- */

function folhaSintonia() {
  const { slots, escalados } = dadosDoTime();
  const valor = escalados.length ? sintonia() : 0;
  const noLugar = escalados.filter((d) => d.j.posicao === d.slot.pos);
  const mesmoSetor = escalados.filter((d) => d.j.posicao !== d.slot.pos && grupoDe(d.j.posicao) === grupoDe(d.slot.pos));
  const trocados = escalados.filter((d) => grupoDe(d.j.posicao) !== grupoDe(d.slot.pos));

  const listaHTML = (itens, titulo, classe) => itens.length ? `
    <div class="lista-alerta ${classe}">
      <b>${titulo}</b>
      ${itens.map((d) => `
        <div class="linha-alerta">
          <span>${escapar(d.j.apelido)}</span>
          <span class="de-para">${d.j.posicao} <i>→</i> ${d.slot.pos}</span>
        </div>`).join('')}
    </div>` : '';

  abrirFolha({
    titulo: 'Sintonia',
    corpo: `
      <div class="destaque">
        <div class="destaque-num pct ${valor >= 80 ? 'bom' : valor >= 50 ? 'medio' : 'ruim'}">${valor}%</div>
        <div>
          <b>${noLugar.length} de ${slots.length} na posição ideal</b>
          <p>Mede se cada um está jogando onde foi criado para jogar.
             Posição exata vale 100%, uma posição do mesmo setor vale 60%,
             e de setor vizinho vale 25%.</p>
        </div>
      </div>

      ${listaHTML(mesmoSetor, 'Improvisados no mesmo setor', 'brando')}
      ${listaHTML(trocados, 'Fora do setor', '')}

      ${!mesmoSetor.length && !trocados.length && escalados.length === slots.length
        ? `<div class="dica-bloco bom">Time inteiro na posição certa. Sintonia máxima.</div>`
        : `<p class="ajuda" style="margin-top:16px">Toque num jogador em campo e depois num reserva para trocar.</p>`}
      <div style="height:10px"></div>`,
  });
}

function ligarUpload(seletorInput, seletorCaixa, tamanho, aoTer) {
  $(seletorInput).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await comprimirImagem(file, tamanho);
    aoTer(dataUrl);
    const caixa = $(seletorCaixa);
    const input = caixa.querySelector('input');
    const manter = [...caixa.querySelectorAll('[data-manter]')];
    caixa.classList.add('tem-img');
    caixa.innerHTML = `<img src="${dataUrl}" alt="">`;
    manter.forEach((el) => caixa.appendChild(el));
    caixa.appendChild(input);
  });
}

function folhaJogador(jogadorExistente, posicaoSugerida) {
  const novo = !jogadorExistente;
  const base = jogadorExistente || {
    apelido: '',
    posicao: posicaoSugerida || 'ATA',
    foto: '',
    ...PERFIS[posicaoSugerida || 'ATA'],
  };
  let foto = base.foto || '';
  let tocouNosAtributos = !novo;

  abrirFolha({
    titulo: novo ? 'Novo jogador' : 'Editar jogador',
    corpo: `
      <div class="palco-carta" id="previa"></div>

      <div class="linha-2" style="align-items:start">
        <div class="campo">
          <label>Foto</label>
          <label class="upload ${foto ? 'tem-img' : ''}" id="up-foto" style="height:112px;min-height:0">
            ${foto ? `<img src="${foto}" alt="">` : `${ic.camera}<span>Enviar</span>`}
            <input type="file" accept="image/*" id="in-foto">
          </label>
        </div>
        <div class="campo">
          <label>Apelido</label>
          <input class="entrada" id="in-apelido" maxlength="14" placeholder="Ex.: Foguinho" value="${escapar(base.apelido)}">
        </div>
      </div>

      <div class="campo">
        <label>Posição</label>
        <div id="chips-posicao">
          ${SETORES.map((setor) => `
            <div class="setor">
              <span class="setor-nome">${setor.nome}</span>
              <div class="setor-chips">
                ${POSICOES.filter((p) => p.grupo === setor.chave).map((p) => `
                  <button class="chip-pos ${p.sigla === base.posicao ? 'ativa' : ''}"
                          data-pos="${p.sigla}">${p.sigla}</button>`).join('')}
              </div>
            </div>`).join('')}
        </div>
        <p class="ajuda" id="nome-posicao"></p>
      </div>

      <div class="campo">
        <label>Características</label>
        ${ATRIBUTOS.map((a) => `
          <div class="atributo">
            <div class="atributo-topo"><span>${a.nome}</span><b id="v-${a.chave}">${base[a.chave]}</b></div>
            <input type="range" min="1" max="99" value="${base[a.chave]}" id="r-${a.chave}" style="--pct:${base[a.chave]}%">
          </div>`).join('')}
      </div>`,
    rodape: `
      ${novo ? '' : `<button class="btn btn-perigo" id="excluir-jogador">${ic.lixeira}</button>`}
      <button class="btn btn-acento" id="salvar-jogador">Salvar jogador</button>`,
    aoMontar: () => {
      const lerFormulario = () => ({
        apelido: $('#in-apelido').value.trim() || 'Sem nome',
        posicao: $('#chips-posicao .ativa').dataset.pos,
        foto,
        ...Object.fromEntries(ATRIBUTOS.map((a) => [a.chave, +$('#r-' + a.chave).value])),
      });
      const atualizarPrevia = () => { $('#previa').innerHTML = cartaHTML(lerFormulario(), true); };
      atualizarPrevia();

      $('#in-apelido').addEventListener('input', atualizarPrevia);

      const mostrarNomePosicao = () => {
        const sigla = $('#chips-posicao .ativa').dataset.pos;
        $('#nome-posicao').textContent = POSICOES.find((p) => p.sigla === sigla).nome;
      };
      mostrarNomePosicao();

      $('#chips-posicao').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip-pos');
        if (!chip) return;
        $('#chips-posicao .ativa')?.classList.remove('ativa');
        chip.classList.add('ativa');
        mostrarNomePosicao();
        // jogador novo e sliders intocados: aplica o perfil da posição
        if (novo && !tocouNosAtributos) {
          const perfil = PERFIS[chip.dataset.pos];
          for (const a of ATRIBUTOS) {
            const r = $('#r-' + a.chave);
            r.value = perfil[a.chave];
            r.style.setProperty('--pct', perfil[a.chave] + '%');
            $('#v-' + a.chave).textContent = perfil[a.chave];
          }
        }
        atualizarPrevia();
      });

      for (const a of ATRIBUTOS) {
        $('#r-' + a.chave).addEventListener('input', (e) => {
          tocouNosAtributos = true;
          e.target.style.setProperty('--pct', e.target.value + '%');
          $('#v-' + a.chave).textContent = e.target.value;
          atualizarPrevia();
        });
      }

      ligarUpload('#in-foto', '#up-foto', 420, (d) => { foto = d; atualizarPrevia(); });

      $('#salvar-jogador').onclick = async () => {
        const dados = lerFormulario();
        if (!$('#in-apelido').value.trim()) return toast('O jogador precisa de um apelido');
        const registro = { id: jogadorExistente?.id || uid(), criadoEm: jogadorExistente?.criadoEm || Date.now(), ...dados };
        await DB.salvarJogador(registro);
        const i = estado.jogadores.findIndex((j) => j.id === registro.id);
        i >= 0 ? estado.jogadores[i] = registro : estado.jogadores.push(registro);
        fecharFolha();
        renderTudo();
        if (novo) { revelarCarta(registro); if (posicaoSugerida) await escalarAutomatico(registro); }
        else { efeitos.tocar('guardar'); toast(`${dados.apelido} atualizado`); }
      };

      $('#excluir-jogador')?.addEventListener('click', () => excluirJogador(jogadorExistente));
    },
  });
}

async function excluirJogador(j) {
  const ok = await confirmar({
    titulo: `Excluir ${j.apelido}?`,
    texto: 'O jogador sai do elenco e da escalação. Não dá para desfazer.',
    acao: 'Excluir jogador',
  });
  if (!ok) return;
  await DB.removerJogador(j.id);
  estado.jogadores = estado.jogadores.filter((x) => x.id !== j.id);
  for (const [slotId, id] of Object.entries(estado.escalacao.slots)) {
    if (id === j.id) delete estado.escalacao.slots[slotId];
  }
  await DB.salvarEscalacao(estado.escalacao);
  fecharFolha();
  renderTudo();
  efeitos.tocar('excluir');
  toast(`${j.apelido} saiu do elenco`);
}

/* =========================================================
   Confirmação
   ========================================================= */

function confirmar({ titulo, texto, acao, cancelar = 'Manter' }) {
  return new Promise((resolve) => {
    const fundo = $('#dialogo-fundo');
    $('#dialogo-titulo').textContent = titulo;
    $('#dialogo-texto').textContent = texto;
    $('#dialogo-sim').textContent = acao;
    $('#dialogo-nao').textContent = cancelar;
    fundo.classList.add('aberto');

    const fechar = (valor) => {
      fundo.classList.remove('aberto');
      $('#dialogo-sim').onclick = null;
      $('#dialogo-nao').onclick = null;
      fundo.onclick = null;
      resolve(valor);
    };
    $('#dialogo-sim').onclick = () => fechar(true);
    $('#dialogo-nao').onclick = () => fechar(false);
    fundo.onclick = (e) => { if (e.target === fundo) fechar(false); };
    $('#dialogo-nao').focus();
  });
}

/* =========================================================
   Revelação da carta
   ========================================================= */

function revelarCarta(j) {
  const camada = $('#revelacao');
  const nota = notaDe(j);
  const titulo = nota >= 85 ? 'Craque no elenco'
    : nota >= 75 ? 'Reforço de peso'
    : 'Novo jogador no elenco';

  $('#revelacao-carta').innerHTML = cartaHTML(j, true);
  camada.querySelector('.revelacao-rotulo')?.remove();
  const rotulo = document.createElement('div');
  rotulo.className = 'revelacao-rotulo';
  rotulo.textContent = titulo;
  camada.appendChild(rotulo);

  camada.classList.add('aberta');
  efeitos.tocar('revelar');
  navigator.vibrate?.([12, 40, 18]);

  // a carta assenta aos 0,95s (junto com a varredura de brilho): é aí que
  // entra o baque, senão o fim da animação fica mudo
  const impacto = setTimeout(() => {
    efeitos.tocar('impacto');
    if (nota >= 85) efeitos.tocar('brilho');
    navigator.vibrate?.(25);
  }, 950);

  const fechar = () => {
    camada.classList.remove('aberta');
    camada.removeEventListener('pointerdown', fechar);
    clearTimeout(t);
    clearTimeout(impacto);
    // fecha o ciclo: a carta entrando no elenco
    efeitos.tocar('guardar');
  };
  const t = setTimeout(fechar, 2600);
  camada.addEventListener('pointerdown', fechar);
}

/* =========================================================
   Som
   ========================================================= */

async function ligarSom(ligar) {
  estado.somLigado = ligar;
  efeitos.ligado = ligar;
  gravarPref('som', ligar);
  if (ligar) {
    // sem faixa própria, a trilha sintetizada assume
    const ok = trilha.disponivel ? await trilha.tocar() : false;
    if (!ok && trilha.disponivel) toast('Toque em qualquer lugar para liberar o som');
    if (!trilha.disponivel) trilhaSintetica.tocar();
  } else {
    trilha.parar();
    trilhaSintetica.parar();
  }
  renderTopo();
}

// Navegadores exigem um gesto do usuário antes de tocar áudio.
function prepararDesbloqueioDeAudio() {
  trilha.aoIndisponivel = renderTopo;
  const desbloquear = async () => {
    if (!estado.somLigado) return;
    if (trilha.disponivel) { if (!trilha.tocando) await trilha.tocar(); }
    else trilhaSintetica.tocar();
    renderTopo();
  };
  document.addEventListener('pointerdown', desbloquear, { once: true });
  trilha.el.addEventListener('play', renderTopo);
  trilha.el.addEventListener('pause', renderTopo);
}

/* =========================================================
   Eventos globais
   ========================================================= */

$('#btn-time').addEventListener('click', folhaTime);
$('#btn-som').addEventListener('click', () => ligarSom(!estado.somLigado));

$('#gramado').addEventListener('click', (e) => {
  if (!e.target.closest('.slot')) limparSelecao();
});

$('#trilho').addEventListener('click', (e) => {
  if (!e.target.closest('.item-trilho')) limparSelecao();
});

$('#abas').addEventListener('click', (e) => {
  const aba = e.target.closest('.aba');
  if (!aba || aba.dataset.aba === estado.aba) return;
  estado.aba = aba.dataset.aba;
  limparSelecao();
  efeitos.tocar('toque');
  renderElenco();
});

$('#btn-tatica').addEventListener('click', () => { limparSelecao(); folhaTatica(); });
$('#metrica-forca').addEventListener('click', folhaForca);
$('#metrica-encaixe').addEventListener('click', folhaSintonia);

/* =========================================================
   Início
   ========================================================= */

async function iniciar() {
  const [time, jogadores, escalacao, comissao] = await Promise.all([
    DB.obterTime(), DB.listarJogadores(), DB.obterEscalacao(), DB.listarComissao(),
  ]);
  estado.comissao = comissao;

  efeitos.ligado = estado.somLigado;
  estado.time = time;
  estado.jogadores = jogadores;
  if (escalacao && TATICAS[escalacao.formacao]) {
    // escalações antigas não guardavam a variação
    const variacao = TATICAS[escalacao.formacao].variacoes[escalacao.variacao]
      ? escalacao.variacao
      : Object.keys(TATICAS[escalacao.formacao].variacoes)[0];
    estado.escalacao = { formacao: escalacao.formacao, variacao, slots: escalacao.slots || {} };
    // limpa referências a jogadores excluídos
    for (const [slotId, id] of Object.entries(estado.escalacao.slots)) {
      if (!id || !jogadores.some((j) => j.id === id)) delete estado.escalacao.slots[slotId];
    }
  }

  renderTudo();
  prepararDesbloqueioDeAudio();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

iniciar();
