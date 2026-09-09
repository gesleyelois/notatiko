/* Compartilhar — o time num arquivo, a escalação numa imagem.

   O aplicativo não tem servidor nem conta: nada sai do aparelho por conta
   própria. Compartilhar, aqui, é gerar algo e entregar à folha de partilha
   do sistema — o mesmo caminho de uma foto.

   São dois presentes diferentes, para dois destinatários diferentes:

   - o **time inteiro** vira arquivo (`.notatiko.json`), que só quem tem o app
     abre — e abre com escudo, elenco, comissão, tática e escalação iguais;
   - a **escalação** vira imagem, que qualquer um vê: o grupo do WhatsApp,
     quem não instalou nada, quem só quer saber quem joga domingo.

   Por isso o arquivo carrega tudo e a imagem carrega os onze.             */

export const FORMATO = 'notatiko-time';
export const VERSAO = 1;

/* =========================================================
   O pacote — o time inteiro em texto
   ========================================================= */

// data: URL de imagem e nada mais. O arquivo vem de outra pessoa, e a foto
// é escrita direto no src de uma <img>: sem esta trava, um "arquivo de
// time" poderia trazer atributo de HTML no meio da string, ou um endereço
// que buscasse algo de fora quando a carta fosse desenhada.
const IMAGEM_OK = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]{16,}$/;

const LIMITE_ARQUIVO = 16 * 1024 * 1024;   // 16 MB de fotos já é um elenco enorme
// Tetos de quem CHEGA, não de quem sai: o que é seu vai inteiro, e um
// arquivo de fora não pode encher o banco com dez mil cartas.
const MAX_JOGADORES = 120;
const MAX_COMISSAO = 40;

const texto = (v, limite) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, limite) : '');
const imagem = (v) => (typeof v === 'string' && IMAGEM_OK.test(v) ? v : '');
const nota = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 50;
};

/* O que vai no arquivo. Só o que o app sabe ler de volta: nada de estado
   de tela, nada de preferência de som, nada de identificador de aparelho. */
export function montarPacote({ time, jogadores, comissao, escalacao }) {
  return {
    formato: FORMATO,
    versao: VERSAO,
    gerado: new Date().toISOString(),
    time: { nome: texto(time?.nome, 26), escudo: imagem(time?.escudo) },
    jogadores: jogadores.map((j) => ({ ...j })),
    comissao: comissao.map((m) => ({ ...m })),
    escalacao: {
      formacao: escalacao.formacao,
      variacao: escalacao.variacao,
      slots: { ...escalacao.slots },
    },
  };
}

/* Lê o arquivo de outra pessoa.

   Tudo que entra é copiado campo a campo para um objeto novo — o de fora
   nunca é aproveitado inteiro. `regras` traz o vocabulário do domínio
   (posições, características, funções da comissão e as vagas de cada
   tática), que mora no app: aqui só se confere se o que veio pertence a
   ele.                                                                    */
export function lerPacote(cru, regras) {
  let dados;
  try {
    dados = JSON.parse(cru);
  } catch {
    throw new Error('Este arquivo não é um time do NoTatiko.');
  }
  if (!dados || dados.formato !== FORMATO) {
    throw new Error('Este arquivo não é um time do NoTatiko.');
  }
  if (Number(dados.versao) > VERSAO) {
    throw new Error('Este time veio de uma versão mais nova do app. Atualize para abrir.');
  }

  const posicoes = new Set(regras.posicoes);
  const chaves = regras.atributos;

  const jogadores = (Array.isArray(dados.jogadores) ? dados.jogadores : [])
    .filter((j) => j && posicoes.has(j.posicao))
    .slice(0, MAX_JOGADORES)
    .map((j) => ({
      id: texto(j.id, 40) || null,
      apelido: texto(j.apelido, 18) || 'Sem nome',
      posicao: j.posicao,
      // a fronteira do gol não se atravessa nem por arquivo: goleiro não é
      // alternativa de ninguém, nem ninguém é alternativa de goleiro
      posicoes: (Array.isArray(j.posicoes) ? j.posicoes : [])
        .filter((p) => posicoes.has(p) && regras.podeAtuarEm(j.posicao, p))
        .slice(0, 2),
      foto: imagem(j.foto),
      ...Object.fromEntries(
        chaves.filter((c) => j[c] !== undefined).map((c) => [c, nota(j[c])])
      ),
    }));

  const comissao = (Array.isArray(dados.comissao) ? dados.comissao : [])
    .filter((m) => m && typeof m === 'object')
    .slice(0, MAX_COMISSAO)
    .map((m) => ({
      id: texto(m.id, 40) || null,
      nome: texto(m.nome, 18) || 'Sem nome',
      funcao: regras.funcoes.includes(m.funcao) ? m.funcao : regras.funcoes[0],
      foto: imagem(m.foto),
    }));

  const formacao = texto(dados.escalacao?.formacao, 12);
  const variacao = texto(dados.escalacao?.variacao, 24);

  // uma vaga só entra se existir naquela tática e se quem está nela tiver
  // sobrevivido à conferência acima
  const idsVivos = new Set(jogadores.map((j) => j.id).filter(Boolean));
  const vagas = new Set(regras.vagas(formacao, variacao));
  const slotsCrus = dados.escalacao?.slots;
  const slots = {};
  for (const [slotId, id] of Object.entries(slotsCrus && typeof slotsCrus === 'object' ? slotsCrus : {})) {
    if (vagas.has(slotId) && idsVivos.has(id)) slots[slotId] = id;
  }

  return {
    time: { nome: texto(dados.time?.nome, 26) || 'Time recebido', escudo: imagem(dados.time?.escudo) },
    jogadores,
    comissao,
    escalacao: { formacao, variacao, slots },
  };
}

export async function lerArquivo(file) {
  if (file.size > LIMITE_ARQUIVO) throw new Error('Arquivo grande demais para ser um time.');
  return file.text();
}

// nome de arquivo sem nada que atrapalhe sistema de arquivos nenhum
function apelidarArquivo(nome, extensao) {
  const limpo = (nome || 'time').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'time';
  return `${limpo}.${extensao}`;
}

export function arquivoDoPacote(pacote) {
  const corpo = JSON.stringify(pacote);
  return new File([corpo], apelidarArquivo(pacote.time?.nome, 'notatiko.json'), {
    type: 'application/json',
  });
}

/* =========================================================
   Entrega — folha de partilha do sistema, ou baixar
   ========================================================= */

/* Atenção ao gesto: no iOS o `navigator.share` precisa ser chamado no
   embalo do toque. Por isso quem chama já traz o arquivo pronto — gerar a
   imagem aqui dentro gastaria o gesto no caminho e a folha não abriria. */
export async function entregar(arquivo, { titulo, texto: legenda } = {}) {
  const dados = { files: [arquivo], title: titulo, text: legenda };
  if (navigator.canShare?.(dados)) {
    try {
      await navigator.share(dados);
      return 'compartilhado';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelado';
      /* sem folha de partilha: cai no download */
    }
  }
  baixar(arquivo);
  return 'baixado';
}

export function baixar(arquivo) {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* =========================================================
   A imagem da escalação
   =========================================================

   Um retrato 2:3, do tamanho de um story: escudo e nome no topo, as duas
   medalhas do placar, o gramado com os onze e o rodapé. É desenhado no
   canvas, e não fotografado da tela: a tela do celular é estreita, tem
   HUD, elenco e barra do sistema — e o que se manda para o grupo tem que
   caber num quadro só, no mesmo tamanho em qualquer aparelho.             */

const L = 1080;
const A = 1620;
const MARGEM = 40;
const CAMPO = { x: MARGEM, y: 200, w: L - MARGEM * 2 };
CAMPO.h = Math.round(CAMPO.w / 0.75);        // a mesma proporção do gramado do app

const COR = {
  fundo: '#06090d',
  texto: '#eef3f8',
  texto2: '#a4b2c2',
  texto3: '#7d8b9d',
  acento: '#00e884',
  ouro: '#ffd257',
  ambar: '#ffab2e',
  borda: '#2e3c4c',
};

const TIERS = {
  elite: '#8a5ce0',
  ouro: '#f4cf68',
  prata: '#d2dbe5',
  bronze: '#e5a870',
};

const COND = '"Roboto Condensed", "Arial Narrow", "Liberation Sans Narrow", system-ui, sans-serif';
const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function carregar(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function caminhoArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// o mesmo recorte de escudo do emblema do placar
function caminhoEscudo(ctx, x, y, t) {
  const p = [[.5, 0], [1, .16], [1, .62], [.5, 1], [0, .62], [0, .16]];
  ctx.beginPath();
  p.forEach(([px, py], i) => {
    const cx = x + px * t, cy = y + py * t;
    i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy);
  });
  ctx.closePath();
}

// desenha a imagem cobrindo a área (o mesmo que object-fit: cover)
function cobrir(ctx, img, x, y, w, h) {
  const escala = Math.max(w / img.width, h / img.height);
  const iw = img.width * escala, ih = img.height * escala;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function texto1Linha(ctx, txt, x, y, largura) {
  let corte = txt;
  while (corte.length > 1 && ctx.measureText(corte).width > largura) corte = corte.slice(0, -1);
  ctx.fillText(corte === txt ? txt : corte.trim() + '…', x, y);
}

/* Nome comprido primeiro encolhe, só depois é cortado.

   Cortar "RONALDINHO" em "RONALDIN…" perde o apelido; duas medidas de
   fonte menores costumam fazer caber inteiro — é o que a carta do app já
   faz com a classe de tamanho.                                           */
function nomeQueCabe(ctx, txt, x, y, largura, tamanhos) {
  for (const tam of tamanhos) {
    ctx.font = `800 ${tam}px ${COND}`;
    if (ctx.measureText(txt).width <= largura) break;
  }
  texto1Linha(ctx, txt, x, y, largura);
}

function grama(ctx) {
  const { x, y, w, h } = CAMPO;
  const base = ctx.createLinearGradient(0, y, 0, y + h);
  base.addColorStop(0, '#22945f');
  base.addColorStop(.44, '#18754e');
  base.addColorStop(1, '#0d4c31');
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);

  // as faixas do corte da grama: doze, como no app
  const faixa = w / 12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.055)';
    ctx.fillRect(x + i * faixa, y, faixa, h);
  }

  const luz = ctx.createRadialGradient(x + w / 2, y - h * .06, 0, x + w / 2, y - h * .06, h * .72);
  luz.addColorStop(0, 'rgba(214,255,232,.24)');
  luz.addColorStop(1, 'rgba(214,255,232,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(x, y, w, h);
}

/* As linhas saem do mesmo desenho do index.html (viewBox 680x907), só
   reescaladas: campo desenhado duas vezes com medidas diferentes é campo
   que um dia deixa de bater com o outro.                                 */
function linhas(ctx) {
  const { x, y, w, h } = CAMPO;
  const e = w / 680;
  const px = (v) => x + v * e;
  const py = (v) => y + v * e;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.46)';
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';

  ctx.strokeRect(px(8), py(8), 664 * e, 891 * e);

  ctx.beginPath();
  ctx.moveTo(px(8), py(453.5));
  ctx.lineTo(px(672), py(453.5));
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(px(340), py(453.5), 89 * e, 0, Math.PI * 2);
  ctx.stroke();

  // grandes áreas, pequenas áreas e as meias-luas
  ctx.strokeRect(px(143.2), py(8), 393.6 * e, 162 * e);
  ctx.strokeRect(px(250.5), py(8), 179 * e, 54 * e);
  ctx.strokeRect(px(143.2), py(737), 393.6 * e, 162 * e);
  ctx.strokeRect(px(250.5), py(845), 179 * e, 54 * e);

  ctx.beginPath();
  ctx.arc(px(340), py(116), 89 * e, 0.62, Math.PI - 0.62);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px(340), py(791), 89 * e, Math.PI + 0.62, -0.62);
  ctx.stroke();

  // escanteios
  const canto = (cx, cy, de, ate) => {
    ctx.beginPath();
    ctx.arc(px(cx), py(cy), 20 * e, de, ate);
    ctx.stroke();
  };
  canto(8, 8, 0, Math.PI / 2);
  canto(672, 8, Math.PI / 2, Math.PI);
  canto(8, 899, -Math.PI / 2, 0);
  canto(672, 899, Math.PI, Math.PI * 1.5);

  // traves e marcas
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(px(304), py(0), 72 * e, 8 * e);
  ctx.fillRect(px(304), py(899), 72 * e, 8 * e);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (const marca of [453.5, 116, 791]) {
    ctx.beginPath();
    ctx.arc(px(340), py(marca), 5 * e, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function vinheta(ctx) {
  const { x, y, w, h } = CAMPO;
  const baixo = ctx.createRadialGradient(x + w / 2, y + h, 0, x + w / 2, y + h, h * .8);
  baixo.addColorStop(0, 'rgba(0,0,0,.5)');
  baixo.addColorStop(.55, 'rgba(0,0,0,0)');
  ctx.fillStyle = baixo;
  ctx.fillRect(x, y, w, h);

  const alto = ctx.createLinearGradient(0, y, 0, y + h);
  alto.addColorStop(0, 'rgba(0,0,0,.35)');
  alto.addColorStop(.25, 'rgba(0,0,0,0)');
  alto.addColorStop(.7, 'rgba(0,0,0,0)');
  alto.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = alto;
  ctx.fillRect(x, y, w, h);
}

// medalha do placar: anel contando o valor, número no meio, rótulo embaixo
function medalha(ctx, cx, cy, valor, rotulo, cor, escala = 1) {
  const r = 44;
  ctx.save();
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.fillStyle = 'rgba(8,12,17,.78)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (valor !== null) {
    ctx.strokeStyle = cor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * escala);
    ctx.stroke();
  }

  ctx.fillStyle = cor;
  ctx.font = `800 40px ${COND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(valor === null ? '--' : String(valor), cx, cy + 2);

  ctx.fillStyle = COR.texto3;
  ctx.font = `700 18px ${FONTE}`;
  ctx.textBaseline = 'top';
  ctx.fillText(rotulo.toUpperCase(), cx, cy + r + 12);
  ctx.restore();
}

// sem foto, o disco leva as iniciais: duas letras, venham de uma palavra
// ou de duas — uma letra sozinha num círculo de 100px parece erro
function iniciais(apelido = '') {
  const partes = apelido.split(' ').filter(Boolean);
  if (!partes.length) return '?';
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : partes[0].slice(0, 2);
  return letras.toUpperCase();
}

function jogadorNoCampo(ctx, { px, py, pos, jogador, foto }) {
  const r = 52;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(8,12,17,.9)';
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!jogador) {
    // vaga aberta: círculo tracejado com a posição no meio
    ctx.save();
    ctx.setLineDash([9, 9]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(px, py, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = `800 26px ${COND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pos, px, py + 1);
    ctx.restore();
    return;
  }

  const cor = TIERS[jogador.tier] || TIERS.bronze;

  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, r - 3, 0, Math.PI * 2);
  ctx.clip();
  if (foto) {
    cobrir(ctx, foto, px - r, py - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
    ctx.fillStyle = COR.texto2;
    ctx.font = `800 38px ${COND}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iniciais(jogador.apelido), px, py + 2);
  }
  ctx.restore();

  ctx.lineWidth = 4;
  ctx.strokeStyle = cor;
  ctx.beginPath();
  ctx.arc(px, py, r - 2, 0, Math.PI * 2);
  ctx.stroke();

  // a nota, na cor do tier da carta
  ctx.save();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(px - 40, py + 38, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#06090d';
  ctx.font = `800 25px ${COND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(jogador.nota), px - 40, py + 39);
  ctx.restore();

  // a pílula da posição, âmbar quando o jogador está improvisando ali
  const fora = jogador.fora;
  ctx.save();
  ctx.font = `800 22px ${COND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const larguraPilula = Math.max(52, ctx.measureText(pos).width + 26);
  const pilulaX = px + 12, pilulaY = py + 24;
  ctx.fillStyle = 'rgba(5,9,13,.92)';
  ctx.strokeStyle = fora ? 'rgba(255,171,46,.6)' : COR.borda;
  ctx.lineWidth = 2;
  caminhoArredondado(ctx, pilulaX, pilulaY, larguraPilula, 30, 15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fora ? COR.ambar : COR.texto;
  ctx.fillText(pos, pilulaX + larguraPilula / 2, pilulaY + 16);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,.8)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = COR.texto;
  nomeQueCabe(ctx, jogador.apelido.toUpperCase(), px, py + r + 14, 200, [27, 24, 21]);
  ctx.restore();
}

/* `escalacao` é o que o app já sabe: os slots da tática com quem ocupa
   cada um. Nada de domínio é recalculado aqui — nota, tier e improviso
   chegam prontos, para a imagem nunca discordar da tela.                 */
export async function imagemDaEscalacao({ time, tatica, forca, sintonia, slots }) {
  const cv = document.createElement('canvas');
  cv.width = L;
  cv.height = A;
  const ctx = cv.getContext('2d');

  const [escudo, ...fotos] = await Promise.all([
    carregar(time?.escudo),
    ...slots.map((s) => carregar(s.jogador?.foto)),
  ]);

  const fundo = ctx.createLinearGradient(0, 0, 0, A);
  fundo.addColorStop(0, '#0b1219');
  fundo.addColorStop(1, COR.fundo);
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, L, A);

  /* ---- topo: escudo, nome e tática ---- */
  const t = 104;
  ctx.save();
  caminhoEscudo(ctx, MARGEM, 46, t);
  const metal = ctx.createLinearGradient(MARGEM, 46, MARGEM + t, 46 + t);
  metal.addColorStop(0, '#2a3542');
  metal.addColorStop(1, '#141a22');
  ctx.fillStyle = metal;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  if (escudo) cobrir(ctx, escudo, MARGEM, 46, t, t);
  ctx.restore();
  ctx.restore();

  const xTexto = MARGEM + t + 22;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COR.texto;
  nomeQueCabe(ctx, (time?.nome || 'Meu Time').toUpperCase(), xTexto, 96, 460, [46, 40, 34]);

  ctx.fillStyle = COR.texto3;
  ctx.font = `600 24px ${FONTE}`;
  texto1Linha(ctx, `${tatica.formacao} · ${tatica.variacao}`, xTexto, 134, 440);

  medalha(ctx, 872, 96, forca, 'Força', COR.ouro, forca ? forca / 99 : 0);
  medalha(ctx, 1004, 96, sintonia, 'Sintonia', COR.acento, sintonia ? sintonia / 100 : 0);

  /* ---- o gramado ---- */
  ctx.save();
  caminhoArredondado(ctx, CAMPO.x, CAMPO.y, CAMPO.w, CAMPO.h, 26);
  ctx.clip();
  grama(ctx);
  if (escudo) {
    // escudo pintado no círculo central, como no campo do app
    ctx.save();
    ctx.beginPath();
    ctx.arc(CAMPO.x + CAMPO.w / 2, CAMPO.y + CAMPO.h * .5, CAMPO.w * .131, 0, Math.PI * 2);
    ctx.clip();
    // o app pinta o escudo do meio em luminosidade: a marca aparece sem
    // manchar o gramado com a cor dela
    ctx.globalCompositeOperation = 'luminosity';
    ctx.globalAlpha = .42;
    const d = CAMPO.w * .262;
    cobrir(ctx, escudo, CAMPO.x + CAMPO.w / 2 - d / 2, CAMPO.y + CAMPO.h * .5 - d / 2, d, d);
    ctx.restore();
  }
  linhas(ctx);
  vinheta(ctx);

  // a área útil é a mesma do app: recuo para a carta caber dentro do campo
  const ax = CAMPO.x + CAMPO.w * .01;
  const ay = CAMPO.y + CAMPO.h * .04;
  const aw = CAMPO.w * .98;
  const ah = CAMPO.h * .90;
  slots.forEach((s, i) => {
    jogadorNoCampo(ctx, {
      px: ax + (s.x / 100) * aw,
      py: ay + (s.y / 100) * ah,
      pos: s.pos,
      jogador: s.jogador,
      foto: fotos[i],
    });
  });
  ctx.restore();

  /* ---- rodapé ---- */
  const emCampo = slots.filter((s) => s.jogador).length;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COR.acento;
  ctx.font = `800 26px ${COND}`;
  ctx.fillText('NOTATIKO', MARGEM, A - 42);
  ctx.textAlign = 'right';
  ctx.fillStyle = COR.texto3;
  ctx.font = `600 22px ${FONTE}`;
  ctx.fillText(`${emCampo} de ${slots.length} em campo`, L - MARGEM, A - 42);

  /* JPEG, não PNG: a imagem é quase toda gradiente e foto, e o mesmo
     quadro sai com um quinto do peso — o que importa quando ela vai por
     mensagem. Em 1080 de largura, a qualidade 0.92 não marca o texto.   */
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
  return new File([blob], apelidarArquivo(time?.nome, 'escalacao.jpg'), { type: 'image/jpeg' });
}
