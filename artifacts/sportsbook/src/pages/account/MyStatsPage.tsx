import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Zap, Flame, Trophy,
  Loader2, BarChart2, Star, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type RangeDays = 7 | 30 | 90 | 0;

interface StatsSummary {
  totalBets:   number;
  wonBets:     number;
  lostBets:    number;
  voidBets:    number;
  winRate:     number;
  totalStaked: number;
  totalPayout: number;
  netPnl:      number;
  bestWin:     number;
  roi:         number;
  avgOdds:     number;
  avgStake:    number;
}

interface DailyPnl  { date: string; pnl: number; cumulative: number; }
interface SportRow  { sport: string; bets: number; wonBets: number; lostBets: number; staked: number; netPnl: number; }
interface TypeRow   { type: string; count: number; staked: number; }
interface Streaks   { current: number; longest: number; longestLoss: number; }
interface FormBet   { betId: number; status: 'won' | 'lost' | 'void'; odds: number; date: string | null; }
interface MostBacked { selection: string; count: number; roi: number; }

interface StatsData {
  days:                number;
  summary:             StatsSummary;
  dailyPnl:            DailyPnl[];
  sportBreakdown:      SportRow[];
  betTypeBreakdown:    TypeRow[];
  streaks:             Streaks;
  recentForm:          FormBet[];
  mostBackedSelection: MostBacked | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  single: '#00DFA9',
  acca:   '#38BDF8',
  system: '#FACC15',
};

const RANGES: { label: string; value: RangeDays }[] = [
  { label: '7d',  value: 7  },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: 0  },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2); }
function pct(n: number) { return n.toFixed(1) + '%'; }

function shortDate(d: string, chartDays: number) {
  const [, m, day] = d.split('-');
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (chartDays <= 7) return `${parseInt(day)} ${months[parseInt(m)]}`;
  return `${parseInt(day)} ${months[parseInt(m)]}`;
}

// ─── Sport Tooltip (shows win rate) ──────────────────────────────────────────

function SportTooltip({ active, payload }: { active?: boolean; payload?: { payload: SportRow }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const settledInSport = row.wonBets + row.lostBets;
  const winRate = settledInSport > 0
    ? ((row.wonBets / settledInSport) * 100).toFixed(1) + '%'
    : '—';
  return (
    <div className="bg-[#0E1520] border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-xl min-w-[140px]">
      <p className="text-white font-semibold mb-2 capitalize">{row.sport}</p>
      <div className="space-y-1">
        <p className="text-[#64748B]">
          Staked: <span className="text-white font-mono">{row.staked.toFixed(2)} USDT</span>
        </p>
        <p className={row.netPnl >= 0 ? 'text-[#00DFA9]' : 'text-[#EF4444]'}>
          P&L: <span className="font-mono">{fmt(row.netPnl)} USDT</span>
        </p>
        <p className="text-[#64748B]">
          Win rate: <span className="text-white font-semibold">{winRate}</span>
        </p>
        <p className="text-[#475569]">{row.wonBets}W / {row.lostBets}L</p>
      </div>
    </div>
  );
}

// ─── Generic Chart Tooltip ────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { dataKey: string; name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E1520] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-[#94A3B8] mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}:{' '}
          {typeof p.value === 'number'
            ? (p.dataKey === 'cumulative' || p.dataKey === 'pnl'
                ? fmt(p.value) + ' USDT'
                : p.value.toFixed(2))
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color = '#94A3B8',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs mb-2" style={{ color }}>
        {icon}
        {label}
      </div>
      <p className="text-xl font-black text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-[#64748B] mt-1">{sub}</p>}
    </div>
  );
}

// ─── Recent Form Strip ────────────────────────────────────────────────────────

function RecentForm({ form, onBadgeClick }: { form: FormBet[]; onBadgeClick: (betId: number) => void }) {
  if (form.length === 0) return null;

  // Display oldest → newest (form array is newest-first from API, so reverse)
  const ordered = [...form].reverse();

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
      <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-[#38BDF8]" />
        Recent Form
        <span className="text-xs text-[#475569] font-normal ml-1">
          last {form.length} settled · click to view bet
        </span>
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {ordered.map((bet, i) => {
          const isWin  = bet.status === 'won';
          const isLoss = bet.status === 'lost';
          const label  = bet.status[0].toUpperCase();
          const tipText = `${bet.status.charAt(0).toUpperCase() + bet.status.slice(1)} @ ${bet.odds.toFixed(2)}× ${bet.date ? `· ${bet.date}` : ''}`;
          return (
            <button
              key={i}
              title={tipText}
              onClick={() => onBadgeClick(bet.betId)}
              className={`relative group w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black transition-all hover:scale-110 active:scale-95 ${
                isWin  ? 'bg-[#00DFA9]/15 text-[#00DFA9] border border-[#00DFA9]/35 shadow-[0_0_8px_rgba(0,223,169,0.2)] hover:bg-[#00DFA9]/25' :
                isLoss ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/35 hover:bg-[#EF4444]/25' :
                         'bg-white/5 text-[#475569] border border-white/10 hover:bg-white/10'
              }`}
            >
              {label}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#0E1520] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-[#94A3B8] z-20">
                {isWin ? '✅' : isLoss ? '❌' : '🔄'} {bet.odds.toFixed(2)}×
                {bet.date && <span className="ml-1 text-[#334155]">· {bet.date}</span>}
              </div>
            </button>
          );
        })}
        <span className="text-[10px] text-[#334155] ml-auto select-none">oldest → newest</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MyStatsPage() {
  const [, navigate]  = useLocation();
  const [range,   setRange]      = useState<RangeDays>(30);
  const [data,    setData]       = useState<StatsData | null>(null);
  const [loading, setLoading]    = useState(true);
  const [error,   setError]      = useState<string | null>(null);
  // Bumped on each successful data load to drive fade-in animation
  const [animKey, setAnimKey]    = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<StatsData>(`/stats/my?days=${range}`)
      .then(d => { setData(d); setAnimKey(k => k + 1); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [range]);

  // Navigate to bets page and highlight the specific bet card
  function handleFormBadgeClick(betId: number) {
    navigate('/account/bets?highlight=' + betId);
  }

  // ── Time-range toggle (always rendered) ──────────────────────────────────
  const RangeToggle = (
    <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/8 rounded-xl w-fit">
      {RANGES.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => setRange(value)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            range === value
              ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_2px_8px_rgba(0,223,169,0.3)]'
              : 'text-[#64748B] hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00DFA9]" /> My Stats
          </h2>
          {RangeToggle}
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#00DFA9]" />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00DFA9]" /> My Stats
          </h2>
          {RangeToggle}
        </div>
        <div className="flex items-center justify-center h-48 gap-2 text-[#64748B] text-sm">
          <AlertCircle className="w-4 h-4" />
          {error ?? 'Failed to load stats'}
        </div>
      </div>
    );
  }

  const { summary, dailyPnl, sportBreakdown, betTypeBreakdown, streaks, recentForm, mostBackedSelection } = data;
  const pnlPositive  = summary.netPnl >= 0;
  const roiPositive  = summary.roi    >= 0;
  const chartDays    = range > 0 ? range : 90;

  // Sport chart: cap at 5 sports, truncate long names
  const sportChartData = sportBreakdown.slice(0, 5).map(r => ({
    ...r,
    sport: r.sport.length > 9 ? r.sport.slice(0, 9) + '…' : r.sport,
  }));

  // ── Empty state ───────────────────────────────────────────────────────────
  if (summary.totalBets === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00DFA9]" /> My Stats
          </h2>
          {RangeToggle}
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
          <Trophy className="w-10 h-10 text-[#475569] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No settled bets</p>
          <p className="text-sm text-[#64748B]">
            {range === 0 ? 'Place and settle your first bet to start tracking your stats.' : `No bets settled in the last ${range} days. Try a wider time range.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00DFA9]" /> My Stats
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            {range === 0 ? 'All-time performance' : `Last ${range} days`} · {summary.totalBets} settled bets
          </p>
        </div>
        {RangeToggle}
      </div>

      {/* ── Animated content block — fades in on each data refresh ─────── */}
      <div key={animKey} className="space-y-5 animate-in fade-in duration-300">

        {/* ── Primary stat cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Win Rate */}
          <StatCard
            icon={<Target className="w-3.5 h-3.5" />}
            label="Win Rate"
            value={pct(summary.winRate)}
            sub={`${summary.wonBets}W / ${summary.lostBets}L`}
            color="#38BDF8"
          />
          {/* Net P&L */}
          <div className={`bg-white/3 border rounded-2xl p-4 ${pnlPositive ? 'border-[#00DFA9]/25' : 'border-[#EF4444]/25'}`}>
            <div className={`flex items-center gap-2 text-xs mb-2 ${pnlPositive ? 'text-[#00DFA9]' : 'text-[#EF4444]'}`}>
              {pnlPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              Net P&L
            </div>
            <p className={`text-xl font-black leading-none ${pnlPositive ? 'text-[#00DFA9]' : 'text-[#EF4444]'}`}>
              {fmt(summary.netPnl)}
            </p>
            <p className="text-xs text-[#64748B] mt-1">USDT</p>
          </div>
          {/* ROI */}
          <div className={`bg-white/3 border rounded-2xl p-4 ${roiPositive ? 'border-white/8' : 'border-[#EF4444]/20'}`}>
            <div className={`flex items-center gap-2 text-xs mb-2 ${roiPositive ? 'text-[#A78BFA]' : 'text-[#EF4444]'}`}>
              <BarChart2 className="w-3.5 h-3.5" />
              ROI
            </div>
            <p className={`text-xl font-black leading-none ${roiPositive ? 'text-white' : 'text-[#EF4444]'}`}>
              {roiPositive ? '+' : ''}{summary.roi.toFixed(1)}%
            </p>
            <p className="text-xs text-[#64748B] mt-1">return on investment</p>
          </div>
          {/* Best Win */}
          <StatCard
            icon={<Trophy className="w-3.5 h-3.5" />}
            label="Best Win"
            value={summary.bestWin > 0 ? '+' + summary.bestWin.toFixed(2) : '—'}
            sub="USDT profit"
            color="#FACC15"
          />
        </div>

        {/* ── Secondary metrics ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Zap className="w-3.5 h-3.5" />}
            label="Total Staked"
            value={summary.totalStaked.toFixed(2)}
            sub="USDT"
            color="#FACC15"
          />
          <StatCard
            icon={<Zap className="w-3.5 h-3.5" />}
            label="Avg Stake"
            value={summary.avgStake.toFixed(2)}
            sub="USDT per bet"
            color="#FACC15"
          />
          <StatCard
            icon={<Target className="w-3.5 h-3.5" />}
            label="Avg Odds"
            value={summary.avgOdds.toFixed(2)}
            sub="per bet"
            color="#38BDF8"
          />
        </div>

        {/* ── Recent form strip ───────────────────────────────────────── */}
        {recentForm.length > 0 && (
          <RecentForm form={recentForm} onBadgeClick={handleFormBadgeClick} />
        )}

        {/* ── Streaks ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00DFA9]/10 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-[#00DFA9]" />
            </div>
            <div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Current</p>
              <p className="text-lg font-black text-white leading-none">
                {streaks.current}<span className="text-xs font-medium text-[#64748B] ml-1">W</span>
              </p>
            </div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15]/10 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#FACC15]" />
            </div>
            <div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Best Win</p>
              <p className="text-lg font-black text-white leading-none">
                {streaks.longest}<span className="text-xs font-medium text-[#64748B] ml-1">streak</span>
              </p>
            </div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EF4444]/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider">Worst Loss</p>
              <p className="text-lg font-black text-white leading-none">
                {streaks.longestLoss}<span className="text-xs font-medium text-[#64748B] ml-1">streak</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Cumulative P&L chart ────────────────────────────────────── */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-4">
            {range === 0 ? '90-Day' : `${range}-Day`} Cumulative P&L
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyPnl} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={pnlPositive ? '#00DFA9' : '#EF4444'} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={pnlPositive ? '#00DFA9' : '#EF4444'} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={d => shortDate(d, chartDays)}
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false} tickLine={false}
                interval={Math.max(1, Math.floor(chartDays / 7) - 1)}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="P&L"
                stroke={pnlPositive ? '#00DFA9' : '#EF4444'}
                strokeWidth={2}
                fill="url(#pnlGrad)"
                dot={false}
                activeDot={{ r: 4, fill: pnlPositive ? '#00DFA9' : '#EF4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Sport P&L + Bet type row ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Enhanced sport breakdown — Staked vs Net P&L + win rate tooltip */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <p className="text-sm font-semibold text-white mb-4">P&L by Sport</p>
            {sportChartData.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-6">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={sportChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  barSize={8}
                  barGap={2}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="sport"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    width={60}
                  />
                  {/* Sport-specific tooltip showing win rate */}
                  <Tooltip content={<SportTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 10, color: '#64748B', paddingTop: 8 }}
                  />
                  <Bar dataKey="staked" name="Staked" fill="#334155" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="netPnl" name="Net P&L" radius={[0, 3, 3, 0]}>
                    {sportChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.netPnl >= 0 ? '#00DFA9' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bet type donut */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <p className="text-sm font-semibold text-white mb-4">Bet Type Mix</p>
            {betTypeBreakdown.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-6">No data yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie
                      data={betTypeBreakdown}
                      dataKey="count"
                      nameKey="type"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {betTypeBreakdown.map((entry, i) => (
                        <Cell
                          key={entry.type}
                          fill={TYPE_COLORS[entry.type] ?? `hsl(${i * 80}, 60%, 55%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} bets`, name]}
                      contentStyle={{ background: '#0E1520', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                      labelStyle={{ color: '#94A3B8' }}
                      itemStyle={{ color: '#F8FAFC' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5 flex-1">
                  {betTypeBreakdown.map((r, i) => (
                    <div key={r.type} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: TYPE_COLORS[r.type] ?? `hsl(${i * 80}, 60%, 55%)` }}
                        />
                        <span className="text-xs text-[#94A3B8] capitalize">{r.type}</span>
                      </div>
                      <span className="text-xs font-semibold text-white tabular-nums">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Most-backed selection ───────────────────────────────────── */}
        {mostBackedSelection && (
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#FACC15] fill-[#FACC15]" />
              Most-Backed Pick
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-black text-white truncate">{mostBackedSelection.selection}</p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Backed{' '}
                  <span className="text-[#94A3B8] font-semibold">{mostBackedSelection.count}×</span>{' '}
                  in this period
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-black ${mostBackedSelection.roi >= 0 ? 'text-[#00DFA9]' : 'text-[#EF4444]'}`}>
                  {mostBackedSelection.roi >= 0 ? '+' : ''}{mostBackedSelection.roi.toFixed(1)}%
                </p>
                <p className="text-[10px] text-[#475569] mt-0.5">ROI on this pick</p>
              </div>
            </div>
          </div>
        )}

      </div>{/* end animated block */}
    </div>
  );
}
