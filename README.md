# NoTatiko

Monte seu time de futebol com cards de score. Crie jogadores com foto, posição e
características, escolha a tática e escale os 11 em campo — tudo offline, direto
do navegador.

![NoTatiko](icons/icon-192.png)

## O que dá para fazer

- **Criar o clube** — nome e escudo, que aparece no topo do app e pintado no círculo central do gramado.
- **Criar jogadores** — a carta *é* o formulário: o apelido se escreve nela, a
  foto se troca tocando nela, e as seis características (Ritmo, Finalização,
  Passe, Drible, Defesa, Físico) viram um hexágono que se molda com o dedo.
  A posição não vem escolhida — é a escolha dela que dá forma ao jogador.
  Confirma-se deslizando, não apertando botão.
- **Escalar** — arraste do elenco para o campo, ou toque no jogador e depois na posição. As cartas voam até o lugar.
- **19 táticas** — 10 formações com variações (4-4-2 Losango, 4-3-3 Falso 9, 3-5-2 Alas ofensivos…), escolhidas pelo desenho do time.
- **Força e Sintonia** — duas medalhas no placar, com o arco contando o valor.
  Toque para ver de onde cada número saiu.
- **Compartilhar** — o time inteiro num arquivo, para quem tem o app; só a
  escalação numa imagem, para qualquer um.

## Como as notas funcionam

São **dois ofícios, não um**. O jogador de linha tem Ritmo, Finalização, Passe,
Drible, Defesa e Físico; o goleiro tem Elasticidade, Manejo, Reflexos,
Posicionamento, Reposição e Velocidade. "Defesa" de um zagueiro é marcação; de
um goleiro é defender chute — eram duas coisas medidas pelo mesmo número.

A nota é a média das seis **ponderada pela posição em que ele está jogando**: um
zagueiro vale pela defesa e pelo físico; um atacante, pela finalização e pelo
ritmo. Escalar fora de posição custa nota de verdade.

Cruzando a fronteira do gol não há atributo em comum, então a nota vira uma
aproximação declarada: um jogador de linha no gol vale pelo que leva para lá
(defesa, físico e ritmo) e um goleiro na linha, pela saída e pelo pé — os dois
com desconto pesado, porque improvisar no ofício alheio custa caro.

Cada jogador pode ter até **duas segundas funções**. Jogar numa delas não conta
como improviso e quase não custa sintonia. A fronteira do gol não se atravessa:
goleiro não é alternativa de ninguém, nem ninguém é alternativa de goleiro.

- **Força** — média das notas dos 11 nas posições em que foram escalados.
- **Sintonia** — o quanto o time joga onde sabe. Posição principal vale 100%,
  uma segunda função 85%, mesmo setor 60%, setor vizinho 25%.

## Compartilhando

Não há servidor, conta nem link: o app monta o que vai ser compartilhado e
entrega à folha de partilha do sistema — o mesmo caminho de uma foto. Quem
escolhe o destino é você, e nada sai por conta própria. Onde não existe folha
de partilha (a maioria dos navegadores de computador), o arquivo é baixado.

São dois presentes para dois destinatários diferentes:

- **O time inteiro** vira um arquivo `.notatiko.json` com escudo, elenco,
  comissão, tática e escalação. Só quem tem o NoTatiko abre — e abre com o
  time igual, fotos e notas inclusive.
- **Só a escalação** vira uma imagem 1080×1620 com o gramado, os onze nas
  posições, as notas, a tática e as duas medalhas. Serve para qualquer um: o
  grupo do WhatsApp não precisa instalar nada. O campo é desenhado num
  `canvas`, não fotografado da tela — assim sai do mesmo tamanho em qualquer
  aparelho, sem HUD, sem elenco e sem a barra do sistema no meio.

### Recebendo um time

O arquivo abre pela mesma ficha, em *Receber*. Antes de mexer em qualquer
coisa, o app mostra o que veio e pergunta o que fazer:

- **Só trazer os jogadores** — eles entram no seu elenco como reforço, com
  identificadores novos. Seu clube, sua comissão e sua escalação ficam como
  estavam.
- **Substituir** — o aparelho passa a ter o time recebido, e só ele. Como é
  destrutivo, confirma-se deslizando.

Arquivo de outra pessoa é dado de fora, e é tratado como tal: nada dele é
aproveitado inteiro. Cada campo é copiado para um objeto novo, os textos são
cortados no limite, as notas ficam entre 1 e 99, posição e função têm que
existir no jogo, a vaga tem que existir naquela tática, e foto e escudo só
passam se forem `data:` de imagem — a foto é escrita no `src` de uma `<img>`,
então uma string qualquer ali seria HTML dentro da carta. A fronteira do gol
também vale para o que chega: goleiro não entra como segunda função de
ninguém.

## Rodando localmente

```bash
python3 serve.py
```

Abre em `http://localhost:4173`. O `serve.py` é um servidor estático simples com
cabeçalhos anti-cache — útil porque o Service Worker atrapalha o
desenvolvimento quando o navegador guarda versões antigas.

## Como foi feito

Sem framework, sem build, sem dependências: HTML, CSS e JavaScript com módulos ES.

| Arquivo | Papel |
|---|---|
| `js/app.js` | Estado, renderização, arrastar e soltar, animações |
| `js/taticas.js` | As 19 táticas e suas coordenadas em campo |
| `js/db.js` | Persistência em IndexedDB |
| `js/compartilhar.js` | Arquivo do time, imagem da escalação e leitura do que chega |
| `js/audio.js` | Trilha sonora, efeitos das ações e narração |
| `audio/trilha.mp3` | O loop da trilha, renderizado da própria síntese |
| `js/falas.js` | As 42 frases da narração |
| `js/icones.js` | Ícones em SVG |
| `sw.js` | Service Worker — cache para funcionar offline |

Os dados ficam no próprio aparelho (IndexedDB). Nada é enviado para servidor
nenhum: sem contas, sem back-end, sem rastreio. Compartilhar também não muda
isso — o arquivo e a imagem são montados no aparelho e entregues à folha de
partilha do sistema, que é quem pergunta para onde vão.

## Som

Nada de música de terceiros: tudo é sintetizado pelo próprio código, e o que
vira arquivo é renderização dessa mesma síntese.

- **Trilha** — loop de quatro compassos (I-V-vi-IV em Lá maior, 108 BPM) com
  bumbo, chimbal, baixo sincopado, arpejo e naipe sustentado. Toca de
  `audio/trilha.mp3` (140 KB, 8,9 s em loop), renderizado a partir da classe
  `TrilhaSintetica`. Se o arquivo não carregar, a síntese ao vivo assume.
- **Efeitos** — 11 sons derivados da mesma escala da trilha, então qualquer
  combinação soa consonante. Tocam de `audio/efeitos/` (51 KB no total),
  renderizados da própria síntese com um ganho único, para a mixagem entre
  eles sobreviver. A síntese ao vivo fica como reserva.

### Por que tudo virou arquivo

No iOS o Web Audio sai pelo canal da campainha, e a chavinha lateral do iPhone
o silencia; um `<audio>` sai pelo canal de mídia e não é afetado.

A trilha em `<audio>` chegou a resolver os efeitos de tabela — enquanto ela
tocava, a sessão do sistema ficava em modo mídia e o Web Audio voltava a ser
ouvido. Mas era dependência frágil: bastou o painel do som permitir calar a
música para os efeitos sumirem junto. Por isso eles também viraram arquivo, e
o Web Audio deixou de estar no caminho crítico.

### Gerando a trilha

Sirva o projeto e abra
`http://localhost:4173/ferramentas/gerar-trilha.html`. A página renderiza o
loop com as vozes reais da trilha, monta a emenda sem estalo (dobra para o
início a cauda que passa do fim), normaliza em −1 dBFS e baixa o WAV:

```bash
ffmpeg -y -i trilha-bruta.wav -codec:a libmp3lame -b:a 128k -ac 1 audio/trilha.mp3
```
Trilha, efeitos e narração têm chaves separadas no painel do som: dá para
calar a música e continuar ouvindo o narrador.

- **Narração** — 117 frases para os momentos do time (criou jogador, trocou
  para melhor, trocou para pior, improvisou na posição, mudou a tática,
  dispensou, tocou em quem já está escalado) e para o silêncio: parado com o
  time pela metade, o narrador cutuca. Ela toca por dois caminhos, nesta
  ordem:

  1. as gravações de `audio/falas/` — 117 arquivos, 1 MB. Havendo
     gravações, o sorteio só considera frases que têm áudio: acrescentar
     frase ao catálogo nunca mistura a voz gravada com a do aparelho no meio
     da mesma sessão. Mesmo timbre em qualquer aparelho, sem depender do sistema
     operacional. O Service Worker guarda todas na instalação, então
     funcionam offline;
  2. a voz do próprio aparelho (Web Speech API), se as gravações não
     carregarem. Sem voz instalada no sistema, o app segue só com música e
     efeitos.

### Gerando as gravações

As frases moram em `js/falas.js`, que é a fonte única: o texto que aparece
na tela e o que a voz diz saem da mesma lista.

```bash
printf %s 'sua-chave' > .chave-elevenlabs         # ignorado pelo git
python3 ferramentas/gerar-vozes.py --vozes        # escolhe a voz
python3 ferramentas/gerar-vozes.py --voz <id>     # gera audio/falas/
```

A chave também pode vir de `ELEVENLABS_API_KEY`, desde que exportada na
mesma shell que roda o script.

São ~2300 caracteres no total, bem dentro da cota gratuita mensal do
ElevenLabs. O script pula o que já existe, corta o silêncio das pontas e
nivela o volume entre as frases. O índice lista só o que tem mp3 no disco.

Trocar o **texto** de uma frase sem mudar a posição dela é o caso perigoso:
o arquivo se chama grupo+posição, então o mp3 antigo continuaria no lugar
dizendo outra coisa. O script compara o catálogo com o índice anterior e
regera só o que mudou (`--refazer` força tudo).

**Licença:** áudio gerado no plano gratuito do ElevenLabs vem com restrição
de uso comercial e pedido de atribuição. Confira os termos do seu plano
antes de publicar as gravações.

Um botão no topo silencia tudo de uma vez.

## Profundidade

Sem perspectiva no gramado. Inclinar o campo em `rotateX` é o gesto óbvio de
"3D", mas custa justamente o que mais falta no celular: altura. A ponta longe
comprime, a perto pede folga, e o campo encolhe — foi tentado e os atacantes
acabaram fora da grama.

A profundidade vem de luz e sombra, que não custam layout: o gramado é uma
bacia iluminada de cima, e a sombra de cada carta cresce com o `--escala`, que
já aumenta conforme a carta se aproxima da base do campo. A carta da ficha,
essa sim, gira em perspectiva sob o dedo, com o brilho correndo pela
superfície.

## Instalando como app

Abra no celular e use "Adicionar à tela de início". É um PWA: instala, abre em
tela cheia e funciona sem internet.

## Testes

```bash
python3 serve.py
```

Com o app aberto, no console do navegador:

```js
const t = await import('./ferramentas/e2e.js'); await t.rodar();
```

São 30 testes ponta a ponta contra o DOM e o IndexedDB de verdade: fundar o
clube, criar jogador pela carta, moldar o radar, escalar, trocar de tática,
sobreviver a uma recarga, o campo ocupar a tela, não sobrar comportamento de
página web, o time ir e voltar de um arquivo sem perder nada, a escalação
virar imagem, um arquivo de fora não conseguir entrar com HTML nem com nota
inventada e o cache offline estar completo. Dois deles recarregam a página —
depois da recarga, continue com `await t.continuar()`.
