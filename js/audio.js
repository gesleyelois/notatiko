import { FALAS, ARQUIVO_DA_FRASE } from './falas.js';

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

/* Os efeitos também tocam de arquivo.

   Enquanto eram Web Audio, dependiam de a trilha estar tocando: no iOS é o
   <audio> que põe a sessão em modo mídia, e sem ele a chavinha do iPhone
   silencia o Web Audio. Bastou dar ao usuário a opção de calar a música
   para os efeitos sumirem junto — dependência frágil, invisível no desktop.

   Os arquivos são a mesma síntese renderizada (ver ferramentas/), todos com
   um ganho único, para a mixagem entre eles sobreviver. A síntese ao vivo
   fica como reserva.                                                      */

const EFEITOS_EM_ARQUIVO = ['toque', 'abrir', 'fechar', 'pouso', 'tirar',
  'excluir', 'guardar', 'tatica', 'revelar', 'impacto', 'brilho'];
// devolve o nível de mixagem original: o pico da síntese era 0.388 e o
// arquivo foi normalizado para 0.89
const VOLUME_EFEITOS = 0.436;

class Efeitos {
  constructor() {
    this.ctx = null;
    this.ligado = true;
    this.arquivos = new Map();
    this.naReserva = false;
  }

  // Um elemento por efeito, clonado quando o mesmo som se repete antes de
  // acabar — assim dois toques seguidos se sobrepõem em vez de se cortarem.
  _tocarArquivo(tipo) {
    if (this.naReserva || !EFEITOS_EM_ARQUIVO.includes(tipo)) return false;
    try {
      let base = this.arquivos.get(tipo);
      if (!base) {
        base = new Audio(`audio/efeitos/${tipo}.mp3`);
        base.preload = 'auto';
        this.arquivos.set(tipo, base);
      }
      const alvo = (base.paused || base.ended) ? base : base.cloneNode();
      alvo.volume = VOLUME_EFEITOS;
      alvo.currentTime = 0;
      alvo.play()?.catch(() => { this.naReserva = true; });
      return true;
    } catch {
      return false;
    }
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
    if (this._tocarArquivo(tipo)) return;

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

   Hoje ela é a reserva: audio/trilha.mp3 é esta mesma música, renderizada
   por este mesmo código (ver README). O arquivo existe porque no iOS o
   Web Audio sai pelo canal da campainha e a chavinha lateral do iPhone o
   silencia — um <audio> sai pelo canal de mídia e não é afetado.
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

// exportada para ferramentas/gerar-trilha.html renderizar o arquivo a partir dela
export const trilhaSintetica = new TrilhaSintetica();


/* =========================================================
   Trilha do aplicativo.

   Um <audio> em loop com a música já renderizada. Além de soar igual em
   qualquer aparelho, tocar um <audio> muda a sessão de áudio do iOS para
   o canal de mídia — o que também faz os efeitos (Web Audio) voltarem a
   ser ouvidos com a chavinha do iPhone no silencioso.

   Se o arquivo não carregar, cai na versão sintetizada.
   ========================================================= */

const ARQUIVO_TRILHA = 'audio/trilha.mp3';
// o arquivo foi normalizado para -1 dBFS; isto devolve o volume de mixagem
// original (o pico da síntese era 1.81 vezes o ganho mestre de 0.075)
const VOLUME_TRILHA = 0.15;
const ENTRADA_MS = 1500;

class Trilha {
  constructor() {
    this.volume = VOLUME_TRILHA;
    this.tocando = false;
    this.audio = null;
    this.naReserva = false;
    this.rampa = null;
  }

  tocar() {
    if (this.tocando) return;
    this.tocando = true;

    if (this.naReserva) return trilhaSintetica.tocar();

    if (!this.audio) {
      this.audio = new Audio(ARQUIVO_TRILHA);
      this.audio.loop = true;
      this.audio.preload = 'auto';
    }
    this.audio.volume = 0;
    this.audio.play()
      .then(() => this._rampa(this.volume, ENTRADA_MS))
      .catch(() => {
        // arquivo ausente ou reprodução recusada: a síntese assume
        this.naReserva = true;
        if (this.tocando) trilhaSintetica.tocar();
      });
  }

  parar() {
    if (!this.tocando) return;
    this.tocando = false;
    if (this.naReserva) return trilhaSintetica.parar();
    this._rampa(0, 500, () => this.audio?.pause());
  }

  setVolume(v) {
    this.volume = v;
    if (this.naReserva) return trilhaSintetica.setVolume(v);
    if (this.tocando) this._rampa(v, 200);
  }

  // <audio> não tem rampa de ganho como o Web Audio; esta faz na unha
  _rampa(alvo, ms, aoFim) {
    clearInterval(this.rampa);
    const audio = this.audio;
    if (!audio) return;
    const inicio = audio.volume;
    const t0 = performance.now();
    this.rampa = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, inicio + (alvo - inicio) * k));
      if (k === 1) { clearInterval(this.rampa); aoFim?.(); }
    }, 40);
  }
}

export const trilha = new Trilha();


/* =========================================================
   Narração.

   Dois caminhos, nesta ordem:

   1. as gravações de audio/falas/, feitas uma vez por
      ferramentas/gerar-vozes.py. Timbre igual em qualquer aparelho e
      nenhuma dependência do sistema operacional.
   2. a voz do próprio aparelho (Web Speech API), quando as gravações não
      foram geradas ou não carregaram.

   O segundo caminho existe porque o primeiro é opcional: o app funciona
   sem nenhum arquivo de áudio no repositório.
   ========================================================= */



const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

class Narrador {
  constructor() {
    this.ligado = true;
    this.voz = null;
    this.pronta = false;
    this.ultimaFala = 0;
    this.gravacoes = null;      // frase exata -> nome do arquivo
    this.tocadores = new Map();
    this.tocando = null;
    this._carregarGravacoes();
    if ('speechSynthesis' in window) {
      this._escolherVoz();
      // a lista de vozes costuma chegar depois; nem todo navegador expõe
      // addEventListener nesse objeto, daí o onvoiceschanged também
      speechSynthesis.addEventListener?.('voiceschanged', () => this._escolherVoz());
      const anterior = speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged = (e) => {
        anterior?.call(speechSynthesis, e);
        this._escolherVoz();
      };
    }
  }

  _escolherVoz() {
    const vozes = speechSynthesis.getVoices();
    if (!vozes.length) return;
    const pt = vozes.filter((v) => v.lang?.toLowerCase().startsWith('pt'));
    if (!pt.length) { this.voz = null; this.pronta = false; return; }

    // A API não expõe gênero; a pista possível é o nome. Ela ajusta o tom
    // depois (fala.pitch) e, com peso 1, serve de critério de desempate —
    // sem competir com "voz base", que vale 4.
    const masculinos = /daniel|felipe|ricardo|ant[oô]nio|antonio|j[uú]lio|heitor|f[aá]bio|marcelo|paulo|thiago|diogo|male\b|masculin/i;
    const femininos = /luciana|maria|fernanda|helena|ines|inês|joana|catarina|female|feminin/i;

    const nota = (v) => {
      let n = 0;
      if (v.lang.toLowerCase() === 'pt-br') n += 6;  // sotaque brasileiro
      // No Linux o espeak publica ~100 variantes alteradas do mesmo idioma
      // ("+Adam", "+Demonic"...). A voz base, sem sufixo, é a mais natural.
      if (!v.name.includes('+')) n += 4;
      if (v.localService) n += 2;                    // instalada: funciona offline
      if (masculinos.test(v.name)) n += 1;           // só desempata
      return n;
    };

    this.voz = [...pt].sort((a, b) => nota(b) - nota(a))[0];
    // só baixa o tom quando a voz é reconhecidamente feminina; a base do
    // espeak em pt-BR já é masculina e ficaria cavernosa se abaixasse
    this.feminina = femininos.test(this.voz.name);
    this.pronta = true;
  }

  async _carregarGravacoes() {
    try {
      const resposta = await fetch('audio/falas/indice.json');
      if (!resposta.ok) return;
      const dados = await resposta.json();
      if (dados?.frases && Object.keys(dados.frases).length) {
        this.gravacoes = dados.frases;
      }
    } catch {
      /* sem gravações: a voz do aparelho assume */
    }
  }

  get disponivel() {
    return !!this.gravacoes || ('speechSynthesis' in window && this.pronta);
  }

  // Sorteia a frase sem falar — permite exibir na tela exatamente o que a
  // voz vai dizer.
  frase(chave) {
    return sortear(FALAS[chave] || []) || null;
  }

  falar(chave) {
    return this.dizer(this.frase(chave));
  }

  dizer(texto) {
    if (!this.ligado || !texto) return false;

    // sem atropelo: uma fala de cada vez, com respiro entre elas
    const agora = Date.now();
    if (agora - this.ultimaFala < 2200) return false;

    if (this._tocarGravacao(texto)) {
      this.ultimaFala = agora;
      return true;
    }
    return this._falarComOAparelho(texto, agora);
  }

  // Caminho 1: a gravação pronta. Só falha se o arquivo não existir — frase
  // nova ainda não gerada, por exemplo —, e aí o aparelho assume.
  _tocarGravacao(texto) {
    const nome = this.gravacoes?.[texto] || ARQUIVO_DA_FRASE[texto];
    if (!this.gravacoes || !nome) return false;

    try {
      this.calar();
      let audio = this.tocadores.get(nome);
      if (!audio) {
        audio = new Audio(`audio/falas/${nome}.mp3`);
        audio.preload = 'auto';
        this.tocadores.set(nome, audio);
      }
      audio.currentTime = 0;
      audio.volume = 0.9;
      this.tocando = audio;
      audio.play()?.catch(() => this._falarComOAparelho(texto, Date.now()));
      return true;
    } catch {
      return false;
    }
  }

  // Caminho 2: a voz do sistema.
  _falarComOAparelho(texto, agora) {
    // as vozes podem ter chegado depois da última verificação
    if (!this.pronta) this._escolherVoz();
    if (!('speechSynthesis' in window) || !this.pronta) return false;
    this.ultimaFala = agora;

    try {
      speechSynthesis.cancel();
      const fala = new SpeechSynthesisUtterance(texto);
      // se a voz escolhida for recusada, ainda vale falar com a padrão do
      // idioma — melhor perder o timbre do que perder a narração
      try { if (this.voz) fala.voice = this.voz; } catch { /* usa a padrão */ }
      fala.lang = this.voz?.lang || 'pt-BR';
      fala.rate = 1.12;   // um pouco acelerado, como narração de jogo
      fala.pitch = this.feminina ? 0.8 : 0.92;   // compensa quando só há voz feminina
      fala.volume = 0.9;
      speechSynthesis.speak(fala);
      return true;
    } catch {
      return false;
    }
  }

  calar() {
    try { speechSynthesis.cancel(); } catch { /* sem suporte */ }
    try { this.tocando?.pause(); } catch { /* nada tocando */ }
    this.tocando = null;
  }
}

export const narrador = new Narrador();
