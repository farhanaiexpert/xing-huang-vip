import { useState } from 'react';
import { ChevronRight, BarChart2, Zap, ShieldCheck, TrendingUp } from 'lucide-react';
import { OddsButton } from './OddsButton';
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
interface PlayerRow {
  name: string; form: (0|1)[];
  kitUrl: string; kitColor: string; no: string;
  toScore: number; scoreOrAssist: number; toBeBooked: number;
}
type BbTab = 'Main' | 'Shots on Target' | 'Shots' | 'Fouls' | 'Tackles';
const BB_TABS: BbTab[] = ['Main', 'Shots on Target', 'Shots', 'Fouls', 'Tackles'];
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

// ── Odds chip ──────────────────────────────────────────────────────────────────
function OddsChip({ odds, active, onClick }: { odds: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-w-[58px] py-2 rounded-lg text-[13px] font-bold tabular-nums text-center transition-all"
      style={active
        ? { background: '#FACC15', color: '#0B0F14', boxShadow: '0 0 10px rgba(250,204,21,0.3)' }
        : { background: 'rgba(250,204,21,0.06)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.15)' }
      }
    >
      {odds.toFixed(2)}
    </button>
  );
}

// ── BET BUILDER section ────────────────────────────────────────────────────────
function BetBuilderSection({ match }: { match: SoccerMatch }) {
  const [tab, setTab] = useState<BbTab>('Main');
  const [selected, setSelected] = useState<string | null>(null);
  const toggle = (k: string) => setSelected(p => p === k ? null : k);

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden"
      style={{
        border: '1px solid rgba(0,223,169,0.18)',
        background: 'linear-gradient(180deg,#15202E 0%,#121821 100%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,#00DFA9 0%,rgba(0,223,169,0.1) 100%)' }} />
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)' }}
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#00DFA9]" />
            <span className="text-[11px] font-black text-[#00DFA9] tracking-widest uppercase">Bet Builder</span>
            <span
              className="text-[11px] font-black px-1 py-0.5 rounded"
              style={{ background: '#00DFA9', color: '#0B0F14' }}
            >+</span>
          </div>
        </div>
        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8] hover:text-[#7DD3FC] transition-colors">
          Player Markets <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match header */}
      <div
        className="mx-4 mb-3 rounded-xl px-4 py-3 flex items-center justify-center gap-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #253241' }}
      >
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-[13px] font-semibold text-[#F8FAFC]">{match.home}</span>
          <KitImg url={match.homeKit} alt={match.home} size={32} color={match.homeColor} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-black text-[#94A3B8]/40 uppercase tracking-wider">vs</span>
          <span className="text-[9px] text-[#94A3B8]/30 font-medium mt-0.5">{match.time}</span>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <KitImg url={match.awayKit} alt={match.away} size={32} color={match.awayColor} />
          <span className="text-[13px] font-semibold text-[#F8FAFC]">{match.away}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
        {BB_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
            style={tab === t
              ? { background: 'rgba(0,223,169,0.12)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.3)' }
              : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.05)' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="flex items-center px-4 py-2 border-y"
        style={{ borderColor: 'rgba(37,50,65,0.7)', background: 'rgba(13,21,32,0.4)' }}
      >
        <div className="flex-1 text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-wider">Player / Last 5</div>
        {['To Score', 'Score or Assist', 'To be Booked'].map(h => (
          <div key={h} className="w-[68px] text-center text-[9.5px] font-bold text-[#94A3B8]/40 uppercase tracking-wide leading-tight px-1">
            {h}
          </div>
        ))}
      </div>

      {/* Player rows */}
      {PLAYERS_MAIN.map((p, i) => {
        const rk = p.name;
        return (
          <div
            key={i}
            className="flex items-center px-4 py-2.5 transition-colors"
            style={{ borderBottom: '1px solid rgba(37,50,65,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,21,32,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            {/* Kit + name + form */}
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <KitImg url={p.kitUrl} alt={p.name} size={34} color={p.kitColor} />
                <span
                  className="absolute -bottom-0.5 -right-1 text-[8px] font-black leading-none"
                  style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                >
                  {p.no}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#F8FAFC] leading-none truncate">{p.name}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  {p.form.map((f, fi) => (
                    <div
                      key={fi}
                      className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black"
                      style={{
                        background: f ? 'rgba(0,223,169,0.18)' : 'rgba(148,163,184,0.08)',
                        color: f ? '#00DFA9' : '#94A3B8',
                        border: `1px solid ${f ? 'rgba(0,223,169,0.35)' : 'rgba(148,163,184,0.12)'}`,
                      }}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Odds */}
            {(['toScore', 'scoreOrAssist', 'toBeBooked'] as const).map(c => (
              <div key={c} className="w-[68px] flex justify-center px-0.5">
                <OddsChip
                  odds={p[c]}
                  active={selected === `${rk}_${c}`}
                  onClick={() => toggle(`${rk}_${c}`)}
                />
              </div>
            ))}
          </div>
        );
      })}

      {/* Show more + next match */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <button className="flex items-center gap-1.5 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
          Show more <ChevronRight className="w-3 h-3" />
        </button>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer flex-1 justify-end"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #253241' }}
        >
          <KitImg url={ALL_MATCHES[1].homeKit} alt={ALL_MATCHES[1].home} size={18} color={ALL_MATCHES[1].homeColor} />
          <span className="text-[11px] font-medium text-[#94A3B8]/70 truncate">
            {ALL_MATCHES[1].home} <span className="text-[#94A3B8]/30">v</span> {ALL_MATCHES[1].away}
          </span>
          <KitImg url={ALL_MATCHES[1].awayKit} alt={ALL_MATCHES[1].away} size={18} color={ALL_MATCHES[1].awayColor} />
          <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]/30 shrink-0" />
        </div>
      </div>
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
