// 사운드. 외부 음원 파일 없이 Web Audio API로 전부 합성한다.
// 파일이 없으니 용량도 안 늘고 실행 파일(Electron)에서도 그대로 소리가 난다.
//
// 브라우저 자동재생 정책 때문에 사용자가 뭔가 누르기 전에는 오디오를 열 수 없다.
// 그래서 첫 키 입력/클릭에 unlock()을 걸어두고, 그 전까지는 모든 호출이 조용히 무시된다.
let SOUND = null;

const AUDIO_VOLUME_KEY = 'maple_granado_volume';
const VOLUME_STEPS = [1, 0.5, 0];
const VOLUME_ICON = { 1: '🔊', 0.5: '🔉', 0: '🔇' };

// 같은 효과음이 한 프레임에 수십 번 울리면 귀가 아프고 노드도 폭발한다.
const SFX_MIN_GAP_MS = { hit: 45, hurt: 90, pickup: 120, miss: 120 };

function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

// BGM: 존 성격별 코드 진행 + 템포. root는 MIDI 번호.
const BGM_THEMES = {
  town: { bpm: 96, wave: 'triangle', gain: 0.10, chords: [[48, 4], [43, 4], [45, 3], [41, 4]] },
  field: { bpm: 112, wave: 'triangle', gain: 0.09, chords: [[45, 3], [41, 4], [48, 4], [43, 4]] },
  tower: { bpm: 128, wave: 'sawtooth', gain: 0.08, chords: [[38, 3], [46, 4], [43, 3], [45, 4]] },
  boss: { bpm: 140, wave: 'sawtooth', gain: 0.10, chords: [[40, 3], [48, 4], [50, 4], [40, 3]] },
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.bgmBus = null;
    this.volume = this._loadVolume();
    this.theme = null;
    this._lastPlayed = {};
    this._bgmTimer = null;
    this._nextNoteTime = 0;
    this._step = 0;

    // 첫 상호작용에 오디오를 연다. 한 번 열리면 리스너는 스스로 떨어진다.
    const unlock = () => this.unlock();
    ['pointerdown', 'keydown'].forEach((ev) => {
      window.addEventListener(ev, unlock, { once: false });
    });
    this._unlockHandler = unlock;
  }

  _loadVolume() {
    try {
      const raw = localStorage.getItem(AUDIO_VOLUME_KEY);
      if (raw === null) return 1;
      const v = parseFloat(raw);
      return Number.isFinite(v) ? clamp(v, 0, 1) : 1;
    } catch (e) {
      return 1;
    }
  }

  _saveVolume() {
    try { localStorage.setItem(AUDIO_VOLUME_KEY, String(this.volume)); } catch (e) { /* 저장소 차단 */ }
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
    } catch (e) {
      return; // 오디오를 못 쓰는 환경이면 조용히 포기한다
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    this.bgmBus = this.ctx.createGain();
    this.bgmBus.gain.value = 0.55;
    this.bgmBus.connect(this.master);
    ['pointerdown', 'keydown'].forEach((ev) => window.removeEventListener(ev, this._unlockHandler));
    if (this.theme) this._startBgm();
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  cycleVolume() {
    // 슬라이더로 맞춘 값에서 눌러도 다음 단계로 넘어가도록, 현재 값 이하의 첫 단계를 찾는다.
    const i = VOLUME_STEPS.findIndex((v) => v <= this.volume + 1e-6);
    this.volume = VOLUME_STEPS[((i < 0 ? 0 : i) + 1) % VOLUME_STEPS.length];
    if (this.master) this.master.gain.value = this.volume;
    this._saveVolume();
    return this.volume;
  }

  get icon() { return VOLUME_ICON[this.volume] || (this.volume > 0.5 ? '🔊' : '🔉'); }

  // 슬라이더용: 0~1 사이 아무 값이나 받는다.
  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.volume;
    this._saveVolume();
  }

  // ---------- 저수준 합성 ----------
  _throttled(name) {
    const gap = SFX_MIN_GAP_MS[name];
    if (!gap) return false;
    const now = performance.now();
    if (now - (this._lastPlayed[name] || 0) < gap) return true;
    this._lastPlayed[name] = now;
    return false;
  }

  // 한 음. sweepTo를 주면 그 주파수로 미끄러진다.
  _tone(opts) {
    if (!this.ready || this.volume === 0) return;
    const { freq, dur = 0.12, wave = 'square', gain = 0.2, sweepTo = null, delay = 0, bus = this.sfxBus } = opts;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // 노이즈 한 번(타격음·폭발음의 몸통)
  _noise(opts) {
    if (!this.ready || this.volume === 0) return;
    const { dur = 0.1, gain = 0.2, filterFreq = 1200, filterType = 'bandpass', delay = 0 } = opts;
    const t = this.ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ---------- 효과음 ----------
  hit(isCrit) {
    if (this._throttled('hit')) return;
    this._noise({ dur: isCrit ? 0.16 : 0.08, gain: isCrit ? 0.3 : 0.18, filterFreq: isCrit ? 2200 : 1400 });
    this._tone({ freq: isCrit ? 420 : 260, sweepTo: isCrit ? 150 : 110, dur: isCrit ? 0.16 : 0.09, gain: isCrit ? 0.16 : 0.1 });
  }

  miss() {
    if (this._throttled('miss')) return;
    this._tone({ freq: 700, sweepTo: 380, dur: 0.09, wave: 'sine', gain: 0.07 });
  }

  hurt() {
    if (this._throttled('hurt')) return;
    this._noise({ dur: 0.12, gain: 0.16, filterFreq: 600, filterType: 'lowpass' });
    this._tone({ freq: 180, sweepTo: 90, dur: 0.14, wave: 'sawtooth', gain: 0.1 });
  }

  kill(isBoss) {
    this._noise({ dur: isBoss ? 0.7 : 0.22, gain: isBoss ? 0.34 : 0.2, filterFreq: isBoss ? 400 : 900, filterType: 'lowpass' });
    if (isBoss) {
      [0, 0.12, 0.26].forEach((d, i) => this._tone({ freq: midiToFreq(52 - i * 5), sweepTo: 60, dur: 0.5, wave: 'sawtooth', gain: 0.16, delay: d }));
    }
  }

  // 스킬: 속성에 따라 음색을 바꾼다.
  skill(element) {
    const preset = {
      fire: { freq: 300, sweepTo: 900, wave: 'sawtooth' },
      ice: { freq: 1200, sweepTo: 600, wave: 'sine' },
      lightning: { freq: 900, sweepTo: 1800, wave: 'square' },
    }[element] || { freq: 480, sweepTo: 820, wave: 'triangle' };
    this._tone({ ...preset, dur: 0.22, gain: 0.16 });
    this._noise({ dur: 0.12, gain: 0.1, filterFreq: 1800 });
  }

  // 전용기: 스킬보다 한 겹 두껍게 울린다.
  signature() {
    [0, 0.07, 0.14].forEach((d, i) => {
      this._tone({ freq: midiToFreq(60 + i * 7), dur: 0.3, wave: 'square', gain: 0.15, delay: d });
    });
    this._noise({ dur: 0.35, gain: 0.2, filterFreq: 900, filterType: 'lowpass', delay: 0.1 });
  }

  levelUp() {
    [60, 64, 67, 72].forEach((n, i) => {
      this._tone({ freq: midiToFreq(n), dur: 0.22, wave: 'triangle', gain: 0.18, delay: i * 0.09 });
    });
  }

  swap() {
    this._tone({ freq: 900, sweepTo: 1500, dur: 0.1, wave: 'square', gain: 0.12 });
    this._noise({ dur: 0.09, gain: 0.14, filterFreq: 3000 });
  }

  warp() {
    this._tone({ freq: 260, sweepTo: 1400, dur: 0.42, wave: 'sine', gain: 0.15 });
  }

  pickup() {
    if (this._throttled('pickup')) return;
    this._tone({ freq: midiToFreq(76), dur: 0.07, wave: 'square', gain: 0.11 });
    this._tone({ freq: midiToFreq(83), dur: 0.09, wave: 'square', gain: 0.11, delay: 0.06 });
  }

  heal() {
    [67, 72, 76].forEach((n, i) => this._tone({ freq: midiToFreq(n), dur: 0.26, wave: 'sine', gain: 0.13, delay: i * 0.07 }));
  }

  down() {
    [55, 50, 45].forEach((n, i) => this._tone({ freq: midiToFreq(n), dur: 0.32, wave: 'sawtooth', gain: 0.16, delay: i * 0.12 }));
  }

  bossWarn() {
    this._tone({ freq: 150, dur: 0.3, wave: 'square', gain: 0.18 });
    this._tone({ freq: 150, dur: 0.3, wave: 'square', gain: 0.18, delay: 0.18 });
  }

  ui() {
    this._tone({ freq: 1100, dur: 0.04, wave: 'square', gain: 0.07 });
  }

  // ---------- BGM ----------
  setTheme(theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this._step = 0;
    if (!this.ready) return; // 아직 오디오를 못 열었으면 unlock 때 시작한다
    this._startBgm();
  }

  _startBgm() {
    this._stopBgm();
    if (!this.theme || !BGM_THEMES[this.theme]) return;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    // 25ms마다 앞을 내다보며 예약한다(setInterval만으로 음을 내면 박자가 흔들린다).
    this._bgmTimer = setInterval(() => this._scheduleBgm(), 25);
  }

  _stopBgm() {
    if (this._bgmTimer) { clearInterval(this._bgmTimer); this._bgmTimer = null; }
  }

  _scheduleBgm() {
    if (!this.ready || this.volume === 0) return;
    const conf = BGM_THEMES[this.theme];
    if (!conf) return;
    const beat = 60 / conf.bpm / 2; // 8분음표
    while (this._nextNoteTime < this.ctx.currentTime + 0.2) {
      const step = this._step;
      const chord = conf.chords[Math.floor(step / 8) % conf.chords.length];
      const [root, third] = chord;
      const arp = [0, third, 7, 12][step % 4];
      const delay = this._nextNoteTime - this.ctx.currentTime;

      if (delay >= 0) {
        // 베이스는 마디 앞머리에만
        if (step % 8 === 0 || step % 8 === 4) {
          this._tone({
            freq: midiToFreq(root - 12), dur: beat * 1.8, wave: 'triangle',
            gain: conf.gain * 1.1, delay, bus: this.bgmBus,
          });
        }
        this._tone({
          freq: midiToFreq(root + 12 + arp), dur: beat * 0.85, wave: conf.wave,
          gain: conf.gain * 0.6, delay, bus: this.bgmBus,
        });
      }
      this._nextNoteTime += beat;
      this._step = (step + 1) % (8 * conf.chords.length);
    }
  }
}
