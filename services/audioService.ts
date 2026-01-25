
export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  
  private rhythmTimer: number | null = null;
  private lastIntensity: number = 0;
  private beatCount: number = 0;
  private currentVolume: number = 0.5;

  private readonly chords = [
    [220.00, 261.63, 329.63, 392.00, 493.88], // Am9
    [174.61, 261.63, 329.63, 349.23, 440.00], // Fmaj7
    [130.81, 261.63, 329.63, 392.00, 493.88], // Cmaj7
    [196.00, 293.66, 392.00, 440.00, 587.33]  // Gsus4
  ];

  constructor() {
    const savedVolume = localStorage.getItem('stellar_sentinel_volume');
    if (savedVolume !== null) {
      this.currentVolume = parseFloat(savedVolume);
    }
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.currentVolume * 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.4;
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = 0.3;

    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);
    this.delayGain.connect(this.masterGain);

    this.startRhythm();
  }

  setVolume(val: number) {
    this.currentVolume = val;
    localStorage.setItem('stellar_sentinel_volume', val.toString());
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val * (0.25 + this.lastIntensity * 0.15), this.ctx.currentTime, 0.1);
    }
  }

  getVolume() {
    return this.currentVolume;
  }

  private playPianoNote(freq: number, startTime: number, velocity: number = 1.0) {
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    const attack = 0.005;
    const decay = 1.2;
    const release = 1.5;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3 * velocity, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.1 * velocity, startTime + decay);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay + release);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, startTime);
    filter.frequency.exponentialRampToValueAtTime(400, startTime + decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delayNode);

    osc.start(startTime);
    osc.stop(startTime + decay + release);
  }

  private startRhythm() {
    const playTick = () => {
      if (!this.ctx || !this.masterGain) return;
      
      const bpm = 80 + (this.lastIntensity * 40);
      const secondsPerBeat = 60 / bpm;
      const subBeat = secondsPerBeat / 4;
      const now = this.ctx.currentTime;

      const chordIndex = Math.floor(this.beatCount / 16) % this.chords.length;
      const currentChord = this.chords[chordIndex];
      const step = this.beatCount % 16;

      if (step % 4 === 0) {
        this.playPianoNote(currentChord[0], now, 0.8 + this.lastIntensity * 0.2);
      }

      if (Math.random() > 0.3) {
        const noteIndex = Math.floor(Math.random() * (currentChord.length - 1)) + 1;
        this.playPianoNote(currentChord[noteIndex], now, 0.5 + Math.random() * 0.3);
      }

      if (this.lastIntensity > 0.5 && Math.random() > 0.7) {
        this.playPianoNote(currentChord[Math.floor(Math.random() * currentChord.length)] * 2, now, 0.3);
      }

      this.beatCount++;
      this.rhythmTimer = window.setTimeout(playTick, subBeat * 1000);
    };

    playTick();
  }

  updateIntensity(intensity: number) {
    this.lastIntensity = intensity;
    if (!this.ctx || !this.masterGain || !this.delayGain) return;
    
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.currentVolume * (0.25 + intensity * 0.15), now, 1.0);
    this.delayGain.gain.setTargetAtTime(0.3 + intensity * 0.2, now, 1.0);
  }

  playFire() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1 * this.currentVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHit() {
    if (!this.ctx || !this.masterGain) return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1 * this.currentVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  playCollect() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.playPianoNote(1760, now, 0.4);
  }

  stop() {
    if (this.rhythmTimer) clearTimeout(this.rhythmTimer);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioManager = new AudioService();
