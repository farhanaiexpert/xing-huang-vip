import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Zap, Flame, Trophy, Loader2 } from 'lucide-react';
import { api } from '@/lib/apiClient';

interface StatsSummary {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  voidBets: number;
  winRate: number;
  totalStaked: number;
  totalPayout: number;
  netPnl: number;
  bestWin: number;
}

interface DailyPnl { date: string; pnl: number; cumulative: number; }
interface SportRow  { sport: string; bets: number; staked: number; netPnl: number; }
interface TypeRow   { type: string;  count: number; staked: number; }
interface Streaks   { current: number; longest: number; }

interface StatsData {
  summary: StatsSummary;
  dailyPnl: DailyPnl[];
  sportBreakdown: SportRow[];
  betTypeBreakdown: TypeRow[];
  streaks: Streaks;
}

const TYPE_COLORS: Record<string, string> = {
  single: '#00DFA9',
  acca:   '#38BDF8',
  system: '#FACC15',
};
const SPORT_COLOR = '#38BDF8';

function fmt(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}
function pct(n: number) {
  return n.toFixed(1) + '%';
}
function shortDate(d: string) {
  const [, m, day] = d.split('-');
  return `${parseInt(day)} ${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)]}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E1520] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-[#94A3B8] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}: {typeof p.value === 'number' ? fmt(p.value) + ' USDT' : p.value}
        </p>
      ))}
    </div>
  );
};

export function MyStatsPage() {
  const [data, setData]       = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    api.get<StatsData>('/stats/my')
      .then(setData)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#00DFA9]" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-48 text-[#64748B] text-sm">
        {error ?? 'Failed to load stats'}
      </div>
    );
  }

  const { summary, dailyPnl, sportBreakdown, betTypeBreakdown, streaks } = data;
  const pnlPositive = summary.netPnl >= 0;

  // Empty state
  if (summary.totalBets === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00DFA9]" /> My Stats
        </h2>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
          <Trophy className="w-10 h-10 text-[#475569] mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No bets yet</p>
          <p className="text-sm text-[#64748B]">Place your first bet to start tracking your stats.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00DFA9]" /> My Stats
        </h2>
        <p className="text-sm text-[#64748B] mt-0.5">All-time performance from settled bets.</p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Win Rate */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#38BDF8] text-xs mb-2">
            <Target className="w-3.5 h-3.5" /> Win Rate
          </div>
          <p className="text-2xl font-black text-white">{pct(summary.winRate)}</p>
          <p className="text-xs text-[#64748B] mt-0.5">{summary.wonBets}W / {summary.lostBets}L</p>
        </div>

        {/* Net P&L */}
        <div className={`bg-white/3 border rounded-2xl p-4 ${pnlPositive ? 'border-[#00DFA9]/20' : 'border-[#EF4444]/20'}`}>
          <div className={`flex items-center gap-2 text-xs mb-2 ${pnlPositive ? 'text-[#00DFA9]' : 'text-[#EF4444]'}`}>
            {pnlPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            Net P&L
          </div>
          <p className={`text-2xl font-black ${pnlPositive ? 'text-[#00DFA9]' : 'text-[#EF4444]'}`}>
            {fmt(summary.netPnl)}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">USDT</p>
        </div>

        {/* Total Staked */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#FACC15] text-xs mb-2">
            <Zap className="w-3.5 h-3.5" /> Total Staked
          </div>
          <p className="text-2xl font-black text-white">{summary.totalStaked.toFixed(2)}</p>
          <p className="text-xs text-[#64748B] mt-0.5">USDT · {summary.totalBets} bets</p>
        </div>

        {/* Best Win */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[#FACC15] text-xs mb-2">
            <Trophy className="w-3.5 h-3.5" /> Best Win
          </div>
          <p className="text-2xl font-black text-white">{summary.bestWin > 0 ? '+' + summary.bestWin.toFixed(2) : '—'}</p>
          <p className="text-xs text-[#64748B] mt-0.5">USDT profit</p>
        </div>
      </div>

      {/* ── Streaks ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#00DFA9]/10 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-[#00DFA9]" />
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Current Streak</p>
            <p className="text-xl font-black text-white">{streaks.current}
              <span className="text-sm font-medium text-[#64748B] ml-1">wins</span>
            </p>
          </div>
        </div>
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#FACC15]/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-[#FACC15]" />
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Longest Streak</p>
            <p className="text-xl font-black text-white">{streaks.longest}
              <span className="text-sm font-medium text-[#64748B] ml-1">wins</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 30-day Cumulative P&L ─────────────────────────────────────── */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
        <p className="text-sm font-semibold text-white mb-4">30-Day Cumulative P&L</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={dailyPnl} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pnlPositive ? '#00DFA9' : '#EF4444'} stopOpacity={0.25} />
                <stop offset="100%" stopColor={pnlPositive ? '#00DFA9' : '#EF4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval={6}
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

      {/* ── Sport + Bet Type row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Sport breakdown */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-4">By Sport</p>
          {sportBreakdown.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-6">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={sportBreakdown.slice(0, 6)}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                barSize={10}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="sport"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  width={64}
                  tickFormatter={s => s.length > 8 ? s.slice(0, 8) + '…' : s}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="bets" name="Bets" fill={SPORT_COLOR} radius={[0, 4, 4, 0]} />
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
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={betTypeBreakdown}
                    dataKey="count"
                    nameKey="type"
                    innerRadius={32}
                    outerRadius={52}
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
              <div className="space-y-2 flex-1">
                {betTypeBreakdown.map((r, i) => (
                  <div key={r.type} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
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
    </div>
  );
}
