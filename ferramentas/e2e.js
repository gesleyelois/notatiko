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

function toque(el) {
  if (!el) throw new Error('elemento não existe para tocar');
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
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

  ['funciona offline: tudo que o app precisa está no cache', async () => {
    const nomes = await caches.keys();
    if (!nomes.length) return { cache: 'nenhum', ok: false, nota: 'o Service Worker ainda não instalou' };
    const c = await caches.open(nomes[0]);
    const urls = (await c.keys()).map((k) => new URL(k.url).pathname);
    const precisa = ['/index.html', '/css/style.css', '/js/app.js', '/js/audio.js', '/js/falas.js', '/audio/trilha.mp3'];
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
