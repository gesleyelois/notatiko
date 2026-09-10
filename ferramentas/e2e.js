/* Testes ponta a ponta do NoTatiko.

   Rodam dentro do próprio aplicativo, contra o DOM e o IndexedDB de verdade —
   sem simular nada. Abra o app e, no console:

       const t = await import('./ferramentas/e2e.js'); await t.rodar();

   Cada teste devolve o que mediu, para a falha dizer o número errado e não
   só "falhou". O banco é esvaziado no começo e no fim.
*/

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// espera uma condição virar verdadeira, em vez de chutar um sleep
async function ate(cond, { limite = 4000, passo = 60, oque = 'condição' } = {}) {
  const t0 = performance.now();
  while (performance.now() - t0 < limite) {
    const v = cond();
    if (v) return v;
    await espera(passo);
  }
  throw new Error(`tempo esgotado esperando ${oque}`);
}

// As cartas do trilho e do campo distinguem toque de arrasto pela distância
// percorrida — sem coordenadas, o delta vira NaN e o toque não conta.
function toque(el) {
  if (!el) throw new Error('elemento não existe para tocar');
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, pointerId: 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  el.dispatchEvent(new PointerEvent('pointerdown', o));
  el.dispatchEvent(new PointerEvent('pointerup', o));
  window.dispatchEvent(new PointerEvent('pointerup', o));
  el.click();
}

// os campos são elementos editáveis, não <input>: quem escreve é o texto
function escrever(campo, texto) {
  campo.textContent = texto;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}

// confirma o deslizar arrastando o punho de ponta a ponta
function deslizar(seletor) {
  const el = $(seletor);
  const r = el.getBoundingClientRect();
  const y = r.top + r.height / 2;
  const ev = (t, x) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 5, clientX: x, clientY: y }));
  ev('pointerdown', r.left + 24);
  ev('pointermove', r.left + r.width * 0.5);
  ev('pointermove', r.right - 6);
  ev('pointerup', r.right - 6);
}

// tira a seleção tocando fora das cartas
function limparSelecaoTocandoFora() {
  const g = $('#gramado');
  const r = g.getBoundingClientRect();
  g.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 3, clientY: r.top + 3 }));
}

// lê os pixels de uma imagem gerada, para conferir o desenho no canvas
async function amostrar(arquivo) {
  const img = new Image();
  img.src = URL.createObjectURL(arquivo);
  await new Promise((r) => { img.onload = r; });
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  const dados = ctx.getImageData(0, 0, cv.width, cv.height).data;
  return (x, y) => {
    const i = (y * cv.width + x) * 4;
    return { r: dados[i], g: dados[i + 1], b: dados[i + 2] };
  };
}

// puxa a ficha para baixo pela alça
function puxarFichaParaBaixo(px) {
  const alca = $('#folha-alca');
  const r = alca.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const ev = (t, y) => alca.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 6, clientX: x, clientY: y }));
  ev('pointerdown', r.top);
  ev('pointermove', r.top + px / 2);
  ev('pointermove', r.top + px);
  ev('pointerup', r.top + px);
}

// arrasta uma ponta do radar até uma fração do raio
function arrastarRadar(indiceEixo, fracao) {
  const svg = $('#radar');
  const r = svg.getBoundingClientRect();
  const ang = (-90 + indiceEixo * 60) * Math.PI / 180;
  const raio = 70 * fracao;
  const x = r.left + (110 + raio * Math.cos(ang)) / 220 * r.width;
  const y = r.top + (100 + raio * Math.sin(ang)) / 200 * r.height;
  const op = { bubbles: true, pointerId: 2, clientX: x, clientY: y };
  svg.dispatchEvent(new PointerEvent('pointerdown', op));
  svg.dispatchEvent(new PointerEvent('pointermove', op));
  svg.dispatchEvent(new PointerEvent('pointerup', op));
}

async function limparBanco() {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('meu-time-db', 2);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const t = db.transaction(['jogadores', 'comissao', 'escalacao', 'time'], 'readwrite');
    ['jogadores', 'comissao', 'escalacao', 'time'].forEach((s) => t.objectStore(s).clear());
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
  db.close();
}

const TESTES = [

  ['abre no convite a criar o clube, sem time salvo', async () => {
    await limparBanco();
    location.reload();
    await espera(99999);   // a recarga interrompe; o próximo teste continua
  }, { recarrega: true }],

  ['o placar mostra o convite e o escudo pulsa', async () => {
    const emblema = await ate(() => $('#btn-time'), { oque: 'o emblema' });
    return {
      chamaAtencao: emblema.classList.contains('vazio'),
      subtitulo: $('#topo-sub').textContent,
      esperado: 'Toque para começar',
      ok: emblema.classList.contains('vazio') && $('#topo-sub').textContent === 'Toque para começar',
    };
  }],

  ['funda o clube deslizando, pelo escudo do placar', async () => {
    toque($('#btn-time'));
    const campo = await ate(() => $('#in-nome-time'), { oque: 'a ficha do clube' });
    escrever(campo, 'FURIA F.C');
    deslizar('#salvar-time');
    await ate(() => $('#topo-nome').textContent === 'FURIA F.C', { oque: 'o nome no placar' });
    return { nomeNoPlacar: $('#topo-nome').textContent, ok: true };
  }],

  ['não existe campo de formulário para o iOS querer preencher', async () => {
    toque($('#btn-time'));
    await ate(() => $('#in-nome-time'));
    // a barra de preenchimento do iOS aparece porque o campo é <input>.
    // Se não há input, não há o que a Apple ofereça preencher.
    const inputsDeTexto = $$('.folha input').filter((i) => i.type !== 'file');
    const editaveis = $$('.folha [contenteditable]');
    const escreveNoEditavel = (() => {
      escrever($('#in-nome-time'), 'TESTE DE ESCRITA');
      return $('#in-nome-time').textContent === 'TESTE DE ESCRITA';
    })();
    puxarFichaParaBaixo(400);
    await espera(600);
    return {
      inputsDeTexto: inputsDeTexto.length, editaveis: editaveis.length, escreveNoEditavel,
      ok: inputsDeTexto.length === 0 && editaveis.length > 0 && escreveNoEditavel,
    };
  }],

  ['arrastar a ficha para baixo fecha, sem precisar alcançar o X', async () => {
    const fechou = !$('#folha').classList.contains('aberta');
    toque($('#btn-time'));
    await ate(() => $('#folha').classList.contains('aberta'), { oque: 'a ficha abrir' });
    puxarFichaParaBaixo(20);                       // puxão curto: não fecha
    await espera(400);
    const segurouOCurto = $('#folha').classList.contains('aberta');
    puxarFichaParaBaixo(500);                      // puxão longo: fecha
    await ate(() => !$('#folha').classList.contains('aberta'), { oque: 'a ficha fechar' });
    return { fechouAntes: fechou, ignorouPuxaoCurto: segurouOCurto, ok: segurouOCurto };
  }],

  ['cria jogador pela carta, sem formulário nenhum', async () => {
    toque($('.carta-nova'));
    await ate(() => $('#radar'), { oque: 'a ficha do jogador' });
    const vestigios = {
      inputs: $$('.folha input').filter((i) => i.type !== 'file').length,
      rotulos: $$('.folha label:not(.carta-foto):not(.credencial-foto)').length,
      areaTracejada: $$('.folha .upload').length,
      botaoCTA: $$('.folha-rodape .btn-acento').length,
    };
    // a posição não pode vir escolhida: um ATA pré-marcado fazia o jogador
    // nascer atacante por descuido
    const posicaoLimpa = $$('.chip-pos.ativa').length === 0;
    const pedeAPosicao = $('#nome-posicao').classList.contains('pedindo');

    escrever($('#in-apelido'), 'FOGUINHO');
    toque($('.chip-pos[data-pos="ATA"]'));
    await espera(250);
    return {
      ...vestigios, posicaoLimpa, pedeAPosicao,
      nomeEditadoNaCarta: !!$('#previa .entrada-nome'),
      fotoEditadaNaCarta: !!$('#previa .carta-foto.editavel'),
      confirmaDeslizando: !!$('.deslizar'),
      posicaoPorExtenso: $('#nome-posicao').textContent,
      ok: vestigios.inputs === 0 && vestigios.rotulos === 0 && vestigios.areaTracejada === 0
          && vestigios.botaoCTA === 0 && posicaoLimpa && pedeAPosicao
          && !!$('.deslizar') && $('#nome-posicao').textContent === 'Atacante',
    };
  }],

  ['o radar molda o jogador, no eixo certo, e a nota acompanha', async () => {
    const antes = { nota: +$('#previa .carta-nota b').textContent, def: +$('#rv-def').textContent };
    arrastarRadar(1, 0.99);            // FIN ao máximo
    await espera(150);
    arrastarRadar(4, 0.15);            // DEF ao mínimo
    await espera(150);
    const fin = +$('#rv-fin').textContent;
    const def = +$('#rv-def').textContent;
    const depois = +$('#previa .carta-nota b').textContent;
    // o eixo puxado tem que ser o do dedo: já houve um bug que mexia no oposto
    return {
      finalizacao: fin, defesa: def, notaAntes: antes.nota, notaDepois: depois,
      ok: fin >= 96 && def <= 20 && depois !== antes.nota,
    };
  }],

  ['assina o contrato deslizando e a carta entra no elenco', async () => {
    deslizar('#salvar-jogador');
    await ate(() => $$('.item-trilho').length === 1, { oque: 'a carta no elenco' });
    await espera(1200);                 // deixa a revelação passar
    const rev = $('#revelacao');
    if (rev?.classList.contains('aberta')) { toque(rev); await espera(700); }
    return { noElenco: $$('.item-trilho').length, contador: $('#qtd-elenco').textContent, ok: $$('.item-trilho').length === 1 };
  }],

  ['escala tocando na posição e depois na carta', async () => {
    const slot = $('.slot[data-slot="ata"]');
    toque(slot);
    await ate(() => $('.slot.selecionado'), { oque: 'a posição selecionada' });
    toque($('.item-trilho'));
    await ate(() => $('.slot[data-slot="ata"] .carta:not(.vazia)'), { oque: 'a carta em campo' });
    return { emCampo: $('#topo-sub').textContent, ok: /1\/11/.test($('#topo-sub').textContent) };
  }],

  ['as medalhas contam Força e Sintonia', async () => {
    await espera(500);
    const forca = $('#valor-forca').textContent;
    const sint = $('#valor-encaixe').textContent;
    const arco = getComputedStyle($('#arco-forca')).getPropertyValue('--pct').trim();
    return {
      forca, sintonia: sint, arcoForca: arco,
      ok: forca !== '--' && sint !== '--' && parseFloat(arco) > 0,
    };
  }],

  ['a comissão é uma credencial editável, não um formulário', async () => {
    toque($('#aba-comissao'));
    await ate(() => !$('#trilho-comissao').hidden, { oque: 'a aba da comissão' });
    toque($('.carta-nova.comissao'));
    await ate(() => $('#in-nome-membro'), { oque: 'a ficha do membro' });
    const naCredencial = !!$('#previa-membro .entrada-nome');
    escrever($('#in-nome-membro'), 'SEU ZÉ');
    $('#in-nome-membro').focus();
    const focoMantido = document.activeElement.id === 'in-nome-membro';
    deslizar('#salvar-membro');
    await ate(() => $$('.item-comissao').length === 1, { oque: 'a credencial no trilho' });
    return { nomeNaCredencial: naCredencial, focoMantido, naComissao: $$('.item-comissao').length,
             ok: naCredencial && focoMantido && $$('.item-comissao').length === 1 };
  }],

  ['troca a tática e o campo se reorganiza', async () => {
    toque($('#aba-elenco'));
    await espera(300);
    const antes = $$('.slot').map((s) => s.dataset.slot).join();
    const nomeAntes = $('#tatica-nome').textContent;
    toque($('#btn-tatica'));
    const opcoes = await ate(() => ($$('.opcao-tatica').length ? $$('.opcao-tatica') : null), { oque: 'as táticas' });
    const outra = opcoes.find((o) => !o.classList.contains('ativa'));
    toque(outra);
    await espera(900);
    if ($('.folha-fundo')?.classList.contains('aberta')) { toque($('#folha-fechar')); await espera(500); }
    const depois = $$('.slot').map((s) => s.dataset.slot).join();
    return { taticaAntes: nomeAntes, taticaDepois: $('#tatica-nome').textContent,
             mudouOCampo: antes !== depois, ok: antes !== depois };
  }],

  ['o que foi criado sobrevive a fechar o aplicativo', async () => {
    const antes = {
      time: $('#topo-nome').textContent,
      elenco: $('#qtd-elenco').textContent,
      comissao: $('#qtd-comissao').textContent,
    };
    sessionStorage.setItem('e2e-antes', JSON.stringify(antes));
    location.reload();
    await espera(99999);
  }, { recarrega: true }],

  ['tudo voltou igual depois da recarga', async () => {
    await ate(() => $('#topo-nome').textContent !== 'Meu Time', { oque: 'o time carregado' });
    await espera(600);
    const antes = JSON.parse(sessionStorage.getItem('e2e-antes') || '{}');
    const agora = {
      time: $('#topo-nome').textContent,
      elenco: $('#qtd-elenco').textContent,
      comissao: $('#qtd-comissao').textContent,
    };
    return { antes, agora, ok: JSON.stringify(antes) === JSON.stringify(agora) };
  }],

  ['o campo domina a tela no celular', async () => {
    const g = $('.gramado').getBoundingClientRect();
    const pct = g.height / innerHeight * 100;
    const fora = $$('.slot').map((s) => s.getBoundingClientRect())
      .filter((r) => r.top < g.top - 1 || r.bottom > g.bottom + 1 || r.left < g.left - 1 || r.right > g.right + 1);
    const h = $('.hud').getBoundingClientRect();
    return {
      percentualDoCampo: pct.toFixed(0) + '%',
      slotsForaDaGrama: fora.length,
      hudAlinhadoAoCampo: [Math.round(h.left - g.left), Math.round(h.right - g.right)],
      ok: pct >= 60 && fora.length === 0,
    };
  }],

  ['o círculo do campo é redondo, e nada é pintado no meio', async () => {
    const svg = $('#linhas-campo');
    const c = $('.linha-campo circle').getBoundingClientRect();
    const g = $('#gramado').getBoundingClientRect();
    const [, , vbLargura, vbAltura] = svg.getAttribute('viewBox').split(' ').map(Number);

    const proporcaoDoCirculo = c.width / c.height;
    // a caixa do gramado tem que ter a proporção do desenho: é a diferença
    // entre as duas que estica o campo e achata o círculo
    const proporcaoDaCaixa = g.width / g.height;
    const proporcaoDoDesenho = vbLargura / vbAltura;

    return {
      circulo: [Math.round(c.width), Math.round(c.height)],
      proporcaoDoCirculo: +proporcaoDoCirculo.toFixed(3),
      caixa: [Math.round(g.width), Math.round(g.height)],
      desenho: [vbLargura, vbAltura],
      // nada de escudo pintado no gramado
      imagensNoCampo: svg.querySelectorAll('image').length,
      ok: Math.abs(proporcaoDoCirculo - 1) < 0.02
          && Math.abs(proporcaoDaCaixa - proporcaoDoDesenho) < 0.01
          && svg.querySelectorAll('image').length === 0,
    };
  }],

  ['o comprimento do campo acompanha a tela, dentro da regra', async () => {
    const { dentroDaRegra, alturaDoCampo, PROPORCAO_MIN, PROPORCAO_MAX } = await import('../js/campo.js');
    const svg = $('#linhas-campo');
    const palco = $('.palco').getBoundingClientRect();
    const [, , , alturaAtual] = svg.getAttribute('viewBox').split(' ').map(Number);

    return {
      proporcaoDoPalco: +(palco.width / palco.height).toFixed(3),
      alturaDesenhada: alturaAtual,
      esperada: alturaDoCampo(palco.width / palco.height),
      faixa: [PROPORCAO_MIN, PROPORCAO_MAX],
      // 68m de largura por 90m a 120m de comprimento
      dentroDaFaixa: dentroDaRegra(0.2) === PROPORCAO_MIN && dentroDaRegra(9) === PROPORCAO_MAX,
      ok: alturaAtual === alturaDoCampo(palco.width / palco.height)
          && dentroDaRegra(0.2) === PROPORCAO_MIN && dentroDaRegra(9) === PROPORCAO_MAX,
    };
  }],

  ['o placar não encosta no gramado', async () => {
    const grama = $('#gramado').getBoundingClientRect();
    const rotulos = $$('.medalha span').map((el) => el.getBoundingClientRect());
    const folgas = rotulos.map((r) => +(grama.top - r.bottom).toFixed(1));
    const hud = $('.hud').getBoundingClientRect();
    // a medalha inteira tem que caber no HUD: o rótulo de baixo não pode
    // vazar para dentro do campo, nem o anel para cima da barra do sistema
    const medalha = $('#metrica-forca').getBoundingClientRect();

    return {
      folgaAteAGrama: folgas,
      sobraNoTopo: +(medalha.top - hud.top).toFixed(1),
      ok: folgas.length === 2 && folgas.every((f) => f >= 3) && medalha.top >= hud.top - 1,
    };
  }],

  ['nada na tela se comporta como página web', async () => {
    const corpo = getComputedStyle(document.body);
    const semRealce = getComputedStyle(document.documentElement).webkitTapHighlightColor;
    return {
      selecaoDeTexto: corpo.userSelect,
      rolagemElastica: corpo.overscrollBehavior,
      realceAoTocar: semRealce,
      camposDeFormulario: $$('input[type=range], select, textarea').length,
      ok: corpo.userSelect === 'none' && corpo.overscrollBehavior === 'none'
          && $$('input[type=range], select, textarea').length === 0,
    };
  }],

  ['dá para calar a trilha e manter a narração', async () => {
    const m = await import('../js/audio.js');
    toque($('#btn-som'));
    await ate(() => $('#painel-som'), { oque: 'o painel do som' });
    const canais = $$('.canal').map((c) => c.dataset.canal);

    // parte de um estado conhecido: as preferências ficam salvas entre
    // sessões, então o teste não pode supor como o usuário deixou
    for (const c of $$('.canal')) if (!c.classList.contains('ligado')) { toque(c); await espera(200); }
    const todosLigados = $$('.canal.ligado').length === 3;

    toque($('.canal[data-canal="trilha"]'));
    await espera(500);
    const depois = {
      trilhaLigada: $('.canal[data-canal="trilha"]').classList.contains('ligado'),
      trilhaTocando: m.trilha.tocando,
      vozes: m.narrador.ligado,
      efeitos: m.efeitos.ligado,
    };
    toque($('.canal[data-canal="trilha"]'));    // devolve como estava
    await espera(300);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8 }));
    await espera(300);
    return {
      canais, partiuDeTodosLigados: todosLigados, aoCalarATrilha: depois,
      ok: canais.length === 3 && todosLigados
          && depois.trilhaLigada === false && depois.trilhaTocando === false
          && depois.vozes === true && depois.efeitos === true,
    };
  }],

  ['goleiro e jogador de linha têm características diferentes', async () => {
    // goleiro pela carta
    toque($('.carta-nova'));
    await ate(() => $('#radar'), { oque: 'a ficha' });
    escrever($('#in-apelido'), 'PAREDÃO');
    toque($('.chip-pos[data-pos="GOL"]'));
    await espera(400);
    const doGoleiro = $$('#radar .radar-sigla').map((t) => t.textContent);
    // as alternativas de um goleiro não podem incluir posição de linha
    const altsDoGoleiro = $$('.chip-alt').map((c) => c.dataset.pos);

    toque($('.chip-pos[data-pos="ATA"]'));
    await espera(400);
    const doAtacante = $$('#radar .radar-sigla').map((t) => t.textContent);
    const altsDoAtacante = $$('.chip-alt').map((c) => c.dataset.pos);

    puxarFichaParaBaixo(500);
    await espera(600);
    return {
      goleiro: doGoleiro, atacante: doAtacante,
      alternativasDoGoleiro: altsDoGoleiro, alternativasDoAtacante: altsDoAtacante,
      ok: doGoleiro.join() === 'ELA,MAN,REF,POS,REP,VEL'
          && doAtacante.join() === 'RIT,FIN,PAS,DRI,DEF,FIS'
          // a fronteira do gol não se atravessa nas alternativas
          && altsDoGoleiro.length === 0
          && !altsDoAtacante.includes('GOL'),
    };
  }],

  ['a segunda função não conta como improviso', async () => {
    // jogador próprio, para não depender de quem já está em campo
    toque($('.carta-nova'));
    await ate(() => $('#radar'), { oque: 'a ficha' });
    escrever($('#in-apelido'), 'CURINGA');
    toque($('.chip-pos[data-pos="VOL"]'));
    await ate(() => $('#alternativas-chips .chip-alt'), { oque: 'as alternativas' });
    toque($('.chip-alt[data-pos="ZAG"]'));
    await espera(300);
    const marcada = $('.chip-alt[data-pos="ZAG"]').classList.contains('ativa');
    deslizar('#salvar-jogador');
    await espera(1500);
    if ($('#revelacao')?.classList.contains('aberta')) { toque($('#revelacao')); await espera(800); }

    // escala no ZAG, que é a segunda função dele
    toque($('.slot[data-slot="zag1"]'));
    await ate(() => $('.slot.selecionado'), { oque: 'a posição' });
    const disponivel = await ate(() => $$('.item-trilho:not(.escalado)')
      .find((el) => el.textContent.includes('CURINGA')), { oque: 'o CURINGA no elenco' });
    toque(disponivel);
    await ate(() => $('.slot[data-slot="zag1"] .carta:not(.vazia)'), { oque: 'a carta no ZAG' });

    const slot = $('.slot[data-slot="zag1"]');
    return {
      marcouAlternativa: marcada,
      acusaImproviso: !!slot.querySelector('.aviso-posicao'),
      pilulaEmAmbar: !!slot.querySelector('.pilula.fora'),
      ok: marcada && !slot.querySelector('.aviso-posicao') && !slot.querySelector('.pilula.fora'),
    };
  }],

  ['as ações de confirmar não dependem de ler texto', async () => {
    // um descartável, para o teste poder excluir de verdade
    toque($('.carta-nova'));
    await ate(() => $('#radar'), { oque: 'a ficha' });
    escrever($('#in-apelido'), 'DESCARTAVEL');
    toque($('.chip-pos[data-pos="MC"]'));
    await espera(250);
    deslizar('#salvar-jogador');
    await espera(1500);
    if ($('#revelacao')?.classList.contains('aberta')) { toque($('#revelacao')); await espera(800); }

    const antes = $$('.item-trilho').length;
    const alvo = await ate(() => $$('.item-trilho:not(.escalado)')
      .find((el) => el.textContent.includes('DESCARTAVEL')), { oque: 'o descartável' });
    toque(alvo);
    await ate(() => $('.acoes-carta button[data-acao="excluir"]'), { oque: 'as ações da carta' });
    toque($('.acoes-carta button[data-acao="excluir"]'));
    await ate(() => $('#dialogo-fundo').classList.contains('aberto'), { oque: 'o diálogo' });

    const nao = $('#dialogo-nao'), sim = $('#dialogo-sim');
    const medido = {
      textoNosBotoes: [nao.textContent.trim(), sim.textContent.trim()],
      temIcone: [!!nao.querySelector('svg'), !!sim.querySelector('svg')],
      rotuloParaLeitorDeTela: [nao.getAttribute('aria-label'), sim.getAttribute('aria-label')],
    };

    toque(nao);                       // cancelar não pode excluir
    await espera(500);
    const depoisDeCancelar = $$('.item-trilho').length;

    return {
      ...medido, antes, depoisDeCancelar,
      ok: medido.textoNosBotoes.join('') === ''
          && medido.temIcone[0] && medido.temIcone[1]
          && !!medido.rotuloParaLeitorDeTela[0] && !!medido.rotuloParaLeitorDeTela[1]
          && depoisDeCancelar === antes,
    };
  }],

  ['o atalho de escalar só aparece quando há vaga para a posição', async () => {
    // o CURINGA é VOL com ZAG como segunda função, e já está escalado no ZAG.
    // Vamos usar o DESCARTAVEL (MC), cuja vaga está livre.
    const livre = await ate(() => $$('.item-trilho:not(.escalado)')[0], { oque: 'uma carta livre' });
    toque(livre);
    await ate(() => $('.acoes-carta'), { oque: 'as ações da carta' });
    const comVaga = $$('.acoes-carta button').map((b) => b.dataset.acao);
    const rotulo = $('.acoes-carta button[data-acao="escalar"]')?.getAttribute('aria-label');
    limparSelecaoTocandoFora();
    await espera(400);

    // agora enche o campo e confere que o atalho some
    const antes = $$('.slot .carta.vazia').length;
    for (const slot of $$('.slot')) {
      if (!slot.querySelector('.carta.vazia')) continue;
      const disponivel = $$('.item-trilho:not(.escalado)')[0];
      if (!disponivel) break;
      toque(slot);
      await espera(150);
      toque(disponivel);
      await espera(250);
    }
    const sobrou = $$('.item-trilho:not(.escalado)')[0];
    let semVaga = null;
    if (sobrou) {
      toque(sobrou);
      await ate(() => $('.acoes-carta'), { oque: 'as ações' });
      semVaga = $$('.acoes-carta button').map((b) => b.dataset.acao);
      limparSelecaoTocandoFora();
      await espera(300);
    }
    return {
      comVagaLivre: comVaga, rotuloDizOnde: rotulo, semVagaParaAPosicao: semVaga,
      vagasAntes: antes,
      ok: comVaga.includes('escalar') && /Escalar como \w+/.test(rotulo || '')
          && (semVaga === null || !semVaga.includes('escalar')),
    };
  }],

  ['o narrador tem o que dizer quando o técnico trava', async () => {
    const falas = (await import('../js/falas.js')).FALAS;
    const m = await import('../js/audio.js');
    const grupos = ['paradoIncompleto', 'paradoCompleto'];
    const semAudio = [];
    for (const g of grupos) for (const t of falas[g] || []) if (!m.narrador.gravacoes?.[t]) semAudio.push(t);
    return {
      incompleto: falas.paradoIncompleto?.length ?? 0,
      completo: falas.paradoCompleto?.length ?? 0,
      totalNoCatalogo: Object.values(falas).reduce((a, v) => a + v.length, 0),
      semGravacao: semAudio,
      ok: (falas.paradoIncompleto?.length ?? 0) >= 6
          && (falas.paradoCompleto?.length ?? 0) >= 6
          && semAudio.length === 0,
    };
  }],

  ['quem está em campo ganha selo, e o aviso virou voz', async () => {
    const m = await import('../js/audio.js');
    const escalado = await ate(() => $('.item-trilho.escalado'), { oque: 'uma carta escalada' });
    const selo = escalado.querySelector('.selo-em-campo');
    const livre = $('.item-trilho:not(.escalado)');

    // a carta apaga, mas o selo continua aceso: é ele que explica o apagamento
    const opacidades = {
      carta: getComputedStyle(escalado.querySelector('.carta')).opacity,
      selo: selo ? getComputedStyle(selo).opacity : null,
    };

    m.narrador.ligado = true;
    m.narrador.ultimaFala = 0;
    const dito = [];
    const original = m.narrador.dizer.bind(m.narrador);
    m.narrador.dizer = (t) => { dito.push(t); return original(t); };

    escalado.click();
    await espera(500);
    const torrada = $('.toast');
    m.narrador.dizer = original;

    const falas = (await import('../js/falas.js')).FALAS;
    return {
      temSelo: !!selo, semSeloNoLivre: livre ? !livre.querySelector('.selo-em-campo') : true,
      opacidades, disse: dito, semTorrada: !torrada,
      frasesNoCatalogo: Object.values(falas).reduce((a, v) => a + v.length, 0),
      // conteúdo, não contagem: uma narração atrasada da ação anterior pode
      // cair nesta janela sem que nada esteja errado
      ok: !!selo && opacidades.selo === '1' && +opacidades.carta < .5
          && !torrada && dito.some((t) => falas.jaEmCampo.includes(t)),
    };
  }],

  ['os efeitos não dependem da trilha estar tocando', async () => {
    // No iOS quem põe a sessão de áudio em modo mídia é um <audio> tocando.
    // Enquanto os efeitos eram Web Audio, calar a música os calava junto.
    const m = await import('../js/audio.js');
    toque($('#btn-som'));
    await ate(() => $('#painel-som'), { oque: 'o painel do som' });
    const trilha = $('.canal[data-canal="trilha"]');
    if (trilha.classList.contains('ligado')) { toque(trilha); await espera(500); }
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8 }));
    await espera(300);

    m.efeitos.tocar('guardar');
    await espera(400);
    const el = m.efeitos.arquivos.get('guardar');

    toque($('#btn-som'));                      // devolve a trilha
    await ate(() => $('#painel-som'));
    if (!$('.canal[data-canal="trilha"]').classList.contains('ligado')) {
      toque($('.canal[data-canal="trilha"]'));
      await espera(300);
    }
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9 }));
    await espera(300);

    return {
      trilhaEstavaParada: true,
      efeitoVeioDeArquivo: !!el && el.src.endsWith('guardar.mp3'),
      efeitoTocou: !!el && el.currentTime > 0,
      semContextoWebAudio: !m.efeitos.ctx,
      ok: !!el && el.src.endsWith('guardar.mp3') && el.currentTime > 0 && !m.efeitos.ctx,
    };
  }],

  ['a escalação vira imagem, do tamanho de um story', async () => {
    toque($('#btn-compartilhar'));
    await ate(() => $('#previa-partilha img'), { oque: 'a prévia da escalação', limite: 20000 });
    const img = $('#previa-partilha img');
    await ate(() => img.naturalWidth > 0, { oque: 'a imagem carregar' });

    const medido = {
      largura: img.naturalWidth,
      altura: img.naturalHeight,
      temSaida: !!$('#enviar-escalacao'),
      // a imagem tem que poder ser salva segurando o dedo: é o caminho de
      // quem não usa a folha de partilha
      menuDoSistema: getComputedStyle(img).webkitTouchCallout,
    };
    toque($('#folha-fechar'));
    await espera(400);
    return {
      ...medido,
      ok: medido.largura === 1080 && medido.altura === 1620
          && medido.temSaida && medido.menuDoSistema !== 'none',
    };
  }],

  ['a marca do clube vai inteira, na placa de pontas arredondadas', async () => {
    const mod = await import('../js/compartilhar.js');
    const { slotsDaTatica } = await import('../js/taticas.js');

    // uma marca quadrada de cor única: se algum recorte comer as pontas,
    // os cantos dela deixam de ser dessa cor
    const cv = document.createElement('canvas');
    cv.width = cv.height = 120;
    const pincel = cv.getContext('2d');
    pincel.fillStyle = '#ff00d4';
    pincel.fillRect(0, 0, 120, 120);

    const arquivo = await mod.imagemDaEscalacao({
      time: { nome: 'TESTE', escudo: cv.toDataURL('image/png') },
      tatica: { formacao: '4-3-3', variacao: 'Clássico' },
      forca: 70, sintonia: 80,
      slots: slotsDaTatica('4-3-3', 'Clássico').map((s) => ({ x: s.x, y: s.y, pos: s.pos, jogador: null })),
    });
    const cor = await amostrar(arquivo);
    const ehMarca = ({ r, g, b }) => r > 180 && g < 90 && b > 140;
    const ehFundo = ({ r, g, b }) => r < 45 && g < 45 && b < 60;
    const ehGrama = ({ r, g, b }) => g > r && g > b;

    /* A placa mede 144 em (24, 18), com a marca encaixada dentro dela —
       de (34, 28) a (158, 152).                                        */
    const medido = {
      marcaNoCantoDeCima: cor(40, 34),
      marcaNoCantoDeBaixo: cor(150, 144),
      // a placa toma a cor do fundo da marca: a borda do arquivo some
      placa: cor(28, 90),
      // a ponta da placa é arredondada: ali fora já é fundo da imagem
      pontaArredondada: cor(26, 20),
      // e o gramado não tem marca nenhuma
      cantoDoCampo: cor(70, 1500),
      meioDoCampo: cor(540, 860),
    };
    return {
      ...medido,
      ok: ehMarca(medido.marcaNoCantoDeCima) && ehMarca(medido.marcaNoCantoDeBaixo)
          && ehMarca(medido.placa) && ehFundo(medido.pontaArredondada)
          && ehGrama(medido.cantoDoCampo) && ehGrama(medido.meioDoCampo),
    };
  }],

  ['os onze vão como carta, não como bolinha', async () => {
    const mod = await import('../js/compartilhar.js');
    const { slotsDaTatica } = await import('../js/taticas.js');

    const slots = slotsDaTatica('4-3-3', 'Clássico').map((s) => ({
      x: s.x, y: s.y, pos: s.pos,
      jogador: s.pos === 'ATA' ? {
        apelido: 'CRAQUE', foto: '', nota: 78, tier: 'ouro', posicao: 'ATA',
        alternativas: '', stats: [80, 78, 70, 76, 40, 72], fora: false,
      } : null,
    }));
    const arquivo = await mod.imagemDaEscalacao({
      time: { nome: 'TESTE', escudo: '' },
      tatica: { formacao: '4-3-3', variacao: 'Clássico' },
      forca: 78, sintonia: 100, slots,
    });

    const cor = await amostrar(arquivo);
    // a liga do ouro vai do creme ao dourado escuro: quente, e nunca verde
    let metal = 0;
    for (let x = 0; x < 1080; x += 2) {
      for (let y = 200; y < 1560; y += 2) {
        const { r, g, b } = cor(x, y);
        if (r > 150 && r > b + 40 && g > b) metal++;
      }
    }
    metal *= 4;   // a varredura foi de dois em dois, nos dois eixos

    // a bolinha de antes tinha 52 de raio: 8.500 pixels no total. A carta
    // mede 7,4 por 10,36 ems — mais de trinta mil.
    return { pixelsDeMetal: metal, bolinhaTeria: Math.round(Math.PI * 52 * 52), ok: metal > 20000 };
  }],

  ['funciona offline: tudo que o app precisa está no cache', async () => {
    const nomes = await caches.keys();
    if (!nomes.length) return { cache: 'nenhum', ok: false, nota: 'o Service Worker ainda não instalou' };
    const c = await caches.open(nomes[0]);
    const urls = (await c.keys()).map((k) => new URL(k.url).pathname);
    const precisa = ['/index.html', '/css/style.css', '/js/app.js', '/js/audio.js',
      '/js/campo.js', '/js/compartilhar.js', '/js/falas.js',
      '/audio/trilha.mp3', '/audio/efeitos/guardar.mp3'];
    const faltando = precisa.filter((p) => !urls.some((u) => u.endsWith(p)));
    return {
      cache: nomes[0], itens: urls.length,
      falasGravadas: urls.filter((u) => u.includes('/falas/') && u.endsWith('.mp3')).length,
      faltando, ok: faltando.length === 0,
    };
  }],
];

export async function rodar({ de = 0 } = {}) {
  const feitos = JSON.parse(sessionStorage.getItem('e2e-resultados') || '[]');

  for (let i = de; i < TESTES.length; i++) {
    const [nome, fn, opc = {}] = TESTES[i];
    if (opc.recarrega) {
      // o teste recarrega a página: guarda onde parar e continua sozinho
      sessionStorage.setItem('e2e-resultados', JSON.stringify(feitos));
      sessionStorage.setItem('e2e-proximo', String(i + 1));
      fn().catch(() => {});
      return { recarregando: true, proximo: i + 1 };
    }
    try {
      const r = await fn();
      feitos.push({ teste: nome, passou: !!r.ok, medido: r });
    } catch (e) {
      feitos.push({ teste: nome, passou: false, erro: String(e.message || e) });
    }
    sessionStorage.setItem('e2e-resultados', JSON.stringify(feitos));
  }

  sessionStorage.removeItem('e2e-proximo');
  const passou = feitos.filter((f) => f.passou).length;
  return { total: feitos.length, passou, falhou: feitos.length - passou, resultados: feitos };
}

// continua sozinho depois de uma recarga
export async function continuar() {
  const prox = sessionStorage.getItem('e2e-proximo');
  if (prox === null) return null;
  return rodar({ de: +prox });
}

export function limparResultados() {
  sessionStorage.removeItem('e2e-resultados');
  sessionStorage.removeItem('e2e-proximo');
  sessionStorage.removeItem('e2e-antes');
}
