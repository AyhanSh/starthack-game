import { GameStore } from '../state/GameStore';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private store: GameStore;

  constructor(store: GameStore) {
    this.store = store;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.store.getState().isMuted;
  }

  playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15): void {
    if (this.isMuted()) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  }

  playSweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15): void {
    if (this.isMuted()) return;
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration / 1000);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  }

  playNoise(duration: number, volume = 0.08): void {
    if (this.isMuted()) return;
    const ctx = this.ensureContext();
    const bufferSize = ctx.sampleRate * (duration / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  playArpeggio(frequencies: number[], noteDuration: number, type: OscillatorType = 'sine', volume = 0.12): void {
    if (this.isMuted()) return;
    const ctx = this.ensureContext();

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const startTime = ctx.currentTime + (i * noteDuration) / 1000;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + noteDuration / 1000);
    });
  }

  getContext(): AudioContext {
    return this.ensureContext();
  }
}
