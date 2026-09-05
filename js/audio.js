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
   Efeitos das ações — sintetizados, curtos e discretos.
   Seguem o mesmo botão de mudo da trilha.
   ========================================================= */

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
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _nota({ de, para, dur, tipo = 'sine', vol = .2, atraso = 0 }) {
    const ctx = this._contexto();
    if (!ctx) return;
    const t = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(de, t);
    if (para !== de) osc.frequency.exponentialRampToValueAtTime(para, t + dur);
    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + .02);
  }

  tocar(tipo) {
    if (!this.ligado) return;
    if (tipo === 'toque') {
      this._nota({ de: 540, para: 620, dur: .05, tipo: 'triangle', vol: .05 });
    } else if (tipo === 'abrir') {
      // painel subindo
      this._nota({ de: 320, para: 640, dur: .16, tipo: 'sine', vol: .07 });
    } else if (tipo === 'fechar') {
      this._nota({ de: 620, para: 300, dur: .14, tipo: 'sine', vol: .06 });
    } else if (tipo === 'tirar') {
      // jogador saindo do time: desce
      this._nota({ de: 300, para: 120, dur: .2, tipo: 'sine', vol: .16 });
    } else if (tipo === 'excluir') {
      this._nota({ de: 260, para: 90, dur: .3, tipo: 'sawtooth', vol: .1 });
    } else if (tipo === 'tatica') {
      // varredura ao remontar o time
      this._nota({ de: 240, para: 900, dur: .28, tipo: 'triangle', vol: .09 });
      this._nota({ de: 480, para: 1200, dur: .24, tipo: 'sine', vol: .05, atraso: .05 });
    } else
    if (tipo === 'pouso') {
      // baque grave de carta assentando no gramado
      this._nota({ de: 190, para: 62, dur: .22, tipo: 'sine', vol: .3 });
      this._nota({ de: 900, para: 500, dur: .06, tipo: 'triangle', vol: .06 });
    } else if (tipo === 'guardar') {
      // confirmação: duas notas subindo
      this._nota({ de: 660, para: 660, dur: .1, tipo: 'triangle', vol: .14 });
      this._nota({ de: 990, para: 990, dur: .14, tipo: 'triangle', vol: .12, atraso: .09 });
    } else if (tipo === 'revelar') {
      // brilho da revelação da carta
      this._nota({ de: 520, para: 1560, dur: .5, tipo: 'triangle', vol: .12 });
      this._nota({ de: 780, para: 2340, dur: .45, tipo: 'sine', vol: .07, atraso: .06 });
    } else if (tipo === 'impacto') {
      // a carta assentando no fim da revelação: baque + acorde
      this._nota({ de: 150, para: 52, dur: .3, tipo: 'sine', vol: .34 });
      this._nota({ de: 440, para: 440, dur: .5, tipo: 'triangle', vol: .1, atraso: .02 });
      this._nota({ de: 554, para: 554, dur: .5, tipo: 'triangle', vol: .09, atraso: .05 });
      this._nota({ de: 659, para: 659, dur: .55, tipo: 'triangle', vol: .08, atraso: .08 });
    } else if (tipo === 'brilho') {
      // faísca extra para cartas de nota alta
      this._nota({ de: 1320, para: 1980, dur: .3, tipo: 'sine', vol: .07 });
      this._nota({ de: 1760, para: 2640, dur: .26, tipo: 'triangle', vol: .05, atraso: .07 });
    } else if (tipo === 'pegar') {
      this._nota({ de: 420, para: 620, dur: .07, tipo: 'triangle', vol: .08 });
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
