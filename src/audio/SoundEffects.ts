import { AudioEngine } from './AudioEngine';

export class SoundEffects {
  private engine: AudioEngine;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  coinBlip(): void {
    this.engine.playTone(880, 80, 'sine', 0.12);
  }

  crashBuzz(): void {
    this.engine.playSweep(150, 80, 300, 'square', 0.15);
  }

  levelUpArpeggio(): void {
    this.engine.playArpeggio([523, 659, 784, 1047], 80, 'sine', 0.12);
  }

  tabClick(): void {
    this.engine.playNoise(30, 0.06);
  }

  timeskipWhoosh(): void {
    if (this.engine.isMuted()) return;
    const ctx = this.engine.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }

  chestOpen(): void {
    this.engine.playArpeggio([784, 988, 1175], 100, 'sine', 0.1);
  }

  buttonPress(): void {
    this.engine.playTone(440, 40, 'sine', 0.1);
  }

  typewriterTick(): void {
    this.engine.playTone(1200, 15, 'sine', 0.05);
  }
}
