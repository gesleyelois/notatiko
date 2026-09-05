# NoTatiko

Monte seu time de futebol com cards de score. Crie jogadores com foto, posição e
características, escolha a tática e escale os 11 em campo — tudo offline, direto
do navegador.

![NoTatiko](icons/icon-192.png)

## O que dá para fazer

- **Criar o clube** — nome e escudo, que aparece no topo do app e pintado no círculo central do gramado.
- **Criar jogadores** — apelido, foto, posição e seis características (Ritmo, Finalização, Passe, Drible, Defesa, Físico). A carta é montada ao vivo enquanto você ajusta.
- **Escalar** — arraste do elenco para o campo, ou toque no jogador e depois na posição. As cartas voam até o lugar.
- **19 táticas** — 10 formações com variações (4-4-2 Losango, 4-3-3 Falso 9, 3-5-2 Alas ofensivos…), escolhidas pelo desenho do time.
- **Força e Sintonia** — dois indicadores que explicam a qualidade do time e o encaixe de cada um na posição.

## Como as notas funcionam

A nota de um jogador é a média das seis características **ponderada pela posição
em que ele está jogando**: um zagueiro vale pela defesa e pelo físico; um
atacante, pela finalização e pelo ritmo. Por isso escalar alguém fora de posição
custa nota de verdade — e goleiro em campo (ou jogador de linha no gol) sofre uma
penalidade extra, porque defender gol é outro ofício.

- **Força** — média das notas dos 11 nas posições em que foram escalados.
- **Sintonia** — o quanto o time joga onde deveria. Posição exata vale 100%, mesmo setor 60%, setor vizinho 25%.

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
| `js/audio.js` | Trilha sonora e efeitos das ações |
| `js/icones.js` | Ícones em SVG |
| `sw.js` | Service Worker — cache para funcionar offline |

Os dados ficam no próprio aparelho (IndexedDB). Nada é enviado para servidor
nenhum: sem contas, sem back-end, sem rastreio.

## Som

Tudo é sintetizado no navegador, sem nenhum arquivo de áudio:

- **Trilha** — loop de quatro compassos (I-V-vi-IV em Lá maior, 108 BPM) com
  bumbo, chimbal, baixo sincopado, arpejo e naipe sustentado.
- **Efeitos** — todos derivados da mesma escala da trilha, então qualquer
  combinação soa consonante.
- **Narração** — usa a voz do próprio aparelho (Web Speech API) para comentar
  os momentos do time. Sem voz instalada no sistema, o app avisa e segue só
  com música e efeitos.

Um botão no topo silencia tudo de uma vez.

## Instalando como app

Abra no celular e use "Adicionar à tela de início". É um PWA: instala, abre em
tela cheia e funciona sem internet.
