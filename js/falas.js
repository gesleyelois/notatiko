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
  fenomeno:  ['Que fenômeno!', 'Craque demais!', 'Que jogador!',
              'Esse é de outro planeta!', 'Fora de série!', 'Joia rara!',
              'Que contratação, hein!', 'Esse decide sozinho.', 'Craque de verdade.'],
  craque:    ['Que craque!', 'Baita reforço!', 'Show de bola!',
              'Esse joga muito.', 'Peça de primeira.', 'Chegou para brilhar.',
              'Titular na hora.', 'Que achado!'],
  reforco:   ['Reforço de peso!', 'Chegou gente boa!', 'Boa contratação!',
              'Vai ajudar bastante.', 'Time mais forte.', 'Peça útil demais.',
              'Bom nome.', 'Chegou para somar.'],
  elenco:    ['Mais um pro elenco!', 'Bem-vindo ao clube!', 'Tá no grupo!',
              'Vai ter chance.', 'Começa por baixo.', 'Todo elenco precisa.',
              'Bem-vindo!', 'Um a mais no vestiário.'],

  // escalação
  completo:  ['Time completo!', 'Escalação definida!', 'Onze em campo!',
              'Tá escalado!', 'Time montado.', 'Prontos pro apito.',
              'Fechou o time!', 'Onze na linha.'],
  tatica:    ['Mudança tática!', 'Time reposicionado!', 'Nova formação!',
              'Mexeu no desenho.', 'Outro esquema.', 'Time redesenhado.',
              'Trocou a formação.', 'Nova arrumação.'],

  // troca que melhora o time
  melhorou:  ['Agora sim, hein!', 'Boa escolha!', 'Assim o time cresce.',
              'Decisão de técnico!', 'Gostei dessa.', 'Reforçou de verdade!',
              'Melhorou muito.', 'Essa foi certeira.', 'Subiu o nível.', 'Aí sim!'],

  // troca que piora — provoca, sem ofender
  piorou:    ['Tem certeza?', 'Pensa bem, hein.', 'Esse aí é melhor?',
              'A torcida não vai gostar.', 'Coragem, hein!',
              'Olha o que você tá fazendo!', 'Tá arriscando.',
              'Enfraqueceu o time.', 'Explica essa.', 'Duvido que dê certo.'],

  // jogador fora da posição natural
  improviso: ['Improvisou, hein.', 'Ele joga aí mesmo?', 'Vai ter que se virar.',
              'Fora da posição dele.', 'Isso é improviso.',
              'Vai aprender jogando.', 'Não é a casa dele.'],

  // goleiro na linha ou jogador de linha no gol
  golForaDeCasa: ['Goleiro na linha? Ousado!', 'Isso vai dar história.',
                  'No gol, com as mãos, era melhor.', 'Goleiro é outro ofício.',
                  'Isso não vai acabar bem.', 'Coragem para inventar essa.'],

  // tirado de campo, mas segue no elenco
  tirou:     ['Vai pro banco.', 'Saiu do time.', 'Fora da escalação.',
              'Descansa um pouco.', 'Sai de campo.', 'Perdeu a vaga.',
              'Vai esperar a chance.'],

  // jogador excluído do elenco
  dispensa:  ['Dispensado!', 'Fim de contrato.', 'Saiu do clube.',
              'Rescindiu.', 'Não faz mais parte.', 'Fim de linha.'],

  // tocou numa carta de quem já está escalado
  jaEmCampo: ['Esse já tá jogando.', 'Ele já está em campo.', 'Já é titular.',
              'Esse aí já entrou.', 'Já tá escalado.', 'Esse já é do time.'],
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
