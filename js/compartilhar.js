/* Compartilhar — a escalação vira imagem.

   O aplicativo não tem servidor nem conta: nada sai do aparelho por conta
   própria. Compartilhar, aqui, é desenhar a escalação e entregar à folha de
   partilha do sistema — o mesmo caminho de uma foto.

   E é imagem justamente porque não há servidor: uma imagem qualquer um vê,
   no grupo do WhatsApp, sem instalar nada e sem precisar do outro lado ter
   o app. Quem recebe não precisa de nada além de olhos.                   */

// nome de arquivo sem nada que atrapalhe sistema de arquivos nenhum
function apelidarArquivo(nome, extensao) {
  const limpo = (nome || 'time').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'time';
  return `${limpo}.${extensao}`;
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

// desenha a imagem inteira dentro da área, sem cortar (object-fit: contain)
function conter(ctx, img, x, y, w, h) {
  const escala = Math.min(w / img.width, h / img.height);
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
/* A marca do clube no canto de baixo à esquerda.

   Ela já morou no círculo central, em luminosidade, como no gramado do
   app — e ali era fundo: o escudo sumia atrás das linhas e do jogador do
   meio. Numa imagem que vai para o grupo, a marca é para ser vista.

   Fica inteira, sem o recorte de escudo que o placar usa: quem desenhou o
   escudo redondo quer ele redondo. Vai por cima das linhas e da vinheta,
   com sombra, e o canto de baixo à esquerda é o pedaço de gramado que
   nenhuma tática ocupa — fora da grande área, atrás do lateral.          */
function marcaDoClube(ctx, escudo) {
  const t = Math.round(CAMPO.w * .16);
  const x = CAMPO.x + 26;
  const y = CAMPO.y + CAMPO.h - t - 26;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  conter(ctx, escudo, x, y, t, t);
  ctx.restore();
}

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
  linhas(ctx);
  vinheta(ctx);
  if (escudo) marcaDoClube(ctx, escudo);

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
