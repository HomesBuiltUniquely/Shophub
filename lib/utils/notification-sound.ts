/**
 * Plays a clean, crisp notification chime using the Web Audio API.
 * Synthesizes a high-fidelity bell chord so no external audio files are required.
 */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Tone 2: A5 (880.00 Hz) — harmonic chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.09);
    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.45);

    // Tone 3: subtle C#6 overtone (1108.73 Hz) for crystal bell texture
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1108.73, now + 0.12);
    gain3.gain.setValueAtTime(0, now + 0.12);
    gain3.gain.linearRampToValueAtTime(0.08, now + 0.14);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.12);
    osc3.stop(now + 0.35);
  } catch (error) {
    console.debug('[notification-sound] AudioContext could not play:', error);
  }
}
