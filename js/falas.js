/* =========================================================
   Catálogo de falas da narração.

   Vive fora do audio.js de propósito: não depende de nenhuma API de
   navegador, então a ferramenta que gera os áudios (ferramentas/gerar-vozes.py)
   lê daqui a mesma lista que o aplicativo usa. Uma fonte só, sem risco de
   o áudio gravado e o texto na tela discordarem.

   As frases são vocabulário comum de futebol — de propósito não imitam a
   voz nem os bordões de locutores reais, que são identidade de pessoas vivas.
   ========================================================= */

export const FALAS = {
  // criação de jogador, conforme a nota
  fenomeno:  ['Que fenômeno!', 'Craque demais!', 'Que jogador!'],
  craque:    ['Que craque!', 'Baita reforço!', 'Show de bola!'],
  reforco:   ['Reforço de peso!', 'Chegou gente boa!', 'Boa contratação!'],
  elenco:    ['Mais um pro elenco!', 'Bem-vindo ao clube!', 'Tá no grupo!'],

  // escalação
  completo:  ['Time completo!', 'Escalação definida!', 'Onze em campo!'],
  tatica:    ['Mudança tática!', 'Time reposicionado!', 'Nova formação!'],

  // troca que melhora o time
  melhorou:  ['Agora sim, hein!', 'Boa escolha!', 'Assim o time cresce.',
              'Decisão de técnico!', 'Gostei dessa.', 'Reforçou de verdade!'],

  // troca que piora — provoca, sem ofender
  piorou:    ['Tem certeza?', 'Pensa bem, hein.', 'Esse aí é melhor?',
              'A torcida não vai gostar.', 'Coragem, hein!', 'Olha o que você tá fazendo!'],

  // jogador fora da posição natural
  improviso: ['Improvisou, hein.', 'Ele joga aí mesmo?', 'Vai ter que se virar.'],

  // goleiro na linha ou jogador de linha no gol
  golForaDeCasa: ['Goleiro na linha? Ousado!', 'Isso vai dar história.',
                  'No gol, com as mãos, era melhor.'],

  // tirado de campo, mas segue no elenco
  tirou:     ['Vai pro banco.', 'Saiu do time.', 'Fora da escalação.'],

  // jogador excluído do elenco
  dispensa:  ['Dispensado!', 'Fim de contrato.', 'Saiu do clube.'],
};

// Nome do arquivo de áudio de cada frase: chave + posição na lista.
export function nomeDaFala(chave, indice) {
  return `${chave}-${indice + 1}`;
}

// Índice inverso: da frase exata para o nome do arquivo. É o que permite
// `dizer(texto)` achar a gravação certa a partir do texto já sorteado.
export const ARQUIVO_DA_FRASE = Object.fromEntries(
  Object.entries(FALAS).flatMap(([chave, lista]) =>
    lista.map((texto, i) => [texto, nomeDaFala(chave, i)])),
);
