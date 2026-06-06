import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// FIFA World Cup 2026 kicks off June 11, 2026.
const KICKOFF_MS = new Date("2026-06-11T18:00:00Z").getTime();
const LOGO_URL = "https://media.ourwebprojects.pro/wp-content/uploads/2026/06/World-Cup-logo.png";

// Visibility cycle: hidden for CYCLE_MS, then shown for CYCLE_MS, repeating.
const CYCLE_MS = 20_000;

interface Remaining {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
}

function getRemaining(): Remaining {
  const diff = Math.max(0, KICKOFF_MS - Date.now());
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
    done: diff === 0,
  };
}

function Segment({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="grid place-items-center min-w-[26px] px-1.5 py-1 rounded-md bg-white/[0.06] border border-white/10 font-bold tabular-nums text-white text-[13px] leading-none shadow-inner">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[8px] font-semibold tracking-[0.12em] text-white/40 leading-none">{unit}</span>
    </div>
  );
}

export function WorldCupCountdown() {
  const [closed, setClosed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [remaining, setRemaining] = useState<Remaining>(getRemaining);
  const visibleRef = useRef(false);

  // Visibility cadence — toggle every CYCLE_MS (starts hidden, first shows at 20s).
  useEffect(() => {
    if (closed) return;
    const id = setInterval(() => {
      visibleRef.current = !visibleRef.current;
      setVisible(visibleRef.current);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [closed]);

  // Tick the countdown only while the widget is on screen.
  useEffect(() => {
    if (!visible || closed) return;
    setRemaining(getRemaining());
    const id = setInterval(() => setRemaining(getRemaining()), 1_000);
    return () => clearInterval(id);
  }, [visible, closed]);

  if (closed || remaining.done) return null;

  return (
    <div
      className={`fixed left-3 bottom-20 sm:bottom-4 sm:left-4 z-[60] transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-6 opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-label="World Cup 2026 kickoff countdown"
    >
      <div className="relative flex items-center gap-3 pl-2.5 pr-4 py-2.5 rounded-2xl border border-white/10 bg-[#0B0F14]/55 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Soft brand glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00DFA9]/12 via-transparent to-[#38BDF8]/12" />
        {/* Top sheen highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {/* Gold edge accent */}
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-full bg-gradient-to-b from-[#FACC15] to-[#FACC15]/0" />

        {/* Close button */}
        <button
          onClick={() => setClosed(true)}
          aria-label="Close countdown"
          className="absolute top-1 right-1 z-20 grid place-items-center w-5 h-5 rounded-full bg-white/10 border border-white/25 text-white/90 hover:text-white hover:bg-[#00DFA9]/30 hover:border-[#00DFA9] transition-colors"
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
        </button>

        {/* Logo */}
        <div className="relative shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-white/[0.04] border border-[#FACC15]/25 shadow-[0_0_18px_rgba(250,204,21,0.15)] overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FACC15]/15 to-transparent" />
          <img
            src={LOGO_URL}
            alt="World Cup 2026"
            className="relative w-8 h-8 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            draggable={false}
          />
        </div>

        {/* Text + countdown */}
        <div className="relative flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-[#FACC15]/90">
            World Cup 2026 Kick-off
          </span>
          <div className="flex items-start gap-1">
            <Segment value={remaining.d} unit="DAYS" />
            <span className="text-white/20 text-[13px] font-bold leading-none pt-1">:</span>
            <Segment value={remaining.h} unit="HRS" />
            <span className="text-white/20 text-[13px] font-bold leading-none pt-1">:</span>
            <Segment value={remaining.m} unit="MIN" />
            <span className="text-white/20 text-[13px] font-bold leading-none pt-1">:</span>
            <Segment value={remaining.s} unit="SEC" />
          </div>
        </div>
      </div>
    </div>
  );
}
