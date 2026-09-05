// Trilha sonora do app: uma única faixa, em loop, com mudo/desmudo.
const ARQUIVO = 'audio/funkdobombapatch.mp3';

class Trilha {
  constructor() {
    this.el = new Audio(ARQUIVO);
    this.el.loop = true;
    this.el.preload = 'auto';
    this.el.volume = 0.45;
    this.pronta = false;
    // sem o arquivo (ex.: build público sem a trilha) o controle de som some
    this.disponivel = true;
    this.el.addEventListener('canplaythrough', () => { this.pronta = true; }, { once: true });
    this.el.addEventListener('error', () => {
      this.disponivel = false;
      this.aoIndisponivel?.();
    }, { once: true });
  }

  get tocando() {
    return !this.el.paused && !this.el.ended;
  }

  // Navegadores só liberam áudio depois de um gesto do usuário:
  // devolve false se a reprodução foi bloqueada.
  async tocar() {
    try {
      await this.el.play();
      return true;
    } catch {
      return false;
    }
  }

  parar() {
    this.el.pause();
  }

  setVolume(v) {
    this.el.volume = Math.min(1, Math.max(0, v));
  }
}

export const trilha = new Trilha();

/* =========================================================
   Efeitos das ações.

   Todos os sons saem da MESMA escala da trilha (Lá maior), então
   qualquer combinação soa consonante — antes cada efeito tinha uma
   frequência solta e o conjunto ficava desafinado.
   ========================================================= */

// nota em semitons a partir do Lá 440
const nt = (semitons) => 440 * Math.pow(2, semitons / 12);

const NOTA = {
  LA1: nt(-36), LA2: nt(-24), MI3: nt(-17), LA3: nt(-12),
  DO3: nt(-8),  MI4: nt(-5),  LA4: nt(0),   DO5: nt(4),
  MI5: nt(7),   FA5: nt(9),   LA5: nt(12),  MI6: nt(19), LA6: nt(24),
};

// Lá maior: as três notas que aparecem em quase todo efeito
const TRIADE = [NOTA.LA4, NOTA.DO5, NOTA.MI5];

class Efeitos {
  constructor() {
    this.ctx = null;
    this.ligado = true;
  }

  _contexto() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      // barramento único: mantém todos os efeitos no mesmo nível e tira o
      // brilho agressivo dos agudos
      this.saida = this.ctx.createGain();
      this.saida.gain.value = .9;
      const suave = this.ctx.createBiquadFilter();
      suave.type = 'lowpass';
      suave.frequency.value = 5200;
      this.saida.connect(suave).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _nota({ de, para = de, dur, tipo = 'triangle', vol = .12, atraso = 0 }) {
    const ctx = this._contexto();
    if (!ctx) return;
    const t = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(de, t);
    if (para !== de) osc.frequency.exponentialRampToValueAtTime(para, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.saida);
    osc.start(t);
    osc.stop(t + dur + .02);
  }

  // arpeja um acorde: usado nas confirmações
  _acorde(notas, { dur = .4, vol = .1, passo = .045, tipo = 'triangle' } = {}) {
    notas.forEach((freq, i) => this._nota({ de: freq, dur, tipo, vol, atraso: i * passo }));
  }

  tocar(tipo) {
    if (!this.ligado) return;

    switch (tipo) {
      // seleção: uma nota só, curta e alta
      case 'toque':
        return this._nota({ de: NOTA.MI5, dur: .06, vol: .06 });

      // painéis: quinta subindo e descendo
      case 'abrir':
        return this._nota({ de: NOTA.LA4, para: NOTA.MI5, dur: .15, tipo: 'sine', vol: .08 });
      case 'fechar':
        return this._nota({ de: NOTA.MI5, para: NOTA.LA4, dur: .14, tipo: 'sine', vol: .07 });

      // carta assentando: fundamental grave + a quinta acima
      case 'pouso':
        this._nota({ de: NOTA.LA3, para: NOTA.LA2, dur: .22, tipo: 'sine', vol: .3 });
        return this._nota({ de: NOTA.MI5, dur: .16, vol: .07, atraso: .02 });

      // sair do time: cai uma quarta
      case 'tirar':
        return this._nota({ de: NOTA.MI4, para: NOTA.LA3, dur: .22, tipo: 'sine', vol: .18 });

      // excluir: cai uma oitava, timbre mais fechado
      case 'excluir':
        this._nota({ de: NOTA.LA3, para: NOTA.LA2, dur: .3, tipo: 'sine', vol: .2 });
        return this._nota({ de: NOTA.DO3, para: NOTA.LA2, dur: .26, tipo: 'triangle', vol: .07, atraso: .04 });

      // confirmação: tríade de Lá maior subindo
      case 'guardar':
        return this._acorde(TRIADE, { dur: .34, vol: .1 });

      // troca de tática: oitava varrida, acompanhando as cartas deslizando
      case 'tatica':
        this._nota({ de: NOTA.LA4, para: NOTA.LA5, dur: .3, tipo: 'sine', vol: .09 });
        return this._nota({ de: NOTA.MI5, dur: .3, vol: .05, atraso: .12 });

      // revelação: escala subindo até a oitava
      case 'revelar':
        return this._acorde([NOTA.LA4, NOTA.DO5, NOTA.MI5, NOTA.LA5],
          { dur: .5, vol: .08, passo: .07, tipo: 'sine' });

      // impacto no fim da revelação: baque grave + a tríade cheia
      case 'impacto':
        this._nota({ de: NOTA.LA2, para: NOTA.LA1, dur: .34, tipo: 'sine', vol: .34 });
        return this._acorde(TRIADE, { dur: .6, vol: .12, passo: .03 });

      // faísca das cartas de nota alta: as mesmas notas, duas oitavas acima
      case 'brilho':
        return this._acorde([NOTA.MI6, NOTA.LA6], { dur: .34, vol: .05, passo: .08, tipo: 'sine' });

      default:
        return;
    }
  }
}

export const efeitos = new Efeitos();

/* =========================================================
   Trilha sintetizada — loop animado, feito com osciladores.
   Entra quando não há arquivo de música. Nada é baixado.
   ========================================================= */

// I–V–vi–IV em Lá maior: progressão alegre, um compasso para cada acorde.
const PROGRESSAO = [
  { baixo: 110.00, acorde: [440.00, 554.37, 659.25] }, // Lá
  { baixo: 82.41,  acorde: [415.30, 493.88, 659.25] }, // Mi
  { baixo: 92.50,  acorde: [369.99, 440.00, 554.37] }, // Fá#m
  { baixo: 73.42,  acorde: [440.00, 587.33, 739.99] }, // Ré
];

const PASSOS_POR_COMPASSO = 16;
const BPM = 108;

class TrilhaSintetica {
  constructor() {
    this.ctx = null;
    this.tocando = false;
    this.volume = .075;
    this.passo = 0;
    this.proximoTempo = 0;
    this.timer = null;
  }

  tocar() {
    if (this.tocando) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.mestre = this.ctx.createGain();
    this.mestre.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.mestre.gain.exponentialRampToValueAtTime(this.volume, this.ctx.currentTime + 1.5);
    this.mestre.connect(this.ctx.destination);

    this.tocando = true;
    this.passo = 0;
    this.proximoTempo = this.ctx.currentTime + .06;
    this._agendar();
  }

  parar() {
    if (!this.tocando) return;
    this.tocando = false;
    clearTimeout(this.timer);
    const t = this.ctx.currentTime;
    this.mestre?.gain.exponentialRampToValueAtTime(0.0001, t + .5);
  }

  setVolume(v) {
    this.volume = v;
    if (this.tocando) this.mestre?.gain.setTargetAtTime(v, this.ctx.currentTime, .1);
  }

  // agendamento com folga: garante ritmo firme mesmo se a aba engasgar
  _agendar() {
    if (!this.tocando) return;
    const duracaoPasso = 60 / BPM / 4;
    while (this.proximoTempo < this.ctx.currentTime + .12) {
      this._tocarPasso(this.passo % (PASSOS_POR_COMPASSO * 4), this.proximoTempo);
      this.proximoTempo += duracaoPasso;
      this.passo++;
    }
    this.timer = setTimeout(() => this._agendar(), 30);
  }

  _tocarPasso(i, t) {
    const compasso = Math.floor(i / PASSOS_POR_COMPASSO);
    const passo = i % PASSOS_POR_COMPASSO;
    const { baixo, acorde } = PROGRESSAO[compasso];

    if ([0, 4, 8, 12].includes(passo)) this._bumbo(t);
    if (passo % 2 === 1) this._chimbal(t, passo % 4 === 3 ? .05 : .028);
    if ([0, 3, 6, 8, 11, 14].includes(passo)) this._baixo(t, baixo);
    // arpejo em colcheias, subindo e descendo pelo acorde
    if (passo % 2 === 0) {
      const seq = [0, 1, 2, 1];
      this._arpejo(t, acorde[seq[(passo / 2) % 4]]);
    }
    if (passo === 0) this._naipe(t, acorde);
  }

  _bumbo(t) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(135, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + .11);
    g.gain.setValueAtTime(.9, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .2);
    osc.connect(g).connect(this.mestre);
    osc.start(t); osc.stop(t + .22);
  }

  _chimbal(t, vol) {
    const tam = this.ctx.sampleRate * .04;
    const buffer = this.ctx.createBuffer(1, tam, this.ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < tam; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / tam);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = 8200;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filtro).connect(g).connect(this.mestre);
    src.start(t);
  }

  _baixo(t, freq) {
    const osc = this.ctx.createOscillator();
    const filtro = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(900, t);
    filtro.frequency.exponentialRampToValueAtTime(260, t + .16);
    g.gain.setValueAtTime(.34, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .19);
    osc.connect(filtro).connect(g).connect(this.mestre);
    osc.start(t); osc.stop(t + .21);
  }

  _arpejo(t, freq) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.09, t + .01);
    g.gain.exponentialRampToValueAtTime(.001, t + .17);
    osc.connect(g).connect(this.mestre);
    osc.start(t); osc.stop(t + .19);
  }

  _naipe(t, acorde) {
    for (const freq of acorde) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq / 2;
      osc.detune.value = (Math.random() - .5) * 8;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(.035, t + .06);
      g.gain.exponentialRampToValueAtTime(.001, t + 1.1);
      osc.connect(g).connect(this.mestre);
      osc.start(t); osc.stop(t + 1.2);
    }
  }
}

export const trilhaSintetica = new TrilhaSintetica();


/* =========================================================
   Narração.

   Usa a voz do próprio aparelho (Web Speech API): nada é baixado e nada
   depende de gravação de terceiros. As frases são vocabulário comum de
   futebol — de propósito não imitam a voz nem os bordões de locutores
   reais, que são identidade de pessoas vivas.
   ========================================================= */

const FALAS = {
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

  // jogador excluído do elenco
  dispensa:  ['Dispensado!', 'Fim de contrato.', 'Saiu do clube.'],
};

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

class Narrador {
  constructor() {
    this.ligado = true;
    this.voz = null;
    this.pronta = false;
    this.ultimaFala = 0;
    if ('speechSynthesis' in window) {
      this._escolherVoz();
      speechSynthesis.addEventListener?.('voiceschanged', () => this._escolherVoz());
    }
  }

  _escolherVoz() {
    const vozes = speechSynthesis.getVoices();
    if (!vozes.length) return;
    const pt = vozes.filter((v) => v.lang?.toLowerCase().startsWith('pt'));
    if (!pt.length) { this.voz = null; this.pronta = false; return; }

    // Nomes de voz masculina pt-BR mais comuns entre os sistemas. Não há campo
    // de gênero na API, então a pista possível é o nome.
    const masculinos = /daniel|felipe|ricardo|ant[oô]nio|j[uú]lio|heitor|f[aá]bio|marcelo|paulo|thiago|male|masculin/i;

    const nota = (v) => {
      let n = 0;
      if (masculinos.test(v.name)) n += 8;          // voz masculina, como pedido
      if (v.lang.toLowerCase() === 'pt-br') n += 4; // sotaque brasileiro
      if (v.localService) n += 2;                   // instalada: funciona offline
      return n;
    };

    this.voz = [...pt].sort((a, b) => nota(b) - nota(a))[0];
    this.masculina = masculinos.test(this.voz.name);
    this.pronta = true;
  }

  get disponivel() {
    return 'speechSynthesis' in window && this.pronta;
  }

  falar(chave) {
    if (!this.ligado || !this.disponivel) return false;

    // sem atropelo: uma fala de cada vez, com respiro entre elas
    const agora = Date.now();
    if (agora - this.ultimaFala < 2200) return false;
    this.ultimaFala = agora;

    const texto = sortear(FALAS[chave] || []);
    if (!texto) return false;

    try {
      speechSynthesis.cancel();
      const fala = new SpeechSynthesisUtterance(texto);
      // se a voz escolhida for recusada, ainda vale falar com a padrão do
      // idioma — melhor perder o timbre do que perder a narração
      try { if (this.voz) fala.voice = this.voz; } catch { /* usa a padrão */ }
      fala.lang = this.voz?.lang || 'pt-BR';
      fala.rate = 1.12;   // um pouco acelerado, como narração de jogo
      fala.pitch = this.masculina ? 0.92 : 0.8;   // compensa quando só há voz feminina
      fala.volume = 0.9;
      speechSynthesis.speak(fala);
      return true;
    } catch {
      return false;
    }
  }

  calar() {
    try { speechSynthesis.cancel(); } catch { /* sem suporte */ }
  }
}

export const narrador = new Narrador();
