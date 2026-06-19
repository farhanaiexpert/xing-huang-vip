import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { SportsSidebar } from '@/components/SportsSidebar';
import { BetSlip } from '@/components/BetSlip';
import { useBetSlipSidebar } from '@/contexts/BetSlipSidebarContext';
import { useWorldCupOdds } from '@/hooks/useWorldCupOdds';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { useI18n } from '@/contexts/I18nContext';
import { formatOdds } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import { getTeamFlag } from '@/lib/countryFlags';
import { RefreshCw, ChevronRight, TrendingUp, Search, Star, X, Clock } from 'lucide-react';
import type { Match } from '@/types';

const LOGO_URL = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/World-Cup-logo.png';
const FAVORITES_KEY = 'wc_favorites_v1';

const WC_TEAM_CODES: Record<string, string> = {
  'United States': 'US', 'USA': 'US', 'Mexico': 'MX', 'Canada': 'CA',
  'Costa Rica': 'CR', 'Panama': 'PA', 'Honduras': 'HN', 'Jamaica': 'JM',
  'El Salvador': 'SV', 'Cuba': 'CU', 'Haiti': 'HT', 'Suriname': 'SR',
  'Trinidad & Tobago': 'TT', 'Curaçao': 'CW', 'Guatemala': 'GT',
  'Brazil': 'BR', 'Argentina': 'AR', 'Colombia': 'CO', 'Ecuador': 'EC',
  'Uruguay': 'UY', 'Venezuela': 'VE', 'Bolivia': 'BO', 'Paraguay': 'PY',
  'Chile': 'CL', 'Peru': 'PE',
  'Germany': 'DE', 'France': 'FR', 'Spain': 'ES', 'England': 'GB-ENG',
  'Netherlands': 'NL', 'Portugal': 'PT', 'Italy': 'IT', 'Belgium': 'BE',
  'Croatia': 'HR', 'Switzerland': 'CH', 'Austria': 'AT', 'Turkey': 'TR',
  'Scotland': 'GB-SCT', 'Poland': 'PL', 'Serbia': 'RS', 'Czech Republic': 'CZ',
  'Ukraine': 'UA', 'Hungary': 'HU', 'Slovakia': 'SK', 'Albania': 'AL',
  'Romania': 'RO', 'Denmark': 'DK', 'Sweden': 'SE', 'Norway': 'NO',
  'Wales': 'GB-WLS', 'Greece': 'GR', 'Bosnia & Herzegovina': 'BA',
  'North Macedonia': 'MK', 'Slovenia': 'SI', 'Finland': 'FI', 'Ireland': 'IE',
  'Morocco': 'MA', 'Senegal': 'SN', 'Nigeria': 'NG', 'Ghana': 'GH',
  'Cameroon': 'CM', 'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI',
  'South Africa': 'ZA', 'Tunisia': 'TN', 'Algeria': 'DZ', 'Egypt': 'EG',
  'DR Congo': 'CD', 'Congo': 'CD', 'Mali': 'ML', 'Zambia': 'ZM',
  'Guinea': 'GN', 'Cape Verde': 'CV', 'Uganda': 'UG', 'Tanzania': 'TZ',
  'Ethiopia': 'ET', 'Kenya': 'KE', 'Angola': 'AO',
  'Japan': 'JP', 'South Korea': 'KR', 'Korea Republic': 'KR',
  'Iran': 'IR', 'Saudi Arabia': 'SA', 'Australia': 'AU', 'Iraq': 'IQ',
  'Jordan': 'JO', 'Qatar': 'QA', 'Uzbekistan': 'UZ', 'China': 'CN',
  'Bahrain': 'BH', 'Oman': 'OM', 'United Arab Emirates': 'AE', 'UAE': 'AE',
  'New Zealand': 'NZ', 'Tahiti': 'PF',
};

function teamFlag(name: string): string {
  const cc = WC_TEAM_CODES[name];
  if (!cc) return '🏳️';
  if (cc.startsWith('GB-')) {
    const sub = cc.split('-')[1];
    if (sub === 'ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    if (sub === 'SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
    if (sub === 'WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
    return '🇬🇧';
  }
  try {
    return cc.slice(0, 2).toUpperCase().split('').map(c =>
      String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
    ).join('');
  } catch { return '🏳️'; }
}

/**
 * Team flag — prefers a real flag image (countryFlags.ts → flagcdn) so it renders
 * consistently across platforms (emoji country flags don't render on Windows).
 * Falls back to the emoji flag if the country can't be resolved or the image
 * fails to load.
 */
function TeamFlag({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const url = getTeamFlag(name);
  const [failed, setFailed] = useState(false);
  const cls = size === 'lg' ? 'w-[34px] h-[24px]' : 'w-[26px] h-[18px]';
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(cls, 'rounded-sm object-cover shrink-0 ring-1 ring-white/10')}
      />
    );
  }
  return <span className={cn('leading-none shrink-0', size === 'lg' ? 'text-[24px]' : 'text-[18px]')}>{teamFlag(name)}</span>;
}

type DateFilter = 'all' | 'live' | 'today' | 'tomorrow' | 'upcoming' | 'favorites';
type MarketTab  = '1x2' | 'ou' | 'btts' | 'hcp';
type SortMode   = 'time' | 'odds' | 'name';

const ZH_WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** Locale-aware kickoff label derived from the ISO commence time, so match
 *  times read "今天 20:00" in Chinese instead of the English "Today, 20:00"
 *  baked into the data layer. */
function formatKickoff(iso: string | undefined, lang: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now      = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const hhmm     = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isZh     = lang === 'zh-CN' || lang === 'zh';
  if (d < todayEnd) return isZh ? `今天 ${hhmm}`  : `Today, ${hhmm}`;
  if (d < tomEnd)   return isZh ? `明天 ${hhmm}`  : `Tomorrow, ${hhmm}`;
  if (isZh) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${ZH_WEEKDAYS[d.getDay()]} ${hhmm}`;
  }
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${hhmm}`;
}

function deriveMarkets(odds1: number, oddsDraw: number | null | undefined, odds2: number) {
  const clamp = (n: number) => Math.max(1.01, Math.round(n * 100) / 100);
  const i1 = 1 / odds1;
  const id = oddsDraw ? 1 / oddsDraw : 0;
  const i2 = 1 / odds2;
  const tot = i1 + id + i2;
  const ph = i1 / tot;
  const pd = id / tot;
  const pa = i2 / tot;
  const ou25O = clamp(1.88 * (1 + (pd - 0.28) * 0.45));
  const ou25U = clamp(1.92 * (1 - (pd - 0.28) * 0.45));
  const bttsY  = clamp(1.62 + pd * 0.7);
  const bttsN  = clamp(2.18 - pd * 0.5);
  const fairLine = (ph - pa) * 3.5;
  const dist  = 0 - fairLine;
  const adjF  = Math.exp(dist * 0.35);
  const hcpIsFavHome = ph > 0.52;
  const hcpIsFavAway = pa > 0.52;
  const hLine = hcpIsFavHome ? '-1' : hcpIsFavAway ? '+1' : '0';
  const aLine = hcpIsFavHome ? '+1' : hcpIsFavAway ? '-1' : '0';
  const hcpH  = clamp(1.90 * adjF);
  const hcpA  = clamp(1.90 / adjF);
  return { ou25O, ou25U, bttsY, bttsN, hLine, aLine, hcpH, hcpA };
}

function WCOddsButton({
  label, odds, selectionId, marketId, match, marketName, selectionType, selectionName, point,
}: {
  label: string; odds: number; selectionId: string; marketId: string;
  match: Match; marketName: string; selectionType: string; selectionName: string; point?: number;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { format: oddsFormat } = useOddsFormat();
  const active = hasSelection(selectionId);

  function toggle() {
    if (active) {
      removeSelection(selectionId);
    } else {
      addSelection({
        id:            selectionId,
        marketId,
        matchId:       match.id,
        matchName:     `${match.team1} v ${match.team2}`,
        leagueName:    'FIFA World Cup 2026',
        marketName,
        selectionType,
        selectionName,
        odds,
        point,
        sportKey:      match.sportKey ?? 'soccer_fifa_world_cup',
        sportId:       'sp_soccer',
        isLive:        match.isLive,
        kickoffTime:   match.kickoffTime,
        commenceTime:  match.commenceIso,
        homeTeam:      match.team1,
        awayTeam:      match.team2,
      });
    }
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-0.5 h-[44px] rounded-lg border text-[10px] font-bold tabular-nums transition-all duration-150',
        'active:scale-95 select-none min-w-0',
        active
          ? 'bg-[#00DFA9]/15 border-[#00DFA9]/60 text-[#00DFA9] shadow-[0_0_10px_rgba(0,223,169,0.2)]'
          : 'bg-[#0D1520] border-[#1E2A38] text-[#CBD5E1] hover:bg-[#111C2B] hover:border-[#253241]'
      )}
    >
      <span className={cn('text-[9px] uppercase tracking-wider font-semibold leading-none', active ? 'text-[#00DFA9]/70' : 'text-[#475569]')}>
        {label}
      </span>
      <span className="text-[13px] font-black leading-none">
        {formatOdds(odds, oddsFormat)}
      </span>
    </button>
  );
}

/** Live ticking countdown to a match kickoff. Numeric output is marked
 *  translate="no" so the DOM translator never mangles the digits. */
function Countdown({ iso, className }: { iso?: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const mins  = Math.floor(diff / 60000) % 60;
  const secs  = Math.floor(diff / 1000) % 60;
  const text = days > 0
    ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`
    : `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return <span translate="no" className={className}>{text}</span>;
}

function FavoriteButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label="Favorite"
      className={cn(
        'shrink-0 grid place-items-center w-6 h-6 rounded-md transition-all duration-150 active:scale-90',
        active ? 'text-[#FACC15]' : 'text-[#475569] hover:text-[#94A3B8]'
      )}
    >
      <Star className="h-3.5 w-3.5" fill={active ? '#FACC15' : 'none'} />
    </button>
  );
}

function WCMatchCard({ match, isFavorite, onToggleFavorite }: {
  match: Match; isFavorite: boolean; onToggleFavorite: (id: string) => void;
}) {
  const [, navigate] = useLocation();
  const { lang } = useI18n();
  const [tab, setTab] = useState<MarketTab>('1x2');
  const kickoff = formatKickoff(match.commenceIso, lang) ?? match.kickoffTime ?? match.date;

  const matchId  = `${match.id}`;

  const sec = useMemo(
    () => deriveMarkets(match.odds.home, match.odds.draw, match.odds.away),
    [match.odds.home, match.odds.draw, match.odds.away]
  );

  const hasOU   = (match.ouOver25 ?? 0) > 0 && (match.ouUnder25 ?? 0) > 0;
  const hasBTTS = (match.bttsYes  ?? 0) > 0 && (match.bttsNo    ?? 0) > 0;

  const tabs: { id: MarketTab; label: string; available: boolean }[] = [
    { id: '1x2',  label: '1X2',    available: true  },
    { id: 'ou',   label: 'O/U',    available: hasOU  },
    { id: 'btts', label: 'BTTS',   available: hasBTTS },
    { id: 'hcp',  label: 'HCP',    available: true  },
  ];

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all duration-150',
      match.isLive
        ? 'border-[#EF4444]/25 bg-[#0D1218] shadow-[0_0_20px_rgba(239,68,68,0.06)]'
        : 'border-[#1A2535] bg-[#0D1218]'
    )}>
      {/* Match header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#1A2535]/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <FavoriteButton active={isFavorite} onClick={() => onToggleFavorite(match.id)} />
          {match.isLive ? (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded shrink-0">
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
              {match.liveMinute ? `${match.liveMinute}'` : 'LIVE'}
            </span>
          ) : (
            <span className="text-[10px] text-[#475569] shrink-0">{kickoff}</span>
          )}
          {match.isLive && match.score && (
            <span className="text-[11px] font-black text-white tabular-nums">
              {match.score.home} – {match.score.away}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(`/match/${match.id}`)}
          className="flex items-center gap-0.5 text-[9px] font-semibold text-[#475569] hover:text-[#00DFA9] transition-colors shrink-0"
        >
          All Markets
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Teams */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          {/* Home team */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <TeamFlag name={match.team1} />
            <span className="text-[12px] font-bold text-[#E2E8F0] truncate">{match.team1}</span>
          </div>
          {/* VS separator */}
          <span className="shrink-0 text-[10px] font-black text-[#334155] px-1">VS</span>
          {/* Away team */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className="text-[12px] font-bold text-[#E2E8F0] truncate text-right">{match.team2}</span>
            <TeamFlag name={match.team2} />
          </div>
        </div>
      </div>

      {/* Market tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1">
        {tabs.map(t => t.available && (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition-all duration-150',
              tab === t.id
                ? 'bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30'
                : 'text-[#475569] hover:text-[#94A3B8]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Odds row */}
      <div className="flex items-center gap-1.5 px-3 pb-3">
        {tab === '1x2' && (
          <>
            <WCOddsButton
              label="1" odds={match.odds.home}
              selectionId={`${matchId}-h2h-1`} marketId={`${matchId}-h2h`}
              match={match} marketName="h2h"
              selectionType="1" selectionName={match.team1}
            />
            {match.odds.draw !== undefined && match.odds.draw > 0 && (
              <WCOddsButton
                label="X" odds={match.odds.draw}
                selectionId={`${matchId}-h2h-x`} marketId={`${matchId}-h2h`}
                match={match} marketName="h2h"
                selectionType="X" selectionName="Draw"
              />
            )}
            <WCOddsButton
              label="2" odds={match.odds.away}
              selectionId={`${matchId}-h2h-2`} marketId={`${matchId}-h2h`}
              match={match} marketName="h2h"
              selectionType="2" selectionName={match.team2}
            />
          </>
        )}
        {tab === 'ou' && hasOU && (
          <>
            <WCOddsButton
              label="O 2.5" odds={match.ouOver25!}
              selectionId={`${matchId}-ou-over`} marketId={`${matchId}-ou`}
              match={match} marketName="totals"
              selectionType="Over 2.5" selectionName="Over" point={2.5}
            />
            <WCOddsButton
              label="U 2.5" odds={match.ouUnder25!}
              selectionId={`${matchId}-ou-under`} marketId={`${matchId}-ou`}
              match={match} marketName="totals"
              selectionType="Under 2.5" selectionName="Under" point={2.5}
            />
          </>
        )}
        {tab === 'btts' && hasBTTS && (
          <>
            <WCOddsButton
              label="Yes" odds={match.bttsYes!}
              selectionId={`${matchId}-btts-yes`} marketId={`${matchId}-btts`}
              match={match} marketName="btts"
              selectionType="Yes" selectionName="Yes"
            />
            <WCOddsButton
              label="No" odds={match.bttsNo!}
              selectionId={`${matchId}-btts-no`} marketId={`${matchId}-btts`}
              match={match} marketName="btts"
              selectionType="No" selectionName="No"
            />
          </>
        )}
        {tab === 'hcp' && (
          <>
            <WCOddsButton
              label={`H ${sec.hLine}`} odds={sec.hcpH}
              selectionId={`${matchId}-hcp-h`} marketId={`${matchId}-hcp`}
              match={match} marketName={`Asian Handicap ${sec.hLine}`}
              selectionType={`H${sec.hLine}`} selectionName={`${match.team1} ${sec.hLine}`}
            />
            <WCOddsButton
              label={`A ${sec.aLine}`} odds={sec.hcpA}
              selectionId={`${matchId}-hcp-a`} marketId={`${matchId}-hcp`}
              match={match} marketName={`Asian Handicap ${sec.hLine}`}
              selectionType={`A${sec.aLine}`} selectionName={`${match.team2} ${sec.aLine}`}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** Big hero card for the next live / upcoming match with a ticking countdown. */
function FeaturedMatch({ match, isFavorite, onToggleFavorite }: {
  match: Match; isFavorite: boolean; onToggleFavorite: (id: string) => void;
}) {
  const [, navigate] = useLocation();
  const matchId = `${match.id}`;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-4 border border-[#00DFA9]/25">
      <div className="absolute inset-0 bg-gradient-to-br from-[#04231B] via-[#0B0F14] to-[#0A1A2A]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(0,223,169,0.12),transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/50 to-transparent" />

      <div className="relative p-4 sm:p-5">
        {/* Top row: label + status + star */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#00DFA9]">
            <Star className="h-3.5 w-3.5" fill="#00DFA9" />
            Featured Match
          </span>
          <div className="flex items-center gap-2">
            {match.isLive ? (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                {match.liveMinute ? `${match.liveMinute}'` : 'LIVE NOW'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#94A3B8]">
                <Clock className="h-3 w-3 text-[#00DFA9]" />
                <span className="text-[#64748B]">Kicks off in</span>
                <Countdown iso={match.commenceIso} className="tabular-nums font-black text-[#FACC15]" />
              </span>
            )}
            <FavoriteButton active={isFavorite} onClick={() => onToggleFavorite(match.id)} />
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <TeamFlag name={match.team1} size="lg" />
            <span className="text-[15px] sm:text-[17px] font-black text-white truncate">{match.team1}</span>
          </div>
          {match.isLive && match.score ? (
            <span className="shrink-0 text-[18px] font-black text-white tabular-nums px-2">
              {match.score.home} – {match.score.away}
            </span>
          ) : (
            <span className="shrink-0 text-[12px] font-black text-[#334155] px-1">VS</span>
          )}
          <div className="flex-1 flex items-center gap-2.5 justify-end min-w-0">
            <span className="text-[15px] sm:text-[17px] font-black text-white truncate text-right">{match.team2}</span>
            <TeamFlag name={match.team2} size="lg" />
          </div>
        </div>

        {/* 1X2 odds */}
        <div className="flex items-center gap-2 mb-3">
          <WCOddsButton
            label={match.team1} odds={match.odds.home}
            selectionId={`${matchId}-h2h-1`} marketId={`${matchId}-h2h`}
            match={match} marketName="h2h"
            selectionType="1" selectionName={match.team1}
          />
          {match.odds.draw !== undefined && match.odds.draw > 0 && (
            <WCOddsButton
              label="Draw" odds={match.odds.draw}
              selectionId={`${matchId}-h2h-x`} marketId={`${matchId}-h2h`}
              match={match} marketName="h2h"
              selectionType="X" selectionName="Draw"
            />
          )}
          <WCOddsButton
            label={match.team2} odds={match.odds.away}
            selectionId={`${matchId}-h2h-2`} marketId={`${matchId}-h2h`}
            match={match} marketName="h2h"
            selectionType="2" selectionName={match.team2}
          />
        </div>

        <button
          onClick={() => navigate(`/match/${match.id}`)}
          className="flex items-center gap-1 text-[11px] font-bold text-[#00DFA9] hover:text-[#00DFA9]/80 transition-colors"
        >
          View all markets
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const DATE_TABS: { id: DateFilter; label: string; alwaysShow?: boolean }[] = [
  { id: 'all',       label: 'All',       alwaysShow: true  },
  { id: 'live',      label: 'Live'                         },
  { id: 'today',     label: 'Today',     alwaysShow: true  },
  { id: 'tomorrow',  label: 'Tomorrow',  alwaysShow: true  },
  { id: 'upcoming',  label: 'Upcoming',  alwaysShow: true  },
  { id: 'favorites', label: 'Favorites', alwaysShow: true  },
];

interface DateGroup {
  label: string;
  matches: Match[];
}

function sortMatches(arr: Match[], mode: SortMode): Match[] {
  const out = [...arr];
  if (mode === 'name') {
    out.sort((a, b) => a.team1.localeCompare(b.team1));
  } else if (mode === 'odds') {
    const top = (m: Match) => Math.max(m.odds.home, m.odds.away, m.odds.draw ?? 0);
    out.sort((a, b) => top(b) - top(a));
  } else {
    out.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      const ta = a.commenceIso ?? '';
      const tb = b.commenceIso ?? '';
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
  }
  return out;
}

export function WorldCupPage() {
  const [, navigate]  = useLocation();
  const { t } = useI18n();
  const { matches: rawWcMatches, loading, lastUpdatedLabel, refreshing, refresh } = useWorldCupOdds();
  const { collapsed: betSlipCollapsed } = useBetSlipSidebar();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('time');

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  }, []);

  // Base list, sorted live-first by time.
  const wcMatches = useMemo<Match[]>(() => sortMatches(rawWcMatches, 'time'), [rawWcMatches]);

  // Apply the team search across the whole list (drives counts + display).
  const searched = useMemo<Match[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wcMatches;
    return wcMatches.filter(m =>
      m.team1.toLowerCase().includes(q) || m.team2.toLowerCase().includes(q)
    );
  }, [wcMatches, search]);

  const counts = useMemo(() => ({
    all:       searched.length,
    live:      searched.filter(m => m.isLive).length,
    today:     searched.filter(m => m.dateTag === 'today').length,
    tomorrow:  searched.filter(m => m.dateTag === 'tomorrow').length,
    upcoming:  searched.filter(m => m.dateTag === 'upcoming').length,
    favorites: searched.filter(m => favorites.has(m.id)).length,
  }), [searched, favorites]);

  // The hero is only shown in the default unfiltered view.
  const featured = useMemo<Match | null>(() => {
    if (dateFilter !== 'all' || search.trim()) return null;
    return wcMatches[0] ?? null;
  }, [wcMatches, dateFilter, search]);

  const flatDisplayed = useMemo(() => {
    let list: Match[];
    if (dateFilter === 'favorites')      list = searched.filter(m => favorites.has(m.id));
    else if (dateFilter === 'live')      list = searched.filter(m => m.isLive);
    else if (dateFilter === 'today')     list = searched.filter(m => m.dateTag === 'today');
    else if (dateFilter === 'tomorrow')  list = searched.filter(m => m.dateTag === 'tomorrow');
    else if (dateFilter === 'upcoming')  list = searched.filter(m => m.dateTag === 'upcoming' && !m.isLive);
    else                                 list = searched;
    return sortMatches(list, sort);
  }, [searched, dateFilter, sort, favorites]);

  const groupedDisplay = useMemo<DateGroup[]>(() => {
    if (dateFilter !== 'all') return [];
    const heroId = featured?.id;
    const pool = heroId ? searched.filter(m => m.id !== heroId) : searched;
    const groups: DateGroup[] = [];
    const live = pool.filter(m => m.isLive);
    if (live.length > 0) groups.push({ label: '🔴 Live Now', matches: sortMatches(live, sort) });
    const today = pool.filter(m => m.dateTag === 'today' && !m.isLive);
    if (today.length > 0) groups.push({ label: 'Today', matches: sortMatches(today, sort) });
    const tomorrow = pool.filter(m => m.dateTag === 'tomorrow');
    if (tomorrow.length > 0) groups.push({ label: 'Tomorrow', matches: sortMatches(tomorrow, sort) });
    const upcoming = pool.filter(m => m.dateTag === 'upcoming' && !m.isLive);
    if (upcoming.length > 0) groups.push({ label: 'Upcoming', matches: sortMatches(upcoming, sort) });
    return groups;
  }, [searched, dateFilter, sort, featured]);

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14 min-h-0">
        <SportsSidebar
          selectedSportId={selectedSportId ?? ''}
          onSelectSport={id => { setSelectedSportId(id); navigate('/'); }}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-4 pb-24 sm:pb-6">

            {/* ── WC Page Header ────────────────────────────── */}
            <div className="relative rounded-2xl overflow-hidden mb-4 border border-[#FACC15]/20">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1200] via-[#0B0F14] to-[#001C12]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,204,21,0.12),transparent)]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FACC15]/40 to-transparent" />

              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5">
                {/* Logo */}
                <div className="shrink-0 grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-[#FACC15]/25 bg-white/[0.03] shadow-[0_0_30px_rgba(250,204,21,0.15)]">
                  <img
                    src={LOGO_URL}
                    alt="FIFA World Cup 2026"
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    draggable={false}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-[18px] sm:text-[22px] font-black text-white leading-none">
                      FIFA World Cup 2026
                    </h1>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30">
                      🔥 LIVE NOW
                    </span>
                  </div>
                  <p className="text-[12px] text-[#94A3B8] mb-3">
                    USA · Canada · Mexico — 48 Teams · Group Stage
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Stat label="Matches" value={counts.all} color="#FACC15" />
                    {counts.live > 0 && <Stat label="Live" value={counts.live} color="#EF4444" pulse />}
                    <Stat label="Today"    value={counts.today}    color="#00DFA9" />
                    <Stat label="Tomorrow" value={counts.tomorrow} color="#38BDF8" />
                    <button
                      onClick={refresh}
                      disabled={refreshing}
                      className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#00DFA9] transition-colors disabled:opacity-60"
                      title="Refresh World Cup matches"
                    >
                      <RefreshCw className={cn('h-2.5 w-2.5', refreshing && 'animate-spin')} />
                      {lastUpdatedLabel || 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Search + Sort controls ────────────────────── */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#475569] pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('Search teams')}
                  className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#0D1218] border border-[#1A2535] text-[12px] text-[#E2E8F0] placeholder:text-[#475569] focus:outline-none focus:border-[#00DFA9]/40 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-5 h-5 rounded text-[#475569] hover:text-[#94A3B8]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortMode)}
                aria-label={t('Sort')}
                className="h-9 px-2.5 rounded-lg bg-[#0D1218] border border-[#1A2535] text-[12px] font-semibold text-[#CBD5E1] focus:outline-none focus:border-[#00DFA9]/40 transition-colors cursor-pointer shrink-0"
              >
                <option value="time">{t('By Time')}</option>
                <option value="odds">{t('Highest Odds')}</option>
                <option value="name">{t('Team A–Z')}</option>
              </select>
            </div>

            {/* ── Date filter tabs ──────────────────────────── */}
            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
              {DATE_TABS.filter(t => t.alwaysShow || counts[t.id] > 0).map(tab => {
                const count = counts[tab.id];
                const active = dateFilter === tab.id;
                const isLiveTab = tab.id === 'live';
                const isFavTab = tab.id === 'favorites';
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDateFilter(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-150 shrink-0',
                      active
                        ? isLiveTab
                          ? 'bg-[#EF4444]/12 text-[#EF4444] border border-[#EF4444]/30'
                          : 'bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30'
                        : 'text-[#64748B] border border-[#1A2535] hover:text-[#94A3B8] hover:border-[#253241]'
                    )}
                  >
                    {isLiveTab && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                    )}
                    {isFavTab && (
                      <Star className="h-3 w-3" fill={active ? '#FACC15' : 'none'} />
                    )}
                    {tab.label}
                    {count > 0 && (
                      <span className={cn(
                        'text-[9px] font-black px-1.5 py-0.5 rounded tabular-nums min-w-[18px] text-center',
                        active
                          ? isLiveTab
                            ? 'bg-[#EF4444]/20 text-[#EF4444]'
                            : 'bg-[#FACC15]/20 text-[#FACC15]'
                          : 'bg-[#1A2535] text-[#475569]'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Match grid ───────────────────────────────── */}
            {loading && wcMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#FACC15]/30 border-t-[#FACC15] animate-spin" />
                <p className="text-[13px] text-[#475569]">Loading World Cup odds…</p>
              </div>
            ) : dateFilter === 'favorites' && flatDisplayed.length === 0 ? (
              favorites.size > 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <span className="text-4xl">🔎</span>
                  <p className="text-[15px] font-semibold text-[#64748B]">No matches found</p>
                  <button
                    onClick={() => setSearch('')}
                    className="text-[12px] text-[#00DFA9] hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Star className="h-9 w-9 text-[#FACC15]/40" />
                  <p className="text-[15px] font-semibold text-[#64748B]">No favorites yet</p>
                  <p className="text-[12px] text-[#475569]">Tap the star on any match to save it here</p>
                </div>
              )
            ) : dateFilter === 'all' ? (
              /* Grouped by date bucket, with featured hero on top */
              !featured && groupedDisplay.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <span className="text-4xl">{search.trim() ? '🔎' : '🏆'}</span>
                  <p className="text-[15px] font-semibold text-[#64748B]">
                    {search.trim() ? 'No matches found' : 'No matches available yet'}
                  </p>
                  {search.trim() && (
                    <button
                      onClick={() => setSearch('')}
                      className="text-[12px] text-[#00DFA9] hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {featured && (
                    <FeaturedMatch
                      match={featured}
                      isFavorite={favorites.has(featured.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  )}
                  {groupedDisplay.map(group => (
                    <div key={group.label}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn(
                          'text-[11px] font-black uppercase tracking-wider',
                          group.label.includes('Live') ? 'text-[#EF4444]' : 'text-[#FACC15]'
                        )}>
                          {group.label}
                        </span>
                        <span className="text-[9px] font-bold text-[#334155] bg-[#1A2535] px-1.5 py-0.5 rounded tabular-nums">
                          {group.matches.length}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-[#1E2A38] to-transparent" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.matches.map(match => (
                          <WCMatchCard
                            key={match.id}
                            match={match}
                            isFavorite={favorites.has(match.id)}
                            onToggleFavorite={toggleFavorite}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : flatDisplayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <span className="text-4xl">🏆</span>
                <p className="text-[15px] font-semibold text-[#64748B]">No matches in this filter</p>
                <button
                  onClick={() => { setDateFilter('all'); setSearch(''); }}
                  className="text-[12px] text-[#00DFA9] hover:underline"
                >
                  Show all matches
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {flatDisplayed.map(match => (
                  <WCMatchCard
                    key={match.id}
                    match={match}
                    isFavorite={favorites.has(match.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}

            {/* ── Trending promo footer ─────────────────────── */}
            {wcMatches.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#334155]">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Live odds &amp; scores refresh every ~90s · Real-time from The Odds API</span>
              </div>
            )}
          </div>
        </main>

        {/* BetSlip sidebar */}
        <aside className={cn(
          'hidden xl:flex shrink-0 transition-all duration-300 ease-in-out',
          !betSlipCollapsed ? 'w-[320px] 2xl:w-[340px]' : 'w-0 overflow-hidden'
        )}>
          {!betSlipCollapsed && (
            <div className="w-[320px] 2xl:w-[340px] h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto border-l border-[#1A2535]">
              <BetSlip />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, color, pulse }: { label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
      <span className="text-[10px] text-[#475569]">{label}</span>
      <span className="text-[11px] font-black tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
