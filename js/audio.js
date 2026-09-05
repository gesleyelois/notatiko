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
