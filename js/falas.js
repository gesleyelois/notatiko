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
              'Esse é de outro planeta!', 'Esse aí é fora de série!',
              'Achou uma joia, hein!', 'Que contratação, hein!',
              'Esse decide sozinho.', 'Craque de verdade, esse.'],
  craque:    ['Que craque!', 'Baita reforço!', 'Show de bola!',
              'Esse joga muito.', 'Esse é de primeira, hein.',
              'Esse chegou pra brilhar.', 'Titular na hora.', 'Que achado!'],
  reforco:   ['Baita reforço, hein!', 'Chegou gente boa!', 'Boa contratação!',
              'Esse resolve, viu.', 'O time cresceu com esse.',
              'Útil demais, esse cara.', 'Bom nome, hein.', 'Chegou pra jogar.'],
  elenco:    ['Mais um pro elenco!', 'Bem-vindo ao clube!', 'Tá no grupo!',
              'Vai ter chance.', 'Começa por baixo.',
              'Todo elenco precisa de um desses.', 'Se ajeita aí no vestiário.',
              'Um a mais no vestiário.'],

  // escalação
  completo:  ['Time completo!', 'Escalou, hein!', 'Botou os onze!',
              'Tá escalado!', 'Time montado, hein.', 'Prontos pro apito.',
              'Fechou o time!', 'Agora é jogar.'],
  tatica:    ['Mexeu no time, hein.', 'Todo mundo trocou de lugar.',
              'Formação nova, então.', 'Mexeu no desenho.', 'Outro esquema.',
              'Redesenhou tudo.', 'Cansou do esquema antigo?',
              'Arrumou de outro jeito.'],

  // troca que melhora o time
  melhorou:  ['Agora sim, hein!', 'Boa escolha!', 'Assim o time cresce.',
              'Decisão de técnico!', 'Gostei dessa.', 'Reforçou de verdade!',
              'Melhorou demais, hein.', 'Essa foi certeira.', 'Subiu o nível.',
              'Aí sim!'],

  // troca que piora — provoca, sem ofender
  piorou:    ['Tem certeza?', 'Pensa bem, hein.', 'Esse aí é melhor?',
              'A torcida não vai gostar.', 'Coragem, hein!',
              'Olha o que você tá fazendo!', 'Tá arriscando.',
              'Enfraqueceu, hein.', 'Explica essa.', 'Duvido que dê certo.'],

  // jogador fora da posição natural
  improviso: ['Improvisou, hein.', 'Ele joga aí mesmo?', 'Vai ter que se virar.',
              'Não é ali que ele joga.', 'Improviso puro, isso aí.',
              'Vai aprender jogando.', 'Não é a casa dele.'],

  // goleiro na linha ou jogador de linha no gol
  golForaDeCasa: ['Goleiro na linha? Ousado!', 'Isso vai dar história.',
                  'No gol, com as mãos, era melhor.',
                  'Goleiro é outra profissão, hein.',
                  'Isso não vai acabar bem.', 'Coragem para inventar essa.'],

  // tirado de campo, mas segue no elenco
  tirou:     ['Vai pro banco.', 'Tá fora, esse.', 'Não joga mais hoje.',
              'Descansa um pouco.', 'Deu o que tinha que dar.',
              'Perdeu a vaga.', 'Vai esperar a chance.'],

  // jogador excluído do elenco
  dispensa:  ['Dispensado!', 'Fim de contrato.', 'Foi embora, esse.',
              'Rasgaram o contrato.', 'Esse não volta mais.', 'Fim de linha.'],

  // tocou numa carta de quem já está escalado
  jaEmCampo: ['Esse já tá jogando.', 'Esse aí tá lá dentro.', 'Já é titular.',
              'Esse aí já entrou.', 'Já tá escalado.', 'Esse já é do time.'],

  // parado com o time incompleto — cutuca, sem cobrar
  paradoIncompleto: ['Tá difícil escalar, hein?',
                     'Escolhe logo, o jogo já vai começar.',
                     'A torcida tá esperando, hein.',
                     'Ninguém disse que ser técnico era fácil.',
                     'Falta gente em campo, chefe.',
                     'O time não se escala sozinho, né.',
                     'Tá pensando ou tá travado?',
                     'Bora, o vestiário tá cheio.'],

  // parado com os onze prontos — provoca de leve
  paradoCompleto: ['Time montado. Agora é rezar.',
                   'Tá bom assim? Pensa direito.',
                   'Esse time ganha de quem?',
                   'Tá admirando a obra, é?',
                   'Já pode apitar, então.',
                   'Bonito o time, hein.',
                   'Gostou do que você fez?',
                   'Se tá bom, deixa quieto.'],
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
