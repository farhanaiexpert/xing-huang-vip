let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(
  freqStart: number,
  freqEnd: number,
  gainPeak: number,
  duration: number,
  wave: OscillatorType = 'sine',
  harmonicRatio = 0,
) {
  const ac    = getCtx();
  const now   = ac.currentTime;
  const end   = now + duration;

  const osc   = ac.createOscillator();
  const gain  = ac.createGain();

  osc.type    = wave;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, end);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(end + 0.01);

  if (harmonicRatio > 0) {
    const osc2  = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type   = 'sine';
    osc2.frequency.setValueAtTime(freqStart * harmonicRatio, now);
    osc2.frequency.exponentialRampToValueAtTime(freqEnd * harmonicRatio, end);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(gainPeak * 0.28, now + 0.004);
    gain2.gain.exponentialRampToValueAtTime(0.0001, end * 0.85);
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.start(now);
    osc2.stop(end + 0.01);
  }
}

export function playOddsAdd() {
  try {
    playTone(420, 780, 0.18, 0.09, 'sine', 2.0);
  } catch {}
}

export function playOddsRemove() {
  try {
    playTone(520, 310, 0.10, 0.07, 'sine', 0);
  } catch {}
}
