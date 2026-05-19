import { useState } from 'react';
import { ChevronRight, BarChart2 } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';

// ── CDN base ──────────────────────────────────────────────────────────────────
const CDN = 'https://content001.bet365.com/SoccerSilks/';

// ── Kit image with colored-div fallback ───────────────────────────────────────
function KitImg({ url, alt, size = 26, color = '#555' }: { url: string; alt: string; size?: number; color?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="rounded shrink-0 flex items-center justify-center font-black text-white text-[8px]"
        style={{ width: size, height: size, background: color }}
      >
        {alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      className="object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

// ── Match data ─────────────────────────────────────────────────────────────────
interface SoccerMatch {
  id: string; dateLabel: string; time: string;
  home: string; homeKit: string; homeColor: string;
  away: string; awayKit: string; awayColor: string;
  markets: number;
  h: number; d: number; a: number;
  isLive?: boolean; liveMin?: number; score?: { h: number; a: number };
}

const ALL_MATCHES: SoccerMatch[] = [
  {
    id: 'bou_mci', dateLabel: 'Tue 19 May', time: '21:30',
    home: 'Bournemouth', homeKit: CDN + 'Bournemouth_Home_Front_25_26.svg',   homeColor: '#C8102E',
    away: 'Man City',    awayKit: CDN + 'Man%20City%20Home%2025_26%20Front.svg', awayColor: '#6CABDD',
    markets: 9, h: 4.50, d: 4.33, a: 1.66,
  },
  {
    id: 'che_tot', dateLabel: 'Tue 19 May', time: '22:15',
    home: 'Chelsea',    homeKit: CDN + 'Chelsea_Home_Front_2526.svg',         homeColor: '#034694',
    away: 'Tottenham',  awayKit: CDN + 'Tottenham_Front_Home_2526.svg',        awayColor: '#132257',
    markets: 10, h: 1.90, d: 3.70, a: 3.90,
  },
  {
    id: 'shz_dal', dateLabel: 'Tue 19 May', time: '14:35',
    home: 'Shenzhen Xinpengcheng', homeKit: CDN + 'ShenzhenPengCity_Home_2025_26_Front.svg', homeColor: '#D00027',
    away: 'Dalian Young Boy',       awayKit: CDN + 'Soccer_Generic_Solid_Red_Front.svg',       awayColor: '#E03030',
    markets: 3, h: 2.45, d: 3.30, a: 2.70,
  },
  {
    id: 'tjn_hen', dateLabel: 'Tue 19 May', time: '14:35',
    home: 'Tianjin Jinmen Tigers', homeKit: CDN + 'TianjinJinmenTiger_Home_2025_26_Front.svg', homeColor: '#002D72',
    away: 'Henan',                  awayKit: CDN + 'HenanFC_Home_2025_26_Front.svg',             awayColor: '#CC0000',
    markets: 4, h: 3.10, d: 3.10, a: 2.40,
  },
  {
    id: 'cdg_shp', dateLabel: 'Tue 19 May', time: '15:00',
    home: 'Chengdu Rongcheng', homeKit: CDN + 'Chengdu_Rongcheng_Front_Home_26.svg', homeColor: '#D4A017',
    away: 'Shanghai Port',     awayKit: CDN + 'Shanghai%20Port%20Away%2025.svg',      awayColor: '#1E3A5F',
    markets: 5, h: 1.46, d: 4.50, a: 5.75,
  },
  {
    id: 'qgd_bjg', dateLabel: 'Tue 19 May', time: '15:00',
    home: 'Qingdao West Coast', homeKit: CDN + 'QingdaoWestCoast_Home_2025_26_Front.svg', homeColor: '#003DA5',
    away: 'Beijing Guoan',       awayKit: CDN + 'Beijing_Guoan_Front_Home_26.svg',          awayColor: '#00612B',
    markets: 4, h: 4.20, d: 3.70, a: 1.76,
  },
  {
    id: 'gnk_ant', dateLabel: 'Tue 19 May', time: '21:30',
    home: 'Genk',    homeKit: CDN + 'GENK_HOME_FRONT_2025.svg',    homeColor: '#1A4492',
    away: 'Antwerp', awayKit: CDN + 'ANTWERP_HOME_FRONT_2025.svg',  awayColor: '#800000',
    markets: 7, h: 1.57, d: 4.20, a: 5.50,
  },
  {
    id: 'wsl_std', dateLabel: 'Tue 19 May', time: '21:30',
    home: 'Westerlo',       homeKit: CDN + 'Soccer_Generic_Solid_Red_Front.svg', homeColor: '#FFCC00',
    away: 'Standard Liege', awayKit: CDN + 'Soccer_Generic_Solid_Red_Front.svg', awayColor: '#CC0000',
    markets: 5, h: 2.10, d: 3.50, a: 3.30,
  },
  {
    id: 'cha_ohl', dateLabel: 'Tue 19 May', time: '21:30',
    home: 'Charleroi', homeKit: CDN + 'Soccer_Generic_Solid_Red_Front.svg', homeColor: '#1A1A1A',
    away: 'OH Leuven', awayKit: CDN + 'Soccer_Generic_Solid_Red_Front.svg', awayColor: '#FF6600',
    markets: 7, h: 1.85, d: 4.00, a: 3.70,
  },
  {
    id: 'mnz_jvs', dateLabel: 'Tue 19 May', time: '21:00',
    home: 'Monza',      homeKit: CDN + 'Soccer_Generic_Solid_Red_Front.svg', homeColor: '#CC0000',
    away: 'Juve Stabia', awayKit: CDN + 'Soccer_Generic_Solid_Red_Front.svg', awayColor: '#FFD700',
    markets: 5, h: 1.76, d: 3.30, a: 4.75,
  },
];

// ── BET BUILDER player data ────────────────────────────────────────────────────
interface PlayerRow {
  name: string; form: (0|1)[]; kitUrl: string; kitColor: string; no: string;
  toScore: number; scoreOrAssist: number; toBeBooked: number;
}
type BbTab = 'Main' | 'Shots on Target' | 'Shots' | 'Fouls' | 'Tackles';

const BOU_KIT = CDN + 'Bournemouth_Home_Front_25_26.svg';
const MCI_KIT = CDN + 'Man%20City%20Home%2025_26%20Front.svg';

const PLAYERS_MAIN: PlayerRow[] = [
  { name: 'Erling Haaland',    form: [0,1,1,1,1], kitUrl: MCI_KIT, kitColor: '#6CABDD', no: '9',  toScore: 1.53, scoreOrAssist: 1.36, toBeBooked: 5.50 },
  { name: 'Antoine Semenyo',   form: [0,0,0,0,1], kitUrl: BOU_KIT, kitColor: '#C8102E', no: '29', toScore: 2.30, scoreOrAssist: 1.80, toBeBooked: 4.00 },
  { name: 'Rayan Cherki',      form: [1,0,0,0,0], kitUrl: MCI_KIT, kitColor: '#6CABDD', no: '10', toScore: 2.75, scoreOrAssist: 1.66, toBeBooked: 4.75 },
  { name: 'Eli Junior Kroupi', form: [1,0,1,1,0], kitUrl: BOU_KIT, kitColor: '#C8102E', no: '22', toScore: 3.10, scoreOrAssist: 2.37, toBeBooked: 3.25 },
  { name: 'Evanilson',         form: [0,0,0,0,0], kitUrl: BOU_KIT, kitColor: '#C8102E', no: '19', toScore: 3.20, scoreOrAssist: 2.62, toBeBooked: 4.50 },
  { name: 'Rayan Vitor',       form: [0,0,1,1,1], kitUrl: MCI_KIT, kitColor: '#6CABDD', no: '37', toScore: 3.60, scoreOrAssist: 2.50, toBeBooked: 4.33 },
];

const BB_TABS: BbTab[] = ['Main', 'Shots on Target', 'Shots', 'Fouls', 'Tackles'];

// ── Odds chip (yellow, no bet-slip wiring needed for player props here) ──────
function OddsChip({ odds, onClick, active }: { odds: number; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'min-w-[52px] py-1.5 rounded text-[13px] font-bold tabular-nums text-center transition-colors',
        active
          ? 'bg-[#FACC15] text-[#0B0F14]'
          : 'bg-[#1E2C3D] text-[#FACC15] hover:bg-[#253241]'
      )}
    >
      {odds.toFixed(2)}
    </button>
  );
}

// ── BET BUILDER section ───────────────────────────────────────────────────────
function BetBuilderSection({ match }: { match: SoccerMatch }) {
  const [tab, setTab] = useState<BbTab>('Main');
  const [selected, setSelected] = useState<string | null>(null);
  const [col, setCol] = useState<'toScore' | 'scoreOrAssist' | 'toBeBooked' | null>(null);

  const toggle = (key: string) => setSelected(prev => (prev === key ? null : key));

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{ border: '1px solid #253241', background: '#18212B' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#253241]">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-[#00DFA9]" />
          <span className="text-[12px] font-black text-[#00DFA9] tracking-wide uppercase">Bet Builder</span>
          <span className="text-[12px] font-black text-[#00DFA9]">+</span>
        </div>
        <button className="text-[11px] font-semibold text-[#94A3B8]/60 hover:text-[#94A3B8] flex items-center gap-1 transition-colors">
          Player Markets <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Match header */}
      <div className="flex items-center justify-center gap-3 py-2.5 border-b border-[#253241]/60 bg-[#0D1520]/40">
        <div className="flex items-center gap-2">
          <KitImg url={match.homeKit} alt={match.home} size={28} color={match.homeColor} />
          <span className="text-[12px] font-semibold text-[#F8FAFC]">{match.home}</span>
        </div>
        <span className="text-[11px] font-bold text-[#94A3B8]/40">v</span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#F8FAFC]">{match.away}</span>
          <KitImg url={match.awayKit} alt={match.away} size={28} color={match.awayColor} />
        </div>
      </div>
      <p className="text-center text-[10px] text-[#94A3B8]/40 pb-1.5 pt-0.5">
        England Premier League {match.time}
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 pb-2 overflow-x-auto">
        {BB_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold mr-1.5 transition-colors',
              tab === t
                ? 'bg-[#253241] text-[#F8FAFC]'
                : 'text-[#94A3B8]/60 hover:text-[#94A3B8]'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center px-3 pb-1.5 border-b border-[#253241]/50">
        <div className="flex-1 text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider">Player / Last 5</div>
        {(['toScore', 'scoreOrAssist', 'toBeBooked'] as const).map((c, i) => (
          <div key={c} className="w-[72px] text-center text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider leading-tight px-1">
            {['To Score', 'Score or Assist', 'To be Booked'][i]}
          </div>
        ))}
      </div>

      {/* Player rows */}
      <div>
        {PLAYERS_MAIN.map((p, i) => {
          const rowKey = `${p.name}`;
          return (
            <div
              key={i}
              className="flex items-center px-3 py-2 border-b border-[#253241]/40 hover:bg-[#121821]/50 transition-colors"
            >
              {/* Kit + name + form */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <KitImg url={p.kitUrl} alt={p.name} size={30} color={p.kitColor} />
                  <span
                    className="absolute bottom-0 right-[-2px] text-[8px] font-black text-white leading-none"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                  >
                    {p.no}
                  </span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#F8FAFC] leading-none">{p.name}</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {p.form.map((f, fi) => (
                      <div
                        key={fi}
                        className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-black"
                        style={{
                          background: f ? 'rgba(0,223,169,0.15)' : 'rgba(148,163,184,0.1)',
                          color: f ? '#00DFA9' : '#94A3B8',
                          border: `1px solid ${f ? 'rgba(0,223,169,0.3)' : 'rgba(148,163,184,0.15)'}`,
                        }}
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Odds chips */}
              {(['toScore', 'scoreOrAssist', 'toBeBooked'] as const).map(c => {
                const key = `${rowKey}_${c}`;
                return (
                  <div key={c} className="w-[72px] flex justify-center px-1">
                    <OddsChip
                      odds={p[c]}
                      active={selected === key}
                      onClick={() => toggle(key)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Show more */}
      <button className="w-full py-2 text-[11px] font-semibold text-[#38BDF8]/60 hover:text-[#38BDF8] hover:bg-[#121821]/40 transition-colors flex items-center justify-center gap-1">
        Show more <ChevronRight className="w-3 h-3" />
      </button>

      {/* Next match selector */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 border-t border-[#253241] cursor-pointer hover:bg-[#121821]/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <KitImg url={ALL_MATCHES[1].homeKit} alt={ALL_MATCHES[1].home} size={20} color={ALL_MATCHES[1].homeColor} />
          <span className="text-[11px] font-medium text-[#94A3B8] truncate">
            {ALL_MATCHES[1].home} <span className="text-[#94A3B8]/40">v</span> {ALL_MATCHES[1].away}
          </span>
          <KitImg url={ALL_MATCHES[1].awayKit} alt={ALL_MATCHES[1].away} size={20} color={ALL_MATCHES[1].awayColor} />
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]/40 shrink-0" />
      </div>
    </div>
  );
}

// ── Single match row ───────────────────────────────────────────────────────────
function MatchRow({ match, onSelect, selected }: { match: SoccerMatch; onSelect: () => void; selected: boolean }) {
  const shared = {
    matchId: match.id, marketId: `sh_1x2_${match.id}`,
    matchName: `${match.home} v ${match.away}`,
    leagueName: 'Soccer', marketName: 'Match Result',
  };
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 border-b border-[#253241]/50 cursor-pointer transition-colors',
        selected ? 'bg-[#253241]/30' : 'hover:bg-[#121821]/60'
      )}
      onClick={onSelect}
    >
      {/* Kits + names */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <KitImg url={match.homeKit} alt={match.home} size={20} color={match.homeColor} />
          <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">{match.home}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <KitImg url={match.awayKit} alt={match.away} size={20} color={match.awayColor} />
          <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate">{match.away}</span>
        </div>
        {/* Time + market badge */}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#94A3B8]/50 font-medium">{match.time}</span>
          {match.markets > 0 && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm leading-none"
              style={{ background: 'rgba(0,223,169,0.12)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.2)' }}
            >
              {match.markets}»
            </span>
          )}
        </div>
      </div>

      {/* Stats icon */}
      <BarChart2 className="w-3.5 h-3.5 text-[#94A3B8]/25 shrink-0 hidden sm:block" />

      {/* 1X2 */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <OddsButton {...shared} selectionType="1" selectionName={match.home} odds={match.h} />
        <OddsButton {...shared} selectionType="X" selectionName="Draw"       odds={match.d} />
        <OddsButton {...shared} selectionType="2" selectionName={match.away} odds={match.a} />
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
type FilterTab = 'EARLY PAYOUT' | 'ACCA BOOST';

export function SoccerHighlights() {
  const [filter, setFilter] = useState<FilterTab>('EARLY PAYOUT');
  const [bbMatch, setBbMatch] = useState<SoccerMatch>(ALL_MATCHES[0]);

  return (
    <div className="mb-5">
      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-0 mb-3">
        {(['EARLY PAYOUT', 'ACCA BOOST'] as FilterTab[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors mr-1',
              filter === f
                ? 'border-[#00DFA9] text-[#00DFA9]'
                : 'border-transparent text-[#94A3B8]/50 hover:text-[#94A3B8]'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Match list ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid #253241', background: '#18212B' }}
      >
        {/* Date header */}
        <div className="px-3 py-1.5 bg-[#0D1520]/70 border-b border-[#253241]">
          <span className="text-[11px] font-bold text-[#94A3B8]/60 uppercase tracking-wide">Tue 19 May</span>
        </div>

        {/* Matches */}
        {ALL_MATCHES.map(m => (
          <MatchRow
            key={m.id}
            match={m}
            selected={bbMatch.id === m.id}
            onSelect={() => setBbMatch(m)}
          />
        ))}
      </div>

      {/* ── BET BUILDER + ── */}
      <BetBuilderSection match={bbMatch} />
    </div>
  );
}
