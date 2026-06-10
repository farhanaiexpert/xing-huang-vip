import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useOddsData } from '@/hooks/useOddsData';
import { ChevronRight } from 'lucide-react';

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
        if (m.isLive)            live++;
        if (m.dateTag === 'today') today++;
      }
    }
    return { total, live, today };
  }, [allLeagues]);

  return (
    <button
      onClick={() => navigate('/worldcup')}
      className="group w-full text-left relative rounded-2xl overflow-hidden border border-[#FACC15]/25 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]/40"
    >
      {/* Layered background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1A1200] via-[#0D1510] to-[#001A10]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_0%_50%,rgba(250,204,21,0.10),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_80%_at_100%_50%,rgba(0,223,169,0.06),transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#FACC15]/0 via-[#FACC15]/40 to-[#FACC15]/0" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[#00DFA9]/0 via-[#00DFA9]/20 to-[#00DFA9]/0" />

      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[rgba(250,204,21,0.03)]" />

      <div className="relative flex items-center gap-3 sm:gap-4 px-4 py-3 sm:py-3.5">
        {/* Logo */}
        <div className="shrink-0 relative grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-[#FACC15]/20 bg-white/[0.03] shadow-[0_0_20px_rgba(250,204,21,0.12)]">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#FACC15]/10 to-transparent" />
          <img
            src={LOGO_URL}
            alt="FIFA World Cup 2026"
            className="relative w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
            draggable={false}
          />
        </div>

        {/* Text + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-[13px] sm:text-[15px] font-black text-white leading-none">
              FIFA World Cup 2026
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/25 leading-none">
              🔥 HOT
            </span>
            {stats.live > 0 && (
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25 leading-none">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                {stats.live} LIVE
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#64748B] leading-none mb-2">
            Group Stage · USA, Canada & Mexico
          </p>
          <div className="flex items-center gap-3">
            {stats.total > 0 && (
              <MiniStat label="Matches" value={stats.total} color="#FACC15" />
            )}
            {stats.today > 0 && (
              <MiniStat label="Today" value={stats.today} color="#00DFA9" />
            )}
            <span className="text-[10px] text-[#334155]">48 nations · Bet now →</span>
          </div>
        </div>

        {/* CTA arrow */}
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#FACC15]/20 bg-[#FACC15]/8 group-hover:bg-[#FACC15]/15 group-hover:border-[#FACC15]/40 transition-all duration-200">
          <ChevronRight className="h-4 w-4 text-[#FACC15] group-hover:translate-x-0.5 transition-transform duration-150" />
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px]">
      <span className="text-[#475569]">{label}</span>
      <span className="font-black tabular-nums" style={{ color }}>{value}</span>
    </span>
  );
}
