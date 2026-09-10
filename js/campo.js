/* O desenho do campo, medido num lugar só.

   As marcações eram escritas duas vezes: à mão no SVG do `index.html` e à
   mão de novo no canvas da imagem compartilhada. Duas cópias do mesmo
   campo é uma que um dia deixa de bater com a outra.

   Aqui elas saem de uma lista de primitivas — retângulo, linha, círculo,
   arco, ponto —, em unidades de um campo de 680 de largura. Quem desenha é
   quem chama: o app vira SVG, a imagem vira traço de canvas.

   O COMPRIMENTO É VARIÁVEL, e é isto que endireita o círculo central.

   Antes o campo era esticado até preencher a coluna, com um `viewBox` de
   proporção fixa e `preserveAspectRatio="none"`: num iPhone em pé a caixa
   ficava em 0,57 contra os 0,75 do desenho, e o círculo do meio virava uma
   elipse de pé — 33% mais alto que largo. Esticar o desenho é o único
   jeito de um círculo sair achatado.

   Então o desenho passa a ter o comprimento que a tela pede: a largura
   manda em todas as marcações (área, meia-lua, círculo — todas medidas a
   partir dos 68 metros da largura), e o que varia é o meio-campo, como
   varia num campo de verdade. A regra do futebol admite de 90 a 120
   metros de comprimento para 68 de largura, o que dá de 0,76 a 0,56 de
   proporção: dentro dessa faixa o campo é campo, e o círculo é redondo em
   qualquer tela.                                                         */

export const LARGURA = 680;

// 68m x 90m e 68m x 120m, os limites da regra
export const PROPORCAO_MAX = 0.756;
export const PROPORCAO_MIN = 0.56;

// o campo do desenho antigo (680x907), que segue sendo o padrão
export const PROPORCAO_PADRAO = 0.7497;

export const dentroDaRegra = (proporcao) =>
  Math.min(PROPORCAO_MAX, Math.max(PROPORCAO_MIN, proporcao || PROPORCAO_PADRAO));

export function alturaDoCampo(proporcao) {
  return Math.round(LARGURA / dentroDaRegra(proporcao));
}

/* As marcações, de cima para baixo. Tudo que não depende do comprimento
   está preso à borda de cima ou à de baixo; só a linha do meio, o círculo
   central e a marca do meio flutuam com a altura.                        */
export function marcasDoCampo(altura) {
  const h = altura;
  const meio = h / 2;
  const raio = 89;                 // 9,15m
  const areaFundo = 170;           // 16,5m da linha de fundo, mais a margem
  const marcaPenal = 116;          // 11m da linha de fundo, mais a margem
  // onde a meia-lua sai da grande área
  const abertura = Math.asin((areaFundo - marcaPenal) / raio);

  return [
    { tipo: 'rect', x: 8, y: 8, w: 664, h: h - 16 },
    { tipo: 'linha', x1: 8, y1: meio, x2: 672, y2: meio },
    { tipo: 'circulo', cx: 340, cy: meio, r: raio },

    { tipo: 'rect', x: 143.2, y: 8, w: 393.6, h: 162 },
    { tipo: 'rect', x: 250.5, y: 8, w: 179, h: 54 },
    { tipo: 'arco', cx: 340, cy: marcaPenal, r: raio, de: abertura, ate: Math.PI - abertura },

    { tipo: 'rect', x: 143.2, y: h - 170, w: 393.6, h: 162 },
    { tipo: 'rect', x: 250.5, y: h - 62, w: 179, h: 54 },
    { tipo: 'arco', cx: 340, cy: h - marcaPenal, r: raio, de: Math.PI + abertura, ate: -abertura },

    { tipo: 'arco', cx: 8, cy: 8, r: 20, de: 0, ate: Math.PI / 2 },
    { tipo: 'arco', cx: 672, cy: 8, r: 20, de: Math.PI / 2, ate: Math.PI },
    { tipo: 'arco', cx: 8, cy: h - 8, r: 20, de: -Math.PI / 2, ate: 0 },
    { tipo: 'arco', cx: 672, cy: h - 8, r: 20, de: Math.PI, ate: Math.PI * 1.5 },

    { tipo: 'trave', x: 304, y: 0, w: 72, h: 8 },
    { tipo: 'trave', x: 304, y: h - 8, w: 72, h: 8 },

    { tipo: 'ponto', cx: 340, cy: meio, r: 5 },
    { tipo: 'ponto', cx: 340, cy: marcaPenal, r: 5 },
    { tipo: 'ponto', cx: 340, cy: h - marcaPenal, r: 5 },
  ];
}

// Um arco em caminho de SVG. Todos os arcos do campo são menores que meia
// volta, então a bandeira do arco grande é sempre 0.
function arcoEmCaminho({ cx, cy, r, de, ate }) {
  const ponto = (a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  return `M ${ponto(de)} A ${r} ${r} 0 0 1 ${ponto(ate)}`;
}

/* O SVG das marcações — só o miolo, para quem chama decidir o resto. */
export function campoEmSVG(altura) {
  const linhas = [];
  const marcas = [];
  const traves = [];

  for (const m of marcasDoCampo(altura)) {
    if (m.tipo === 'rect') linhas.push(`<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" />`);
    if (m.tipo === 'linha') linhas.push(`<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" />`);
    if (m.tipo === 'circulo') linhas.push(`<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}" />`);
    if (m.tipo === 'arco') linhas.push(`<path d="${arcoEmCaminho(m)}" />`);
    if (m.tipo === 'trave') traves.push(`<rect class="gol-trave" x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" />`);
    if (m.tipo === 'ponto') marcas.push(`<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}" />`);
  }

  return `
    <g class="linha-campo">${linhas.join('')}${traves.join('')}</g>
    <g class="marca-ponto">${marcas.join('')}</g>`;
}
