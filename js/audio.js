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
    } else if (tipo === 'pegar') {
      this._nota({ de: 420, para: 620, dur: .07, tipo: 'triangle', vol: .08 });
    }
  }
}

export const efeitos = new Efeitos();

/* =========================================================
   Ambiente de suspense — pad grave e lento, bem baixo.
   Sintetizado aqui mesmo: nenhum arquivo, nenhum download.
   ========================================================= */

class Ambiente {
  constructor() {
    this.ctx = null;
    this.nos = [];
    this.tocando = false;
    this.volume = .055;
    this.timer = null;
  }

  tocar() {
    if (this.tocando) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const ctx = this.ctx;
    const mestre = ctx.createGain();
    mestre.gain.setValueAtTime(0.0001, ctx.currentTime);
    mestre.gain.exponentialRampToValueAtTime(this.volume, ctx.currentTime + 4);
    mestre.connect(ctx.destination);

    // filtro que abre e fecha devagar: é o que dá a respiração do suspense
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 320;
    filtro.Q.value = 6;
    filtro.connect(mestre);

    const lfo = ctx.createOscillator();
    const lfoGanho = ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoGanho.gain.value = 190;
    lfo.connect(lfoGanho).connect(filtro.frequency);
    lfo.start();

    // acorde menor grave, levemente desafinado entre si
    const pad = ctx.createGain();
    pad.gain.value = .5;
    pad.connect(filtro);
    const vozes = [55, 65.4, 82.4, 110.2];
    for (const freq of vozes) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - .5) * 14;
      const g = ctx.createGain();
      g.gain.value = .22;
      osc.connect(g).connect(pad);
      osc.start();
      this.nos.push(osc);
    }

    this.nos.push(lfo);
    this.mestre = mestre;
    this.tocando = true;

    // notas altas esparsas, para a tensão não ficar estática
    const pingar = () => {
      if (!this.tocando) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.value = [523, 587, 698, 784][Math.floor(Math.random() * 4)];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(.03, t + .8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      osc.connect(g).connect(mestre);
      osc.start(t);
      osc.stop(t + 4.2);
      this.timer = setTimeout(pingar, 9000 + Math.random() * 11000);
    };
    this.timer = setTimeout(pingar, 6000);
  }

  parar() {
    if (!this.tocando) return;
    this.tocando = false;
    clearTimeout(this.timer);
    const t = this.ctx.currentTime;
    this.mestre?.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    const nos = this.nos;
    this.nos = [];
    setTimeout(() => nos.forEach((n) => { try { n.stop(); } catch {} }), 1400);
  }
}

export const ambiente = new Ambiente();
