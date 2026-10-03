/**
 * Web Audio API Sound Synthesizer & Arcade BGM Generator
 * Recreates 90s CAVE arcade FM sound effects and driving techno BGM
 * with zero external audio assets.
 */

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // BGM sequencer state
  private isBgmPlaying = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private tempo = 155; // 155 BPM arcade driving pace
  private sfxVolume = 0.8;
  private bgmVolume = 0.45;
  private isMuted = false;

  constructor() {
    // Lazy init on user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);

      this.sfxGain.connect(this.masterGain);
      this.bgmGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.generateNoiseBuffer();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public setVolumes(sfx: number, bgm: number, muted = false) {
    this.sfxVolume = sfx;
    this.bgmVolume = bgm;
    this.isMuted = muted;
    if (this.ctx && this.masterGain && this.sfxGain && this.bgmGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, now);
      this.sfxGain.gain.setValueAtTime(sfx, now);
      this.bgmGain.gain.setValueAtTime(bgm, now);
    }
  }

  // --- Sound Effects ---

  public shoot(isLaser = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (isLaser) {
      // Piercing focused laser harmonic hum
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(880, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.08);
      osc2.stop(now + 0.08);
    } else {
      // Rapid vulcan cannon
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  public graze() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1700 + Math.random() * 500, now);
    osc.frequency.exponentialRampToValueAtTime(2800, now + 0.045);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public hit() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public explosion(isBoss = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(isBoss ? 160 : 130, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + (isBoss ? 0.9 : 0.4));

    subGain.gain.setValueAtTime(isBoss ? 0.35 : 0.18, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + (isBoss ? 0.9 : 0.4));

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + (isBoss ? 0.9 : 0.4));

    // Crunchy noise burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(isBoss ? 1200 : 800, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, now + (isBoss ? 0.8 : 0.35));

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(isBoss ? 0.3 : 0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + (isBoss ? 0.8 : 0.35));

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + (isBoss ? 0.8 : 0.35));
    }
  }

  public bomb() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sucking sub-bass sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(30, now + 1.6);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.6);

    // Laser roar wash
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.linearRampToValueAtTime(3200, now + 0.4);
      filter.frequency.exponentialRampToValueAtTime(200, now + 1.4);
      filter.Q.setValueAtTime(3, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.25, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 1.4);
    }
  }

  public item() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.06); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public warning() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const t = now + i * 0.35;
      osc.frequency.setValueAtTime(550, t);
      osc.frequency.setValueAtTime(780, t + 0.16);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  }

  public oneUp() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const ctx = this.ctx;
    const sfxGain = this.sfxGain;
    const notes = [440, 554.37, 659.25, 880];
    const now = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // --- Dynamic Arcade FM Techno BGM Sequencer ---

  public startBgm() {
    if (this.isBgmPlaying) return;
    this.init();
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    const secondsPerBeat = 60 / this.tempo;
    const stepTime = (secondsPerBeat / 4) * 1000; // 16th notes

    this.bgmTimer = window.setInterval(() => {
      this.playBgmStep();
    }, stepTime);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playBgmStep() {
    if (!this.ctx || !this.bgmGain || this.isMuted || !this.isBgmPlaying) return;
    const step = this.bgmStep % 32;
    this.bgmStep++;

    const now = this.ctx.currentTime;

    // 1. Kick on 0, 4, 8, 12, 16, 20, 24, 28 (Four-on-the-floor)
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      kickGain.gain.setValueAtTime(0.18, now);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      kickOsc.connect(kickGain);
      kickGain.connect(this.bgmGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.13);
    }

    // 2. Hi-hats on off-beats (step % 2 === 1)
    if (this.noiseBuffer && (step % 2 === 1 || step % 4 === 2)) {
      const hatSource = this.ctx.createBufferSource();
      hatSource.buffer = this.noiseBuffer;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(7000, now);

      const hatGain = this.ctx.createGain();
      const isAccent = step % 4 === 2; // open hat
      hatGain.gain.setValueAtTime(isAccent ? 0.05 : 0.025, now);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, now + (isAccent ? 0.09 : 0.04));

      hatSource.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.bgmGain);
      hatSource.start(now);
      hatSource.stop(now + (isAccent ? 0.09 : 0.04));
    }

    // 3. Fast rolling arcade synth bassline (DoDonPachi style minor progression)
    // Scale: D minor / F minor driving bass
    const bassScale = [73.42, 73.42, 82.41, 73.42, 87.31, 73.42, 98.0, 110.0];
    const bassFreq = bassScale[step % bassScale.length];

    const bassOsc = this.ctx.createOscillator();
    const bassFilter = this.ctx.createBiquadFilter();
    const bassGain = this.ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, now);

    bassFilter.type = 'lowpass';
    const filterEnv = 500 + Math.sin((step / 32) * Math.PI * 2) * 350;
    bassFilter.frequency.setValueAtTime(filterEnv, now);
    bassFilter.Q.setValueAtTime(4, now);

    bassGain.gain.setValueAtTime(0.09, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.bgmGain);
    bassOsc.start(now);
    bassOsc.stop(now + 0.11);

    // 4. Arpeggiated high melody lead every few steps
    const leadPattern = [
      null, 587.33, null, 659.25,
      null, 698.46, null, 880.0,
      null, 783.99, null, 698.46,
      null, 659.25, 587.33, null,
    ];
    const note = leadPattern[step % leadPattern.length];
    if (note !== null) {
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(note, now);

      leadGain.gain.setValueAtTime(0.035, now);
      leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      leadOsc.connect(leadGain);
      leadGain.connect(this.bgmGain);
      leadOsc.start(now);
      leadOsc.stop(now + 0.12);
    }
  }
}

export const sound = new SoundSystem();
