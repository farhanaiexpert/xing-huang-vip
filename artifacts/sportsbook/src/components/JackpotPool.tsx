import { useState, useEffect, useRef } from 'react';
import { Trophy, Users, Clock, Zap, Info } from 'lucide-react';
import { cn } from '../lib/utils';

// Starting pot and weekly draw anchor
const SEED_POT   = 47_821.50;
const SEED_USERS = 3_847;

// Next Saturday 20:00 UTC
function nextDrawMs(): number {
  const now  = new Date();
  const next = new Date(now);
  const day  = now.getUTCDay(); // 0=Sun … 6=Sat
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

export function JackpotPool() {
  const drawTarget = useRef(nextDrawMs());
  const [pot,   setPot]   = useState(SEED_POT);
  const [users, setUsers] = useState(SEED_USERS);
  const [cd,    setCd]    = useState(() => fmtCountdown(drawTarget.current - Date.now()));
  const [flash, setFlash] = useState(false);
  const [lastAdd, setLastAdd] = useState(0);

  // Pot grows: random bet contributions every 1.5–4 s
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function tick() {
      const add = parseFloat((Math.random() * 18 + 0.5).toFixed(2));
      setPot(p => p + add);
      setLastAdd(add);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      // Occasionally a new participant joins
      if (Math.random() < 0.18) setUsers(u => u + 1);
      timeout = setTimeout(tick, 1500 + Math.random() * 2500);
    }
    timeout = setTimeout(tick, 2000);
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

  return (
    <div
      className="relative rounded-xl p-px mb-1"
      style={{ background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 40%, #EF4444 100%)' }}
    >
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #130D00 0%, #0B0F14 50%, #130510 100%)' }}
      >
        {/* Ambient glows */}
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25" style={{ background: '#FACC15' }} />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-15" style={{ background: '#EF4444' }} />

        <div className="relative px-5 py-4 flex items-center gap-5">

          {/* ── Trophy icon ── */}
          <div
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(245,158,11,0.08))', border: '1px solid rgba(250,204,21,0.25)' }}
          >
            <Trophy className="h-6 w-6 text-[#FACC15]" />
          </div>

          {/* ── Centre: label + pot ── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FACC15]/70">Community Jackpot</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="text-[8px] font-black text-[#EF4444] uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* The big number */}
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'text-[28px] font-black tabular-nums leading-none transition-colors duration-300',
                  flash ? 'text-[#FDE68A]' : 'text-[#FACC15]',
                )}
                style={{ textShadow: flash ? '0 0 24px rgba(250,204,21,0.8)' : '0 0 12px rgba(250,204,21,0.3)' }}
              >
                {fmtPot(pot)}
              </span>
              <span className="text-[14px] font-black text-[#FACC15]/60">USDT</span>
              {flash && lastAdd > 0 && (
                <span
                  key={pot}
                  className="text-[11px] font-black text-[#4ADE80] animate-bounce"
                >
                  +{lastAdd.toFixed(2)}
                </span>
              )}
            </div>

            {/* Participants */}
            <div className="flex items-center gap-1.5 mt-1">
              <Users className="h-3 w-3 text-[#94A3B8]/50" />
              <span className="text-[10px] text-[#94A3B8]/60 font-medium">
                <span className="text-[#F8FAFC]/80 font-bold">{users.toLocaleString()}</span> bettors entered this week
              </span>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="shrink-0 w-px h-12 rounded-full" style={{ background: 'linear-gradient(180deg, transparent, rgba(250,204,21,0.2), transparent)' }} />

          {/* ── Countdown ── */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-[#94A3B8]/50" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#94A3B8]/50">Next Draw</span>
            </div>
            <div className="flex items-center gap-1">
              {[{ v: cd.d, l: 'd' }, { v: cd.h, l: 'h' }, { v: cd.m, l: 'm' }, { v: cd.s, l: 's' }].map(({ v, l }) => (
                <div key={l} className="flex flex-col items-center">
                  <div
                    className="w-9 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.15)' }}
                  >
                    <span className="text-[14px] font-black tabular-nums text-[#FACC15] leading-none">{v}</span>
                  </div>
                  <span className="text-[7px] text-[#94A3B8]/40 font-bold uppercase mt-0.5">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="shrink-0 w-px h-12 rounded-full" style={{ background: 'linear-gradient(180deg, transparent, rgba(250,204,21,0.2), transparent)' }} />

          {/* ── CTA ── */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide text-[#0B0F14] transition-all duration-150 hover:brightness-110 hover:scale-105 active:scale-95 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)', boxShadow: '0 0 16px rgba(250,204,21,0.3)' }}
            >
              <Zap className="inline h-3 w-3 mr-1 -mt-0.5" />
              Enter Draw
            </button>
            <div className="flex items-center gap-1">
              <Info className="h-2.5 w-2.5 text-[#94A3B8]/30" />
              <span className="text-[9px] text-[#94A3B8]/35">Every bet = 1 entry</span>
            </div>
          </div>
        </div>

        {/* Progress bar — visual fill toward next draw */}
        <div className="h-0.5 w-full" style={{ background: 'rgba(250,204,21,0.08)' }}>
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${Math.min(99, ((pot - SEED_POT) / 5000) * 100 + 20)}%`,
              background: 'linear-gradient(90deg, #FACC15, #F59E0B)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
