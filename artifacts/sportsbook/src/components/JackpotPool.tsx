import { useState, useEffect, useRef } from 'react';
import { Trophy, Users, Clock, Zap, Info, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

// Next Saturday 20:00 UTC
function nextDrawMs(): number {
  const now  = new Date();
  const next = new Date(now);
  const day  = now.getUTCDay();
  const diff = (6 - day + 7) % 7 || 7;
  next.setUTCDate(now.getUTCDate() + diff);
  next.setUTCHours(20, 0, 0, 0);
  return next.getTime();
}

function fmtPot(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return { d: '00', h: '00', m: '00', s: '00' };
  const s   = Math.floor(ms / 1000);
  const sec = s % 60;
  const min = Math.floor(s / 60) % 60;
  const hrs = Math.floor(s / 3600) % 24;
  const day = Math.floor(s / 86400);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { d: pad(day), h: pad(hrs), m: pad(min), s: pad(sec) };
}

// Random pot between 10,000 and 50,000 USDT — determined once per session
const SESSION_POT   = 10_000 + Math.random() * 40_000;
const SESSION_USERS = Math.floor(SESSION_POT / 9 + Math.random() * 600 + 400);

export function JackpotPool() {
  const drawTarget = useRef(nextDrawMs());
  const [pot,   setPot]   = useState(SESSION_POT);
  const [users, setUsers] = useState(SESSION_USERS);
  const [cd,    setCd]    = useState(() => fmtCountdown(drawTarget.current - Date.now()));
  const [flash, setFlash] = useState(false);
  const [lastAdd, setLastAdd] = useState(0);

  // Pot jumps to a completely new random total each tick
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function tick() {
      const newPot = parseFloat((10_000 + Math.random() * 40_000).toFixed(2));
      setPot(prev => {
        setLastAdd(parseFloat((newPot - prev).toFixed(2)));
        return newPot;
      });
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
      if (Math.random() < 0.20) setUsers(u => u + Math.floor(Math.random() * 3 + 1));
      timeout = setTimeout(tick, 1200 + Math.random() * 3000);
    }
    timeout = setTimeout(tick, 1500);
    return () => clearTimeout(timeout);
  }, []);

  // Countdown ticks every second
  useEffect(() => {
    const id = setInterval(() => {
      const rem = drawTarget.current - Date.now();
      if (rem <= 0) drawTarget.current = nextDrawMs();
      setCd(fmtCountdown(Math.max(0, drawTarget.current - Date.now())));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Progress: visual weekly fill (starts at ~25%, grows slowly)
  const progress = Math.min(97, 25 + ((pot - SESSION_POT) / 4000) * 60);

  return (
    <div
      className="relative rounded-xl p-px mb-1"
      style={{ background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 45%, #EF4444 100%)' }}
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #140E00 0%, #0D1018 45%, #160520 100%)' }}
      >
        {/* Ambient glows */}
        <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20" style={{ background: '#FACC15' }} />
        <div className="absolute -bottom-12 right-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-10" style={{ background: '#EF4444' }} />

        <div className="relative px-5 py-3.5 flex items-center gap-4">

          {/* ── Trophy icon + label stack ── */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(250,204,21,0.18), rgba(239,68,68,0.08))',
                border: '1px solid rgba(250,204,21,0.28)',
                boxShadow: '0 0 20px rgba(250,204,21,0.12)',
              }}
            >
              <Trophy className="h-5.5 w-5.5 text-[#FACC15]" style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.5))' }} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#FACC15]/50 whitespace-nowrap">Weekly Pool</span>
          </div>

          {/* ── Main pot display ── */}
          <div className="flex-1 min-w-0">
            {/* Top row: label + live badge + trend */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#FACC15]/65">Community Jackpot</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="text-[8px] font-black text-[#EF4444] uppercase tracking-wider">Live</span>
              </div>
              {lastAdd >= 100 && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20">
                  <TrendingUp className="h-2 w-2 text-[#4ADE80]" />
                  <span className="text-[8px] font-black text-[#4ADE80]">BIG BET</span>
                </div>
              )}
            </div>

            {/* The big counter */}
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'font-black tabular-nums leading-none transition-all duration-300',
                  flash ? 'text-[#FDE68A]' : 'text-[#FACC15]',
                  pot >= 30_000 ? 'text-[30px]' : 'text-[28px]',
                )}
                style={{ textShadow: flash ? '0 0 30px rgba(250,204,21,0.9)' : '0 0 14px rgba(250,204,21,0.25)' }}
              >
                {fmtPot(pot)}
              </span>
              <span className="text-[13px] font-black text-[#FACC15]/55 tracking-wide">USDT</span>
              {flash && (
                <span
                  key={String(pot)}
                  className={cn(
                    'text-[11px] font-black tabular-nums',
                    lastAdd >= 500 ? 'text-[#EF4444] animate-bounce' : lastAdd >= 100 ? 'text-[#FACC15] animate-bounce' : 'text-[#4ADE80]',
                  )}
                  style={{ textShadow: lastAdd >= 100 ? '0 0 8px currentColor' : undefined }}
                >
                  +{lastAdd >= 1 ? Math.round(lastAdd).toLocaleString() : lastAdd.toFixed(2)}
                </span>
              )}
            </div>

            {/* Bottom row: participants + prize split hint */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <Users className="h-2.5 w-2.5 text-[#94A3B8]/45" />
                <span className="text-[10px] text-[#94A3B8]/55">
                  <span className="text-[#E2E8F0]/75 font-bold">{users.toLocaleString()}</span> entries
                </span>
              </div>
              <span className="w-1 h-1 rounded-full bg-[#94A3B8]/20" />
              <span className="text-[9px] text-[#94A3B8]/40">
                🥇 <span className="text-[#FACC15]/55 font-bold">70%</span> · 🥈 <span className="text-[#94A3B8]/55 font-bold">20%</span> · 🥉 <span className="text-[#94A3B8]/40 font-bold">10%</span>
              </span>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="shrink-0 w-px h-14 rounded-full" style={{ background: 'linear-gradient(180deg, transparent, rgba(250,204,21,0.18), transparent)' }} />

          {/* ── Countdown ── */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 text-[#94A3B8]/40" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#94A3B8]/40">Next Draw</span>
            </div>
            <div className="flex items-center gap-0.5">
              {([{ v: cd.d, l: 'd' }, { v: cd.h, l: 'h' }, { v: cd.m, l: 'm' }, { v: cd.s, l: 's' }] as const).map(({ v, l }, idx) => (
                <div key={l} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-7 rounded-md flex items-center justify-center"
                      style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.14)' }}
                    >
                      <span className="text-[13px] font-black tabular-nums text-[#FACC15] leading-none">{v}</span>
                    </div>
                    <span className="text-[6.5px] text-[#94A3B8]/35 font-bold uppercase mt-0.5">{l}</span>
                  </div>
                  {idx < 3 && <span className="text-[10px] text-[#FACC15]/25 font-black mx-0.5 mb-1.5">:</span>}
                </div>
              ))}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="shrink-0 w-px h-14 rounded-full" style={{ background: 'linear-gradient(180deg, transparent, rgba(250,204,21,0.18), transparent)' }} />

          {/* ── CTA ── */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <button
              className="px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider text-[#0B0F14] transition-all duration-150 hover:brightness-115 hover:scale-105 active:scale-95 whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)',
                boxShadow: '0 0 20px rgba(250,204,21,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <Zap className="inline h-3 w-3 mr-1.5 -mt-0.5" />
              Enter Draw
            </button>
            <div className="flex items-center gap-1">
              <Info className="h-2.5 w-2.5 text-[#94A3B8]/25" />
              <span className="text-[9px] text-[#94A3B8]/30">Every bet = 1 entry</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full" style={{ background: 'rgba(250,204,21,0.06)' }}>
          <div
            className="h-full transition-all duration-1000 rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #FACC15 0%, #F59E0B 60%, #EF4444 100%)',
              boxShadow: '0 0 6px rgba(250,204,21,0.4)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
