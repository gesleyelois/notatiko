// Táticas e suas variações.
// Cada slot tem posição e coordenadas em % dentro da área útil do gramado
// (o topo é o ataque, a base é o gol).

const s = (id, pos, x, y) => ({ id, pos, x, y });

export const TATICAS = {
  '4-4-2': {
    resumo: 'Duas linhas de quatro',
    variacoes: {
      'Clássico': [
        s('ata1', 'ATA', 35, 13), s('ata2', 'ATA', 65, 13),
        s('pe', 'PE', 11, 40), s('mc1', 'MC', 37, 48), s('mc2', 'MC', 63, 48), s('pd', 'PD', 89, 40),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
      'Losango': [
        s('ata1', 'ATA', 38, 13), s('ata2', 'ATA', 62, 13),
        s('mei', 'MEI', 50, 31), s('mc1', 'MC', 18, 48), s('mc2', 'MC', 82, 48), s('vol', 'VOL', 50, 58),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
      'Dois volantes': [
        s('ata1', 'ATA', 35, 13), s('ata2', 'ATA', 65, 13),
        s('pe', 'PE', 12, 38), s('vol1', 'VOL', 35, 54), s('vol2', 'VOL', 65, 54), s('pd', 'PD', 88, 38),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '4-3-3': {
    resumo: 'Três atacantes abertos',
    variacoes: {
      'Clássico': [
        s('ata', 'ATA', 50, 12), s('pe', 'PE', 15, 21), s('pd', 'PD', 85, 21),
        s('mei', 'MEI', 50, 40), s('vol1', 'VOL', 28, 54), s('vol2', 'VOL', 72, 54),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
      'Ofensivo': [
        s('ata', 'ATA', 50, 12), s('pe', 'PE', 13, 18), s('pd', 'PD', 87, 18),
        s('mei1', 'MEI', 32, 38), s('mei2', 'MEI', 68, 38), s('vol', 'VOL', 50, 56),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
      'Defensivo': [
        s('ata', 'ATA', 50, 13), s('pe', 'PE', 15, 24), s('pd', 'PD', 85, 24),
        s('mc1', 'MC', 30, 45), s('mc2', 'MC', 70, 45), s('vol', 'VOL', 50, 58),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
      'Falso 9': [
        s('mei9', 'MEI', 50, 16), s('pe', 'PE', 14, 14), s('pd', 'PD', 86, 14),
        s('mc', 'MC', 50, 38), s('vol1', 'VOL', 29, 54), s('vol2', 'VOL', 71, 54),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '4-2-3-1': {
    resumo: 'Meia armador atrás do centroavante',
    variacoes: {
      'Clássico': [
        s('ata', 'ATA', 50, 12), s('pe', 'PE', 16, 30), s('mei', 'MEI', 50, 33), s('pd', 'PD', 84, 30),
        s('vol1', 'VOL', 34, 55), s('vol2', 'VOL', 66, 55),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
      'Aberto': [
        s('ata', 'ATA', 50, 12), s('pe', 'PE', 10, 26), s('mei', 'MEI', 50, 35), s('pd', 'PD', 90, 26),
        s('vol1', 'VOL', 34, 55), s('vol2', 'VOL', 66, 55),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '4-1-4-1': {
    resumo: 'Volante fixo e meio povoado',
    variacoes: {
      'Clássico': [
        s('ata', 'ATA', 50, 12),
        s('pe', 'PE', 11, 36), s('mc1', 'MC', 37, 43), s('mc2', 'MC', 63, 43), s('pd', 'PD', 89, 36),
        s('vol', 'VOL', 50, 58),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '4-3-2-1': {
    resumo: 'Árvore de natal',
    variacoes: {
      'Clássico': [
        s('ata', 'ATA', 50, 12), s('mei1', 'MEI', 32, 27), s('mei2', 'MEI', 68, 27),
        s('mc1', 'MC', 24, 48), s('vol', 'VOL', 50, 53), s('mc2', 'MC', 76, 48),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '4-2-4': {
    resumo: 'Todo mundo no ataque',
    variacoes: {
      'Clássico': [
        s('ata1', 'ATA', 36, 13), s('ata2', 'ATA', 64, 13), s('pe', 'PE', 11, 22), s('pd', 'PD', 89, 22),
        s('mc1', 'MC', 35, 50), s('mc2', 'MC', 65, 50),
        s('le', 'LE', 10, 68), s('zag1', 'ZAG', 34, 75), s('zag2', 'ZAG', 66, 75), s('ld', 'LD', 90, 68),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '3-5-2': {
    resumo: 'Três zagueiros e alas',
    variacoes: {
      'Clássico': [
        s('ata1', 'ATA', 36, 13), s('ata2', 'ATA', 64, 13),
        s('mei', 'MEI', 50, 35), s('le', 'LE', 10, 46), s('mc1', 'MC', 32, 50), s('mc2', 'MC', 68, 50), s('ld', 'LD', 90, 46),
        s('zag1', 'ZAG', 24, 75), s('zag2', 'ZAG', 50, 78), s('zag3', 'ZAG', 76, 75),
        s('gol', 'GOL', 50, 89),
      ],
      'Alas ofensivos': [
        s('ata1', 'ATA', 36, 13), s('ata2', 'ATA', 64, 13),
        s('le', 'LE', 9, 32), s('mei', 'MEI', 50, 36), s('ld', 'LD', 91, 32),
        s('vol1', 'VOL', 35, 57), s('vol2', 'VOL', 65, 57),
        s('zag1', 'ZAG', 24, 75), s('zag2', 'ZAG', 50, 78), s('zag3', 'ZAG', 76, 75),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '3-4-3': {
    resumo: 'Linha de três com trio ofensivo',
    variacoes: {
      'Clássico': [
        s('ata', 'ATA', 50, 12), s('pe', 'PE', 16, 20), s('pd', 'PD', 84, 20),
        s('le', 'LE', 10, 47), s('vol1', 'VOL', 36, 52), s('vol2', 'VOL', 64, 52), s('ld', 'LD', 90, 47),
        s('zag1', 'ZAG', 24, 75), s('zag2', 'ZAG', 50, 78), s('zag3', 'ZAG', 76, 75),
        s('gol', 'GOL', 50, 89),
      ],
      'Losango': [
        s('ata', 'ATA', 50, 12), s('pe', 'PE', 16, 20), s('pd', 'PD', 84, 20),
        s('mei', 'MEI', 50, 36), s('le', 'LE', 11, 50), s('ld', 'LD', 89, 50), s('vol', 'VOL', 50, 58),
        s('zag1', 'ZAG', 24, 75), s('zag2', 'ZAG', 50, 78), s('zag3', 'ZAG', 76, 75),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '5-3-2': {
    resumo: 'Linha de cinco, saída em contra-ataque',
    variacoes: {
      'Clássico': [
        s('ata1', 'ATA', 36, 13), s('ata2', 'ATA', 64, 13),
        s('mc1', 'MC', 30, 45), s('vol', 'VOL', 50, 51), s('mc2', 'MC', 70, 45),
        s('le', 'LE', 9, 62), s('zag1', 'ZAG', 27, 76), s('zag2', 'ZAG', 50, 79), s('zag3', 'ZAG', 73, 76), s('ld', 'LD', 91, 62),
        s('gol', 'GOL', 50, 89),
      ],
      'Com armador': [
        s('ata1', 'ATA', 36, 13), s('ata2', 'ATA', 64, 13),
        s('mei', 'MEI', 50, 33), s('vol1', 'VOL', 33, 53), s('vol2', 'VOL', 67, 53),
        s('le', 'LE', 9, 62), s('zag1', 'ZAG', 27, 76), s('zag2', 'ZAG', 50, 79), s('zag3', 'ZAG', 73, 76), s('ld', 'LD', 91, 62),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },

  '5-4-1': {
    resumo: 'Retranca com dois blocos',
    variacoes: {
      'Clássico': [
        s('ata', 'ATA', 50, 13),
        s('pe', 'PE', 12, 40), s('mc1', 'MC', 37, 47), s('mc2', 'MC', 63, 47), s('pd', 'PD', 88, 40),
        s('le', 'LE', 9, 62), s('zag1', 'ZAG', 27, 76), s('zag2', 'ZAG', 50, 79), s('zag3', 'ZAG', 73, 76), s('ld', 'LD', 91, 62),
        s('gol', 'GOL', 50, 89),
      ],
    },
  },
};

export const TATICA_PADRAO = { formacao: '4-3-3', variacao: 'Clássico' };

// Lista achatada, útil para menus: [{ formacao, variacao, rotulo, slots }]
export function listarTaticas() {
  const lista = [];
  for (const [formacao, dados] of Object.entries(TATICAS)) {
    for (const variacao of Object.keys(dados.variacoes)) {
      lista.push({ formacao, variacao, rotulo: `${formacao} ${variacao}`, slots: dados.variacoes[variacao] });
    }
  }
  return lista;
}

export function slotsDaTatica(formacao, variacao) {
  const t = TATICAS[formacao];
  if (!t) return TATICAS[TATICA_PADRAO.formacao].variacoes[TATICA_PADRAO.variacao];
  return t.variacoes[variacao] || Object.values(t.variacoes)[0];
}

export function variacoesDe(formacao) {
  return Object.keys(TATICAS[formacao]?.variacoes || {});
}
