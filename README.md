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
| `js/audio.js` | Trilha sonora, efeitos das ações e narração |
| `audio/trilha.mp3` | O loop da trilha, renderizado da própria síntese |
| `js/falas.js` | As 42 frases da narração |
| `js/icones.js` | Ícones em SVG |
| `sw.js` | Service Worker — cache para funcionar offline |

Os dados ficam no próprio aparelho (IndexedDB). Nada é enviado para servidor
nenhum: sem contas, sem back-end, sem rastreio.

## Som

Nada de música de terceiros: tudo é sintetizado pelo próprio código, e o que
vira arquivo é renderização dessa mesma síntese.

- **Trilha** — loop de quatro compassos (I-V-vi-IV em Lá maior, 108 BPM) com
  bumbo, chimbal, baixo sincopado, arpejo e naipe sustentado. Toca de
  `audio/trilha.mp3` (140 KB, 8,9 s em loop), renderizado a partir da classe
  `TrilhaSintetica`. Se o arquivo não carregar, a síntese ao vivo assume.
- **Efeitos** — sintetizados ao vivo, todos derivados da mesma escala da
  trilha, então qualquer combinação soa consonante.

### Por que a trilha é arquivo e os efeitos não

No iOS o Web Audio sai pelo canal da campainha, e a chavinha lateral do iPhone
o silencia; um `<audio>` sai pelo canal de mídia e não é afetado. Com a trilha
em `<audio>`, a sessão de áudio do sistema passa a ser a de mídia — o que
devolve o som dos efeitos junto, sem precisar transformá-los em arquivo.

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

- **Narração** — 42 frases para os momentos do time (criou jogador, trocou
  para melhor, trocou para pior, improvisou na posição, mudou a tática,
  dispensou). Ela toca por dois caminhos, nesta ordem:

  1. as gravações de `audio/falas/` — 42 arquivos, 342 KB, 41 segundos no
     total. Mesmo timbre em qualquer aparelho, sem depender do sistema
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

São ~700 caracteres no total, bem dentro da cota gratuita mensal do
ElevenLabs. O script pula o que já existe (use `--refazer` para regerar),
corta o silêncio das pontas e nivela o volume entre as frases.

**Licença:** áudio gerado no plano gratuito do ElevenLabs vem com restrição
de uso comercial e pedido de atribuição. Confira os termos do seu plano
antes de publicar as gravações.

Um botão no topo silencia tudo de uma vez.

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

São 14 testes ponta a ponta contra o DOM e o IndexedDB de verdade: fundar o
clube, criar jogador pela carta, moldar o radar, escalar, trocar de tática,
sobreviver a uma recarga, o campo ocupar a tela, não sobrar comportamento de
página web e o cache offline estar completo. Dois deles recarregam a página —
depois da recarga, continue com `await t.continuar()`.
