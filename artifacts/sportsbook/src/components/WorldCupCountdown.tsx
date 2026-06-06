import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, X } from "lucide-react";

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
    <div className="flex items-baseline gap-0.5">
      <span className="font-bold tabular-nums text-white text-[13px] leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] font-semibold text-[#00DFA9] leading-none">{unit}</span>
    </div>
  );
}

export function WorldCupCountdown() {
  const [, setLocation] = useLocation();
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

  const handleOpen = () => setLocation("/promotions");

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
      <div className="relative flex items-center gap-2.5 pl-2 pr-2 py-2 rounded-2xl border border-[#00DFA9]/25 bg-[#0B0F14]/95 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.55)] ring-1 ring-white/5">
        {/* Accent glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[#00DFA9]/10 via-transparent to-[#38BDF8]/10" />

        {/* Close button */}
        <button
          onClick={() => setClosed(true)}
          aria-label="Close countdown"
          className="absolute -top-2 -right-2 z-10 grid place-items-center w-5 h-5 rounded-full bg-[#0D1A26] border border-white/15 text-white/70 hover:text-white hover:border-[#00DFA9]/50 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Logo */}
        <div className="relative shrink-0 grid place-items-center w-9 h-9 rounded-xl bg-[#0D1A26] border border-[#FACC15]/30 overflow-hidden">
          <img
            src={LOGO_URL}
            alt="World Cup 2026"
            className="w-7 h-7 object-contain"
            draggable={false}
          />
        </div>

        {/* Text + countdown */}
        <div className="relative flex flex-col gap-1">
          <span className="text-[12px] font-extrabold leading-none tracking-tight text-[#FACC15]">
            World Cup 2026 Kick-off
          </span>
          <div className="flex items-center gap-1.5">
            <Segment value={remaining.d} unit="D" />
            <span className="text-white/25 text-[11px] leading-none">:</span>
            <Segment value={remaining.h} unit="H" />
            <span className="text-white/25 text-[11px] leading-none">:</span>
            <Segment value={remaining.m} unit="M" />
            <span className="text-white/25 text-[11px] leading-none">:</span>
            <Segment value={remaining.s} unit="S" />
          </div>
        </div>

        {/* Arrow button */}
        <button
          onClick={handleOpen}
          aria-label="View World Cup promotions"
          className="relative shrink-0 grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#00DFA9] to-[#38BDF8] text-[#0B0F14] shadow-[0_4px_14px_rgba(0,223,169,0.35)] hover:brightness-110 active:scale-95 transition-all"
        >
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
