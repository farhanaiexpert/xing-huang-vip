import { useState } from 'react';
import { ChevronRight, BarChart2, Zap, ShieldCheck, TrendingUp } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';

// ── CDN ────────────────────────────────────────────────────────────────────────
const CDN = 'https://content001.bet365.com/SoccerSilks/';

// ── Kit image with fallback ────────────────────────────────────────────────────
function KitImg({
  url, alt, size = 26, color = '#555',
}: { url: string; alt: string; size?: number; color?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="rounded shrink-0 flex items-center justify-center font-black text-white"
        style={{ width: size, height: size, background: color, fontSize: size * 0.32 }}
      >
        {alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url} alt={alt} width={size} height={size}
      className="object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

// ── Match data ─────────────────────────────────────────────────────────────────
interface SoccerMatch {
  id: string; time: string;
  home: string; homeKit: string; homeColor: string;
  away: string; awayKit: string; awayColor: string;
  markets: number; league: string;
  h: number; d: number; a: number;
  isLive?: boolean; liveMin?: number; score?: { h: number; a: number };
}

const ALL_MATCHES: SoccerMatch[] = [
  { id: 'bou_mci', time: '21:30', league: 'Premier League',
    home: 'Bournemouth', homeKit: CDN+'Bournemouth_Home_Front_25_26.svg',        homeColor: '#C8102E',
    away: 'Man City',    awayKit: CDN+'Man%20City%20Home%2025_26%20Front.svg',   awayColor: '#6CABDD',
    markets: 9, h: 4.50, d: 4.33, a: 1.66 },
  { id: 'che_tot', time: '22:15', league: 'Premier League',
    home: 'Chelsea',   homeKit: CDN+'Chelsea_Home_Front_2526.svg',               homeColor: '#034694',
    away: 'Tottenham', awayKit: CDN+'Tottenham_Front_Home_2526.svg',             awayColor: '#132257',
    markets: 10, h: 1.90, d: 3.70, a: 3.90 },
  { id: 'shz_dal', time: '14:35', league: 'Chinese Super League',
    home: 'Shenzhen Xinpengcheng', homeKit: CDN+'ShenzhenPengCity_Home_2025_26_Front.svg', homeColor: '#D00027',
    away: 'Dalian Young Boy',      awayKit: CDN+'Soccer_Generic_Solid_Red_Front.svg',       awayColor: '#E03030',
    markets: 3, h: 2.45, d: 3.30, a: 2.70 },
  { id: 'tjn_hen', time: '14:35', league: 'Chinese Super League',
    home: 'Tianjin Jinmen Tigers', homeKit: CDN+'TianjinJinmenTiger_Home_2025_26_Front.svg', homeColor: '#002D72',
    away: 'Henan',                 awayKit: CDN+'HenanFC_Home_2025_26_Front.svg',              awayColor: '#CC0000',
    markets: 4, h: 3.10, d: 3.10, a: 2.40 },
  { id: 'cdg_shp', time: '15:00', league: 'Chinese Super League',
    home: 'Chengdu Rongcheng', homeKit: CDN+'Chengdu_Rongcheng_Front_Home_26.svg', homeColor: '#D4A017',
    away: 'Shanghai Port',     awayKit: CDN+'Shanghai%20Port%20Away%2025.svg',      awayColor: '#1E3A5F',
    markets: 5, h: 1.46, d: 4.50, a: 5.75 },
  { id: 'qgd_bjg', time: '15:00', league: 'Chinese Super League',
    home: 'Qingdao West Coast', homeKit: CDN+'QingdaoWestCoast_Home_2025_26_Front.svg', homeColor: '#003DA5',
    away: 'Beijing Guoan',       awayKit: CDN+'Beijing_Guoan_Front_Home_26.svg',           awayColor: '#00612B',
    markets: 4, h: 4.20, d: 3.70, a: 1.76 },
  { id: 'gnk_ant', time: '21:30', league: 'Belgian Pro League',
    home: 'Genk',    homeKit: CDN+'GENK_HOME_FRONT_2025.svg',   homeColor: '#1A4492',
    away: 'Antwerp', awayKit: CDN+'ANTWERP_HOME_FRONT_2025.svg', awayColor: '#800000',
    markets: 7, h: 1.57, d: 4.20, a: 5.50 },
  { id: 'wsl_std', time: '21:30', league: 'Belgian Pro League',
    home: 'Westerlo',       homeKit: CDN+'Soccer_Generic_Solid_Red_Front.svg', homeColor: '#F5C518',
    away: 'Standard Liege', awayKit: CDN+'Soccer_Generic_Solid_Red_Front.svg', awayColor: '#CC0000',
    markets: 5, h: 2.10, d: 3.50, a: 3.30 },
  { id: 'cha_ohl', time: '21:30', league: 'Belgian Pro League',
    home: 'Charleroi', homeKit: CDN+'Soccer_Generic_Solid_Red_Front.svg', homeColor: '#1A1A1A',
    away: 'OH Leuven', awayKit: CDN+'Soccer_Generic_Solid_Red_Front.svg', awayColor: '#FF6600',
    markets: 7, h: 1.85, d: 4.00, a: 3.70 },
  { id: 'mnz_jvs', time: '21:00', league: 'Serie B',
    home: 'Monza',      homeKit: CDN+'Soccer_Generic_Solid_Red_Front.svg', homeColor: '#CC0000',
    away: 'Juve Stabia', awayKit: CDN+'Soccer_Generic_Solid_Red_Front.svg', awayColor: '#FFD700',
    markets: 5, h: 1.76, d: 3.30, a: 4.75 },
];

// ── BET BUILDER player data ────────────────────────────────────────────────────

const BOU_KIT = CDN + 'Bournemouth_Home_Front_25_26.svg';
const MCI_KIT = CDN + 'Man%20City%20Home%2025_26%20Front.svg';

type BbMarket = 'main' | 'shots_on_target' | 'shots' | 'fouls' | 'tackles';

interface BbPlayer {
  name: string; no: string; kitUrl: string; kitColor: string; last5: string;
}
interface BbCol { label: string; odds: number }

const BB_PLAYERS: BbPlayer[] = [
  { name: 'Erling Haaland',    no: '9',  kitUrl: MCI_KIT, kitColor: '#6CABDD', last5: '0  1  1  1  1' },
  { name: 'Antoine Semenyo',   no: '29', kitUrl: BOU_KIT, kitColor: '#C8102E', last5: '0  0  0  0  1' },
  { name: 'Rayan Cherki',      no: '10', kitUrl: MCI_KIT, kitColor: '#6CABDD', last5: '1  0  0  0  0' },
  { name: 'Eli Junior Kroupi', no: '22', kitUrl: BOU_KIT, kitColor: '#C8102E', last5: '1  0  1  1  0' },
  { name: 'Evanilson',         no: '19', kitUrl: BOU_KIT, kitColor: '#C8102E', last5: '0  0  0  0  0' },
  { name: 'Rayan Vitor',       no: '37', kitUrl: MCI_KIT, kitColor: '#6CABDD', last5: '0  0  1  1  1' },
];

const BB_MARKET_DATA: Record<BbMarket, { cols: string[]; rows: BbCol[][] }> = {
  main: {
    cols: ['To Score', 'Score or Assist', 'To be Booked'],
    rows: [
      [{ label:'To Score', odds:1.53 }, { label:'Score or Assist', odds:1.36 }, { label:'To be Booked', odds:5.50 }],
      [{ label:'To Score', odds:2.30 }, { label:'Score or Assist', odds:1.80 }, { label:'To be Booked', odds:4.00 }],
      [{ label:'To Score', odds:2.75 }, { label:'Score or Assist', odds:1.66 }, { label:'To be Booked', odds:4.75 }],
      [{ label:'To Score', odds:3.10 }, { label:'Score or Assist', odds:2.37 }, { label:'To be Booked', odds:3.25 }],
      [{ label:'To Score', odds:3.20 }, { label:'Score or Assist', odds:2.62 }, { label:'To be Booked', odds:4.50 }],
      [{ label:'To Score', odds:3.60 }, { label:'Score or Assist', odds:2.50 }, { label:'To be Booked', odds:4.33 }],
    ],
  },
  shots_on_target: {
    cols: ['0', '1+', '2+'],
    rows: [
      [{ label:'0', odds:2.80 }, { label:'1+', odds:1.35 }, { label:'2+', odds:2.60 }],
      [{ label:'0', odds:3.20 }, { label:'1+', odds:1.55 }, { label:'2+', odds:3.10 }],
      [{ label:'0', odds:2.95 }, { label:'1+', odds:1.42 }, { label:'2+', odds:2.85 }],
      [{ label:'0', odds:3.50 }, { label:'1+', odds:1.62 }, { label:'2+', odds:3.40 }],
      [{ label:'0', odds:3.30 }, { label:'1+', odds:1.58 }, { label:'2+', odds:3.20 }],
      [{ label:'0', odds:3.10 }, { label:'1+', odds:1.48 }, { label:'2+', odds:2.95 }],
    ],
  },
  shots: {
    cols: ['0', '1+', '2+'],
    rows: [
      [{ label:'0', odds:4.50 }, { label:'1+', odds:1.18 }, { label:'2+', odds:1.75 }],
      [{ label:'0', odds:4.80 }, { label:'1+', odds:1.22 }, { label:'2+', odds:1.90 }],
      [{ label:'0', odds:4.20 }, { label:'1+', odds:1.20 }, { label:'2+', odds:1.80 }],
      [{ label:'0', odds:5.00 }, { label:'1+', odds:1.25 }, { label:'2+', odds:2.00 }],
      [{ label:'0', odds:4.60 }, { label:'1+', odds:1.21 }, { label:'2+', odds:1.88 }],
      [{ label:'0', odds:4.30 }, { label:'1+', odds:1.19 }, { label:'2+', odds:1.78 }],
    ],
  },
  fouls: {
    cols: ['0', '1+', '2+'],
    rows: [
      [{ label:'0', odds:2.40 }, { label:'1+', odds:1.50 }, { label:'2+', odds:2.20 }],
      [{ label:'0', odds:2.60 }, { label:'1+', odds:1.55 }, { label:'2+', odds:2.40 }],
      [{ label:'0', odds:2.50 }, { label:'1+', odds:1.52 }, { label:'2+', odds:2.30 }],
      [{ label:'0', odds:2.35 }, { label:'1+', odds:1.48 }, { label:'2+', odds:2.15 }],
      [{ label:'0', odds:2.70 }, { label:'1+', odds:1.60 }, { label:'2+', odds:2.50 }],
      [{ label:'0', odds:2.45 }, { label:'1+', odds:1.51 }, { label:'2+', odds:2.25 }],
    ],
  },
  tackles: {
    cols: ['0', '1+', '2+'],
    rows: [
      [{ label:'0', odds:3.80 }, { label:'1+', odds:1.28 }, { label:'2+', odds:2.10 }],
      [{ label:'0', odds:4.10 }, { label:'1+', odds:1.32 }, { label:'2+', odds:2.30 }],
      [{ label:'0', odds:3.90 }, { label:'1+', odds:1.30 }, { label:'2+', odds:2.20 }],
      [{ label:'0', odds:4.00 }, { label:'1+', odds:1.31 }, { label:'2+', odds:2.25 }],
      [{ label:'0', odds:4.20 }, { label:'1+', odds:1.35 }, { label:'2+', odds:2.40 }],
      [{ label:'0', odds:3.70 }, { label:'1+', odds:1.27 }, { label:'2+', odds:2.05 }],
    ],
  },
};

const BB_MARKET_TABS: { id: BbMarket; label: string }[] = [
  { id: 'main',            label: 'Main'            },
  { id: 'shots_on_target', label: 'Shots on Target' },
  { id: 'shots',           label: 'Shots'           },
  { id: 'fouls',           label: 'Fouls'           },
  { id: 'tackles',         label: 'Tackles'         },
];

// ── Wired prop cell (adds to bet slip) ─────────────────────────────────────────
function PropCell({
  matchId, matchName, leagueName, market, player, col,
}: {
  matchId: string; matchName: string; leagueName: string;
  market: BbMarket; player: BbPlayer; col: BbCol;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selType = `${player.name}_${market}_${col.label}`;
  const selId   = `${matchId}_bb_${market}-${selType}`;
  const active  = hasSelection(selId);

  function toggle() {
    if (active) removeSelection(selId);
    else addSelection({
      id: selId,
      marketId: `${matchId}_bb_${market}`,
      matchId, matchName, leagueName,
      marketName: col.label,
      selectionType: selType,
      selectionName: `${player.name} — ${col.label}`,
      odds: col.odds,
    });
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex-1 py-2.5 text-center tabular-nums font-bold text-[13px] transition-all duration-150 rounded select-none',
        active
          ? 'text-[#00DFA9] bg-[#00DFA9]/10'
          : 'text-[#FACC15] hover:text-[#FDE68A] hover:bg-[#FACC15]/5'
      )}
    >
      {col.odds.toFixed(2)}
    </button>
  );
}

// ── Player row ─────────────────────────────────────────────────────────────────
function BbPlayerRow({
  player, playerIdx, matchId, matchName, leagueName, market, cols,
}: {
  player: BbPlayer; playerIdx: number;
  matchId: string; matchName: string; leagueName: string;
  market: BbMarket; cols: BbCol[];
}) {
  return (
    <div className="flex items-center border-b border-[#1C2736] last:border-0 hover:bg-[#0B1220]/60 transition-colors">
      {/* Player info */}
      <div className="w-[190px] shrink-0 flex items-center gap-2.5 px-4 py-3 min-w-0">
        <div className="relative shrink-0">
          <KitImg url={player.kitUrl} alt={player.name} size={30} color={player.kitColor} />
          <span
            className="absolute -bottom-0.5 -right-1 text-[8px] font-black leading-none"
            style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
          >
            {player.no}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[#F8FAFC] leading-tight truncate">{player.name}</p>
          <p className="text-[10px] text-[#94A3B8]/45 font-medium mt-0.5 tabular-nums tracking-wide">{player.last5}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-[#253241]/50 shrink-0" />

      {/* Market columns */}
      <div className="flex flex-1">
        {cols.map((col, i) => (
          <PropCell
            key={i}
            matchId={matchId} matchName={matchName} leagueName={leagueName}
            market={market} player={player} col={col}
          />
        ))}
      </div>
    </div>
  );
}

// ── BET BUILDER section ────────────────────────────────────────────────────────
function BetBuilderSection({ match }: { match: SoccerMatch }) {
  const [market, setMarket] = useState<BbMarket>('main');
  const [showAll, setShowAll] = useState(false);

  const data    = BB_MARKET_DATA[market];
  const visible = showAll ? BB_PLAYERS : BB_PLAYERS.slice(0, 5);
  const matchName = `${match.home} v ${match.away}`;

  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ background: '#0D1219', border: '1px solid #253241' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#253241]">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-black tracking-wide text-[#00DFA9]">BET BUILDER</span>
          <span className="text-[13px] font-black ml-0.5 text-[#00DFA9]">+</span>
        </div>
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#94A3B8]/60 hover:text-[#F8FAFC] transition-colors">
          Player Markets <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match header */}
      <div className="flex items-center justify-center gap-4 py-3.5 border-b border-[#1C2736]">
        <div className="flex items-center gap-2">
          <KitImg url={match.homeKit} alt={match.home} size={26} color={match.homeColor} />
          <span className="text-[13px] font-bold text-[#F8FAFC]">{match.home}</span>
        </div>
        <span className="text-[12px] font-black text-[#4B5C6B]">v</span>
        <div className="flex items-center gap-2">
          <KitImg url={match.awayKit} alt={match.away} size={26} color={match.awayColor} />
          <span className="text-[13px] font-bold text-[#F8FAFC]">{match.away}</span>
        </div>
      </div>
      <p className="text-center text-[10.5px] text-[#94A3B8]/50 py-1.5 border-b border-[#1C2736] font-medium">
        {match.league} · {match.time}
      </p>

      {/* Market tabs — underline style matching Europa */}
      <div className="flex border-b border-[#1C2736] bg-[#0B1017] overflow-x-auto">
        {BB_MARKET_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setMarket(tab.id); setShowAll(false); }}
            className={cn(
              'px-4 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0',
              market === tab.id
                ? 'text-[#F8FAFC] border-b-2 border-[#F8FAFC] -mb-px'
                : 'text-[#94A3B8]/60 hover:text-[#F8FAFC]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center border-b border-[#1C2736] bg-[#0B1017]">
        <div className="w-[190px] shrink-0 px-4 py-1.5">
          <span className="text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider">Player / Last 5</span>
        </div>
        <div className="w-px self-stretch bg-[#253241]/50 shrink-0" />
        <div className="flex flex-1">
          {data.cols.map(h => (
            <div key={h} className="flex-1 text-center py-1.5 text-[11px] font-bold text-[#94A3B8]/60">{h}</div>
          ))}
        </div>
      </div>

      {/* Player rows */}
      {visible.map((player, idx) => (
        <BbPlayerRow
          key={player.name}
          player={player}
          playerIdx={idx}
          matchId={match.id}
          matchName={matchName}
          leagueName={match.league}
          market={market}
          cols={data.rows[idx] ?? data.rows[0]}
        />
      ))}

      {/* Show more */}
      <button
        onClick={() => setShowAll(v => !v)}
        className="w-full py-2.5 text-[12px] font-semibold text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors border-t border-[#1C2736] flex items-center justify-center gap-1"
      >
        {showAll ? 'Show less ↑' : 'Show more ↓'}
      </button>
    </div>
  );
}

// ── Single match row ───────────────────────────────────────────────────────────
function MatchRow({
  match, selected, onSelect,
}: { match: SoccerMatch; selected: boolean; onSelect: () => void }) {
  const shared = {
    matchId: match.id, marketId: `sh_1x2_${match.id}`,
    matchName: `${match.home} v ${match.away}`,
    leagueName: match.league, marketName: 'Match Result',
    sportKey: 'soccer_epl',
  };
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all border-b"
      style={{
        borderColor: 'rgba(37,50,65,0.5)',
        background: selected ? 'rgba(0,223,169,0.04)' : undefined,
        borderLeftColor: selected ? '#00DFA9' : 'transparent',
        borderLeftWidth: 2,
      }}
      onClick={onSelect}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(18,24,33,0.6)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = ''; }}
    >
      {/* Time */}
      <div className="w-[42px] shrink-0 text-right">
        {match.isLive ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-0.5 text-[9px] font-black text-[#EF4444]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
            </span>
            <span className="text-[9px] text-[#EF4444]/70 font-semibold">{match.liveMin}'</span>
          </div>
        ) : (
          <span className="text-[10.5px] text-[#94A3B8]/50 font-semibold">{match.time}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <KitImg url={match.homeKit} alt={match.home} size={20} color={match.homeColor} />
          <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">{match.home}</span>
        </div>
        <div className="flex items-center gap-2">
          <KitImg url={match.awayKit} alt={match.away} size={20} color={match.awayColor} />
          <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate">{match.away}</span>
        </div>
      </div>

      {/* Market count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <BarChart2 className="w-3 h-3 text-[#94A3B8]/20 hidden sm:block" />
        {match.markets > 0 && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
            style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            +{match.markets}
          </span>
        )}
      </div>

      {/* 1X2 odds */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <OddsButton {...shared} selectionType="1" selectionName={match.home} odds={match.h} />
        <OddsButton {...shared} selectionType="X" selectionName="Draw"       odds={match.d} />
        <OddsButton {...shared} selectionType="2" selectionName={match.away} odds={match.a} />
      </div>
    </div>
  );
}

// ── Filter pill ────────────────────────────────────────────────────────────────
type FilterTab = 'EARLY PAYOUT' | 'ACCA BOOST';

const FILTER_CONFIG: { id: FilterTab; icon: React.ReactNode; color: string; glow: string; bg: string }[] = [
  {
    id: 'EARLY PAYOUT',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    color: '#00DFA9',
    glow: 'rgba(0,223,169,0.25)',
    bg:   'rgba(0,223,169,0.12)',
  },
  {
    id: 'ACCA BOOST',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: '#FACC15',
    glow: 'rgba(250,204,21,0.25)',
    bg:   'rgba(250,204,21,0.10)',
  },
];

// ── Main export ────────────────────────────────────────────────────────────────
export function SoccerHighlights() {
  const [filter, setFilter] = useState<FilterTab>('EARLY PAYOUT');
  const [bbMatch, setBbMatch] = useState<SoccerMatch>(ALL_MATCHES[0]);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? ALL_MATCHES : ALL_MATCHES.slice(0, 6);

  return (
    <div className="mb-6">

      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Icon badge */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg,rgba(0,223,169,0.2),rgba(0,223,169,0.05))',
              border: '1px solid rgba(0,223,169,0.3)',
              boxShadow: '0 2px 8px rgba(0,223,169,0.15)',
            }}
          >
            <span className="text-[15px] leading-none">⚽</span>
          </div>
          <div>
            <h2 className="text-[14px] font-black text-[#F8FAFC] uppercase tracking-wide leading-none">Soccer</h2>
            <p className="text-[10px] text-[#94A3B8]/40 font-medium mt-0.5 hidden sm:block">Premier League · La Liga · UCL · Serie A</p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Capsule filter pills ── */}
      <div className="flex items-center gap-2.5 mb-4">
        {FILTER_CONFIG.map(f => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all select-none"
              style={isActive
                ? {
                    background: f.bg,
                    color: f.color,
                    border: `1px solid ${f.color}55`,
                    boxShadow: `0 0 12px ${f.glow}, inset 0 0 8px ${f.bg}`,
                  }
                : {
                    background: 'rgba(255,255,255,0.03)',
                    color: '#94A3B8',
                    border: '1px solid rgba(37,50,65,0.8)',
                  }
              }
            >
              <span style={{ color: isActive ? f.color : '#94A3B8' }}>{f.icon}</span>
              {f.id}
            </button>
          );
        })}

        {/* Live count badge */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
          <span className="text-[10px] font-semibold text-[#EF4444]/80">3 Live</span>
        </div>
      </div>

      {/* ── Match table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: '1px solid #253241',
          background: 'linear-gradient(180deg,#18212B 0%,#141C26 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        {/* Column header bar */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: '#253241', background: 'rgba(13,21,32,0.5)' }}
        >
          <span className="text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-wider">Tue 19 May</span>
          <div className="flex items-center gap-1 shrink-0 mr-1">
            {['1','X','2'].map(h => (
              <div key={h} className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">{h}</div>
            ))}
          </div>
        </div>

        {/* Match rows */}
        {visible.map(m => (
          <MatchRow
            key={m.id}
            match={m}
            selected={bbMatch.id === m.id}
            onSelect={() => setBbMatch(m)}
          />
        ))}

        {/* Show more */}
        {!showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#38BDF8]/60 hover:text-[#38BDF8] transition-colors"
            style={{ background: 'rgba(13,21,32,0.3)' }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Show {ALL_MATCHES.length - visible.length} more matches
          </button>
        )}
      </div>

      {/* ── BET BUILDER + ── */}
      <BetBuilderSection match={bbMatch} />
    </div>
  );
}
