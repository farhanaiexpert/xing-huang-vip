import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useOddsData } from '@/hooks/useOddsData';

const LOGO_URL = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/World-Cup-logo.png';

export function WorldCupHero() {
  const [, navigate] = useLocation();
  const { allLeagues } = useOddsData();

  const stats = useMemo(() => {
    let total = 0, live = 0, today = 0;
    for (const league of allLeagues) {
      if (league.sportKey !== 'soccer_fifa_world_cup') continue;
      for (const m of league.matches) {
        total++;
        if (m.isLive)              live++;
        if (m.dateTag === 'today') today++;
      }
    }
    return { total, live, today };
  }, [allLeagues]);

  return (
    <button
      onClick={() => navigate('/worldcup')}
      className="group w-full text-left relative rounded-2xl overflow-hidden mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]/50"
      style={{ border: '1.5px solid rgba(250,204,21,0.35)' }}
    >
      {/* ── Layered backgrounds ─────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1C1400] via-[#0C1008] to-[#001C12]" />
      {/* Stadium arc light from top-left */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_-5%_10%,rgba(250,204,21,0.18),transparent)]" />
      {/* Green field glow bottom-right */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_105%_110%,rgba(0,223,169,0.12),transparent)]" />
      {/* Centre spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_50%_0%,rgba(250,204,21,0.06),transparent)]" />

      {/* Shimmer top border */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#FACC15]/0 via-[#FACC15] to-[#FACC15]/0 opacity-80" />
      {/* Bottom accent */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[#00DFA9]/0 via-[#00DFA9]/30 to-[#00DFA9]/0" />

      {/* Hover overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[rgba(250,204,21,0.04)]" />

      {/* ── Content ─────────────────────────────────── */}
      <div className="relative flex items-center gap-4 sm:gap-5 px-4 sm:px-5 py-4 sm:py-5">

        {/* Logo with glow ring */}
        <div className="shrink-0 relative">
          <div className="absolute inset-0 rounded-2xl bg-[#FACC15]/20 blur-lg scale-110 group-hover:bg-[#FACC15]/30 transition-all duration-300" />
          <div className="relative grid place-items-center w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] rounded-2xl border border-[#FACC15]/30 bg-[#FACC15]/5 shadow-[0_0_24px_rgba(250,204,21,0.2)]">
            <img
              src={LOGO_URL}
              alt="FIFA World Cup 2026"
              className="w-10 h-10 sm:w-[52px] sm:h-[52px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
              draggable={false}
            />
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {/* Event label */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-[#FACC15]/70">
              FIFA Official
            </span>
            {stats.live > 0 && (
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                {stats.live} Live
              </span>
            )}
          </div>

          {/* Big title */}
          <h2 className="text-[18px] sm:text-[22px] font-black text-white leading-none mb-1.5 tracking-tight">
            World Cup{' '}
            <span className="text-[#FACC15]">2026</span>
          </h2>

          {/* Subtitle */}
          <p className="text-[11px] sm:text-[12px] text-[#64748B] mb-2.5 leading-none">
            USA · Canada · Mexico &nbsp;·&nbsp; 48 Nations · Group Stage
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {stats.total > 0 && (
              <Pill label="Matches" value={stats.total} color="#FACC15" />
            )}
            {stats.today > 0 && (
              <Pill label="Today" value={stats.today} color="#00DFA9" />
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-black text-[11px] sm:text-[12px] tracking-wide text-[#0B0F14] transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#FACC15,#F59E0B)' }}
          >
            🏆 Bet Now
          </div>
          <span className="text-[9px] text-[#334155] font-medium">Real-time odds</span>
        </div>
      </div>
    </button>
  );
}

function Pill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
      <span className="font-black tabular-nums text-[13px] sm:text-[15px]" style={{ color }}>{value}</span>
      <span className="text-[#475569] font-medium">{label}</span>
    </span>
  );
}
