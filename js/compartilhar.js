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
const MARGEM = 24;
const CAMPO = { x: MARGEM, y: 180, w: L - MARGEM * 2 };
CAMPO.h = Math.round(CAMPO.w / 0.75);        // a mesma proporção do gramado do app

/* A carta mede o que mede no app: 17,5% da largura do gramado ou 13% da
   altura, o que for menor. É essa conta que faz onze cartas caberem no
   campo sem se encostarem, e é dela que sai o `em` de todo o desenho da
   carta — a carta inteira é descrita em ems, como no CSS.                */
const CARTA_EM = Math.min(CAMPO.w * .175, CAMPO.h * .13) / 7.4;

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

/* Os quatro metais, com as mesmas quatro paradas do CSS: a liga é a
   mesma da carta na tela, então a carta da imagem é a carta do app.    */
const METAIS = {
  bronze: { m: ['#f6cba4', '#c8814a', '#7d4520', '#e5a870'], tinta: '#33200e', brilho: 'rgba(255,255,255,.55)', halo: 'rgba(190,120,60,.35)' },
  prata:  { m: ['#ffffff', '#d2dbe5', '#8d99a8', '#f3f7fb'], tinta: '#16202b', brilho: 'rgba(255,255,255,.8)',  halo: 'rgba(180,200,220,.3)' },
  ouro:   { m: ['#fff8d6', '#f4cf68', '#b9861a', '#ffeba6'], tinta: '#2e2000', brilho: 'rgba(255,255,255,.75)', halo: 'rgba(255,200,70,.42)' },
  elite:  { m: ['#6a4ac0', '#2c1656', '#150a2b', '#8a5ce0'], tinta: '#f7f2ff', brilho: 'rgba(255,255,255,.45)', halo: 'rgba(150,90,255,.5)' },
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

/* A cor de fundo da marca, quando ela tem uma só.

   Escudo enviado como JPEG não tem transparência: vem com um fundo
   chapado, quase sempre branco ou creme. Se a placa do brasão tomar essa
   cor, a borda do arquivo some e o que se vê é o brasão com a marca
   dentro — em vez de um quadrado colado num escudo.

   A conta olha a moldura de um pixel em volta da marca e procura a cor
   que mais se repete ali. Olhar só os quatro cantos não serve: escudo com
   faixa do ano de fundação embaixo tem os dois cantos de baixo na cor da
   faixa, e o fundo seria descartado justamente nos escudos em que ele é
   mais evidente. Fundo transparente, foto ou degradê não têm cor
   dominante — aí a placa fica no metal escuro.                          */
function fundoDaMarca(img) {
  try {
    const n = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0, n, n);
    const d = c.getImageData(0, 0, n, n).data;

    const moldura = [];
    for (let i = 0; i < n; i++) {
      for (const [x, y] of [[i, 0], [i, n - 1], [0, i], [n - 1, i]]) {
        const p = (y * n + x) * 4;
        moldura.push([d[p], d[p + 1], d[p + 2], d[p + 3]]);
      }
    }

    // agrupa por cor aproximada e fica com o grupo mais numeroso
    const grupos = new Map();
    for (const [r, g, b, a] of moldura) {
      if (a < 240) continue;
      const chave = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const grupo = grupos.get(chave) || { n: 0, r: 0, g: 0, b: 0 };
      grupo.n++; grupo.r += r; grupo.g += g; grupo.b += b;
      grupos.set(chave, grupo);
    }
    const maior = [...grupos.values()].sort((a, b) => b.n - a.n)[0];
    if (!maior || maior.n < moldura.length * .55) return null;

    const r = Math.round(maior.r / maior.n);
    const g = Math.round(maior.g / maior.n);
    const b = Math.round(maior.b / maior.n);
    return { css: `rgb(${r},${g},${b})`, claro: (r * .299 + g * .587 + b * .114) > 140 };
  } catch {
    return null;   // canvas sem permissão de leitura: segue no metal
  }
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
function textoQueCabe(ctx, txt, x, y, largura, tamanhos, familia = COND, peso = 800) {
  for (const tam of tamanhos) {
    ctx.font = `${peso} ${tam}px ${familia}`;
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

/* =========================================================
   A carta em campo

   É a mesma carta da tela, redesenhada no canvas: o chanfro, a liga
   metálica do tier, o reflexo que atravessa, a nota com a posição, a
   foto redonda, a faixa do nome e as seis características.

   Fotografar a tela seria mais curto, mas a carta da tela mede 60px num
   celular — numa imagem que vai para o grupo ela precisa ser lida. Aqui
   ela é descrita em `em`, como no CSS, e o `em` sai do tamanho do slot:
   as proporções são as mesmas em qualquer tamanho de saída.
   ========================================================= */

// Ângulo de gradiente do CSS: 0deg aponta para cima e cresce no sentido
// horário. O canvas quer dois pontos, então a linha do gradiente é
// calculada como a especificação manda.
function gradienteCSS(ctx, x, y, w, h, graus) {
  const rad = graus * Math.PI / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);
  const comprimento = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2, cy = y + h / 2;
  return ctx.createLinearGradient(
    cx - dx * comprimento / 2, cy - dy * comprimento / 2,
    cx + dx * comprimento / 2, cy + dy * comprimento / 2,
  );
}

// O chanfro da carta: cantos de cima cortados e o bico embaixo.
function caminhoCarta(ctx, x, y, w, h) {
  const p = [[0, .09], [.11, 0], [.89, 0], [1, .09], [1, .88], [.5, 1], [0, .88]];
  ctx.beginPath();
  p.forEach(([fx, fy], i) => {
    const px = x + fx * w, py = y + fy * h;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.closePath();
}

// as bandas claras e escuras da liga, no mesmo ângulo do gradiente
function faixasDaLiga(ctx, x, y, w, h, em) {
  const rad = 152 * Math.PI / 180;
  const ang = Math.atan2(-Math.cos(rad), Math.sin(rad));
  const passo = em * .385, claro = em * .154;
  const r = w + h;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(ang);
  for (let i = -r; i < r; i += passo) {
    ctx.fillStyle = 'rgba(255,255,255,.085)';
    ctx.fillRect(i, -r, claro, r * 2);
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    ctx.fillRect(i + claro, -r, passo - claro, r * 2);
  }
  ctx.restore();
}

function cartaVazia(ctx, x, y, w, h, em) {
  ctx.save();
  caminhoCarta(ctx, x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = em * .9;
  ctx.shadowOffsetY = em * .3;
  ctx.fill();
  ctx.restore();

  // a moldura clara é a borda; o miolo é escuro, como no app
  const d = em * .13;
  ctx.save();
  caminhoCarta(ctx, x + d, y + d, w - d * 2, h - d * 2);
  ctx.clip();
  const fundo = gradienteCSS(ctx, x, y, w, h, 160);
  fundo.addColorStop(0, '#223140');
  fundo.addColorStop(1, '#131b24');
  ctx.fillStyle = fundo;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // o círculo verde com o mais, no meio
  const r = em * 1.1;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * .46, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,224,122,.12)';
  ctx.fill();
  ctx.lineWidth = em * .13;
  ctx.strokeStyle = COR.acento;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - r * .42, y + h * .46);
  ctx.lineTo(x + w / 2 + r * .42, y + h * .46);
  ctx.moveTo(x + w / 2, y + h * .46 - r * .42);
  ctx.lineTo(x + w / 2, y + h * .46 + r * .42);
  ctx.lineWidth = em * .16;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function cartaNoCampo(ctx, { px, py, pos, jogador, foto, escala }) {
  const em = CARTA_EM * escala;
  const w = em * 7.4;
  const h = w * 1.4;
  const x = px - w / 2;
  const y = py - h / 2;

  if (!jogador) {
    cartaVazia(ctx, x, y, w, h, em);
    pilulaDaPosicao(ctx, px, y + h, pos, false, em);
    return;
  }

  const metal = METAIS[jogador.tier] || METAIS.bronze;

  // sombra e halo do tier — os dois drop-shadow do CSS
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = em * .92;
  ctx.shadowOffsetY = em * .38;
  caminhoCarta(ctx, x, y, w, h);
  ctx.fillStyle = metal.m[1];
  ctx.fill();
  ctx.shadowColor = metal.halo;
  ctx.shadowBlur = em * .77;
  ctx.shadowOffsetY = 0;
  ctx.fill();
  ctx.restore();

  ctx.save();
  caminhoCarta(ctx, x, y, w, h);
  ctx.clip();

  // a liga: base do tier, bandas e o reflexo que atravessa
  const liga = gradienteCSS(ctx, x, y, w, h, 152);
  liga.addColorStop(0, metal.m[0]);
  liga.addColorStop(.26, metal.m[1]);
  liga.addColorStop(.47, metal.m[2]);
  liga.addColorStop(.63, metal.m[3]);
  liga.addColorStop(.80, metal.m[1]);
  liga.addColorStop(1, metal.m[2]);
  ctx.fillStyle = liga;
  ctx.fillRect(x, y, w, h);
  faixasDaLiga(ctx, x, y, w, h, em);

  // película holográfica das cartas elite
  if (jogador.tier === 'elite' && ctx.createConicGradient) {
    const holo = ctx.createConicGradient(200 * Math.PI / 180, x + w * .28, y - h * .1);
    holo.addColorStop(0, 'rgba(255,90,190,.75)');
    holo.addColorStop(.25, 'rgba(120,130,255,.7)');
    holo.addColorStop(.5, 'rgba(80,245,220,.7)');
    holo.addColorStop(.75, 'rgba(255,225,120,.7)');
    holo.addColorStop(1, 'rgba(255,90,190,.75)');
    ctx.save();
    ctx.globalCompositeOperation = 'color-dodge';
    ctx.globalAlpha = .3;
    ctx.fillStyle = holo;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  const reflexo = gradienteCSS(ctx, x, y, w, h, 108);
  reflexo.addColorStop(.24, 'rgba(255,255,255,0)');
  reflexo.addColorStop(.38, metal.brilho);
  reflexo.addColorStop(.45, 'rgba(255,255,255,.14)');
  reflexo.addColorStop(.56, 'rgba(255,255,255,0)');
  ctx.fillStyle = reflexo;
  ctx.fillRect(x, y, w, h);

  const alto = gradienteCSS(ctx, x, y, w, h, 196);
  alto.addColorStop(0, 'rgba(255,255,255,.3)');
  alto.addColorStop(.38, 'rgba(255,255,255,0)');
  ctx.fillStyle = alto;
  ctx.fillRect(x, y, w, h);

  /* ---- conteúdo ---- */
  const cond = COND;
  const esquerda = x + em * .42;
  const direita = x + w - em * .42;
  const corpoY = y + em * .45;
  const corpoH = em * 4.18;

  // nota e posição, à esquerda
  ctx.fillStyle = metal.tinta;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const colunaX = esquerda + em * .2 + em * 1.15;
  const temAlt = !!jogador.alternativas;
  const alturaNota = em * (1.85 + .88 + (temAlt ? .52 : 0));
  let ny = corpoY + corpoH / 2 - alturaNota / 2;

  ctx.font = `800 ${em * 1.85}px ${cond}`;
  ctx.fillText(String(jogador.nota), colunaX, ny + em * .92);
  ny += em * 1.95;
  ctx.font = `700 ${em * .78}px ${cond}`;
  // fora de posição: a posição da carta escurece, como no app
  ctx.fillStyle = jogador.fora
    ? (jogador.tier === 'elite' ? COR.ambar : '#7a4a00')
    : metal.tinta;
  ctx.fillText(jogador.posicao || '—', colunaX, ny);
  if (temAlt) {
    ny += em * .52;
    ctx.globalAlpha = .62;
    ctx.fillStyle = metal.tinta;
    ctx.font = `800 ${em * .46}px ${cond}`;
    ctx.fillText(jogador.alternativas, colunaX, ny);
    ctx.globalAlpha = 1;
  }

  // foto redonda, à direita
  const fr = em * 1.875;
  const fx = direita - fr, fy = corpoY + corpoH / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fill();
  ctx.clip();
  if (foto) {
    // object-position: center 22% — o rosto costuma estar no alto da foto
    const escalaFoto = Math.max(fr * 2 / foto.width, fr * 2 / foto.height);
    const iw = foto.width * escalaFoto, ih = foto.height * escalaFoto;
    ctx.drawImage(foto, fx - iw / 2, fy - fr - (ih - fr * 2) * .22, iw, ih);
  } else {
    ctx.fillStyle = metal.tinta;
    ctx.globalAlpha = .5;
    ctx.font = `800 ${em * 1.4}px ${cond}`;
    ctx.fillText(iniciais(jogador.apelido), fx, fy);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.lineWidth = em * .11;
  ctx.strokeStyle = 'rgba(255,255,255,.42)';
  ctx.beginPath();
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.stroke();

  // faixa do nome, entre dois filetes
  const nomeY = corpoY + corpoH + em * .18;
  const nomeH = em * 1.69;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(esquerda, nomeY, direita - esquerda, em * .1);
  ctx.fillRect(esquerda, nomeY + nomeH - em * .1, direita - esquerda, em * .1);
  ctx.fillStyle = metal.tinta;
  ctx.textBaseline = 'middle';
  textoQueCabe(ctx, jogador.apelido.toUpperCase(), x + w / 2, nomeY + nomeH / 2,
    direita - esquerda, [em * .92, em * .78, em * .66], cond);

  // as seis características, três por linha
  const statsY = nomeY + nomeH + em * .26;
  const colunaW = (direita - esquerda) / 3;
  ctx.font = `800 ${em * 1.02}px ${cond}`;
  (jogador.stats || []).slice(0, 6).forEach((valor, i) => {
    const cx = esquerda + colunaW * (i % 3) + colunaW / 2;
    const cy = statsY + Math.floor(i / 3) * em * 1.11 + em * .55;
    ctx.fillText(String(valor), cx, cy);
  });
  ctx.restore();

  // o aviso de improviso, no canto de cima
  if (jogador.fora) {
    const r = em * .62;
    const ax = x + w - em * .35 - r, ay = y + em * .35 + r;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = em * .46;
    ctx.shadowOffsetY = em * .15;
    const aviso = ctx.createLinearGradient(ax - r, ay - r, ax + r, ay + r);
    aviso.addColorStop(0, '#ffc55e');
    aviso.addColorStop(1, COR.ambar);
    ctx.fillStyle = aviso;
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3a2200';
    ctx.font = `800 ${em * .9}px ${cond}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', ax, ay + em * .03);
  }

  pilulaDaPosicao(ctx, px, y + h, pos, jogador.fora, em);
}

/* A pílula da posição, encaixada no bico da carta.

   É a posição da TÁTICA, não a do jogador: a carta diz o que ele é, a
   pílula diz onde ele está jogando. Quando as duas discordam, ela fica
   âmbar — é a mesma leitura do campo na tela.                          */
function pilulaDaPosicao(ctx, px, baseDaCarta, pos, fora, em) {
  ctx.save();
  ctx.font = `800 ${em * .85}px ${COND}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const largura = ctx.measureText(pos).width + em * 1.3;
  const altura = em * 1.5;
  const y = baseDaCarta - em * 1.35;

  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = em * .5;
  ctx.shadowOffsetY = em * .16;
  caminhoArredondado(ctx, px - largura / 2, y, largura, altura, altura / 2);
  ctx.fillStyle = 'rgba(5,9,13,.9)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = em * .09;
  ctx.strokeStyle = fora ? 'rgba(255,171,46,.5)' : COR.borda;
  ctx.stroke();

  ctx.fillStyle = fora ? COR.ambar : COR.texto;
  ctx.fillText(pos, px, y + altura / 2 + em * .02);
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

  /* ---- topo: a marca do clube ----

     Uma placa quadrada de pontas arredondadas, com a marca inteira
     dentro. O caminho até aqui passou por duas tentativas piores:
     recortar a marca no formato de brasão comia os lados do escudo
     redondo e a faixa com o ano de fundação, e usar a silhueta de brasão
     como moldura obrigava a marca a encolher para caber no afunilamento
     do bico. O quadrado arredondado não tira nada e não encolhe nada — a
     folga é só o suficiente para as pontas da marca passarem por dentro
     do arredondamento.                                                  */
  const t = 144;
  const topoEscudo = 18;
  const raio = 28;
  const folga = 10;
  const marca = escudo ? fundoDaMarca(escudo) : null;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  caminhoArredondado(ctx, MARGEM, topoEscudo, t, t, raio);
  if (marca) {
    ctx.fillStyle = marca.css;
  } else {
    const metal = ctx.createLinearGradient(MARGEM, topoEscudo, MARGEM + t, topoEscudo + t);
    metal.addColorStop(0, '#2a3542');
    metal.addColorStop(1, '#141a22');
    ctx.fillStyle = metal;
  }
  ctx.fill();
  ctx.restore();

  ctx.save();
  caminhoArredondado(ctx, MARGEM, topoEscudo, t, t, raio);
  ctx.clip();
  if (escudo) {
    conter(ctx, escudo, MARGEM + folga, topoEscudo + folga, t - folga * 2, t - folga * 2);
  } else {
    // sem marca, a silhueta de brasão segura o lugar
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 4;
    caminhoEscudo(ctx, MARGEM + t * .28, topoEscudo + t * .2, t * .44);
    ctx.stroke();
  }
  ctx.restore();

  // o filete que fecha a placa: escuro sobre placa clara, claro sobre escura
  ctx.save();
  caminhoArredondado(ctx, MARGEM, topoEscudo, t, t, raio);
  ctx.strokeStyle = marca?.claro ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.18)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const xTexto = MARGEM + t + 22;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COR.texto;
  textoQueCabe(ctx, (time?.nome || 'Meu Time').toUpperCase(), xTexto, 86, 470, [46, 40, 34]);

  ctx.fillStyle = COR.texto3;
  ctx.font = `600 24px ${FONTE}`;
  texto1Linha(ctx, `${tatica.formacao} · ${tatica.variacao}`, xTexto, 124, 450);

  medalha(ctx, 876, 86, forca, 'Força', COR.ouro, forca ? forca / 99 : 0);
  medalha(ctx, 1008, 86, sintonia, 'Sintonia', COR.acento, sintonia ? sintonia / 100 : 0);

  /* ---- o gramado ---- */
  ctx.save();
  caminhoArredondado(ctx, CAMPO.x, CAMPO.y, CAMPO.w, CAMPO.h, 26);
  ctx.clip();
  grama(ctx);
  linhas(ctx);
  vinheta(ctx);

  // a área útil é a mesma do app: recuo para a carta caber dentro do campo
  const ax = CAMPO.x + CAMPO.w * .01;
  const ay = CAMPO.y + CAMPO.h * .04;
  const aw = CAMPO.w * .98;
  const ah = CAMPO.h * .90;
  /* Quem está mais embaixo é desenhado por último e um pouco maior: é a
     mesma escala do campo na tela (0,86 a 1,02 conforme desce), e é ela
     que dá profundidade sem inclinar o gramado. A ordem importa porque
     cartas vizinhas se tocam — a de baixo tem que cobrir a de cima.   */
  [...slots]
    .map((s, i) => ({ ...s, foto: fotos[i] }))
    .sort((a, b) => a.y - b.y)
    .forEach((s) => {
      cartaNoCampo(ctx, {
        px: ax + (s.x / 100) * aw,
        py: ay + (s.y / 100) * ah,
        pos: s.pos,
        jogador: s.jogador,
        foto: s.foto,
        escala: 0.86 + s.y / 100 * 0.18,
      });
    });
  ctx.restore();

  /* ---- rodapé: só a assinatura ----

     A contagem de quem está em campo saiu: quem olha a imagem conta os
     onze sozinho, e o lugar dela virou campo.                          */
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COR.acento;
  ctx.font = `800 24px ${COND}`;
  ctx.fillText('NOTATIKO', MARGEM, A - 32);

  /* JPEG, não PNG: a imagem é quase toda gradiente e foto, e o mesmo
     quadro sai com um quinto do peso — o que importa quando ela vai por
     mensagem. Em 1080 de largura, a qualidade 0.92 não marca o texto.   */
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
  return new File([blob], apelidarArquivo(time?.nome, 'escalacao.jpg'), { type: 'image/jpeg' });
}
