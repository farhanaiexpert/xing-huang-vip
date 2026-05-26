import { useState, useEffect } from 'react';
import { Shield, Clock, Ban, AlertTriangle, TrendingDown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';

interface UserLimit {
  id: number;
  limitType: string;
  period: string;
  amountUsdt: string;
  currentUsage: string;
  resetAt: string;
}

interface SelfExclusion {
  id: number;
  isPermanent: boolean;
  isTakeABreak: boolean;
  endsAt: string | null;
  createdAt: string;
}

interface RGStatus {
  limits: UserLimit[];
  exclusion: SelfExclusion | null;
}

type Tab = 'overview' | 'limits' | 'exclusion';
type LimitType = 'deposit' | 'loss';
type Period = 'daily' | 'weekly' | 'monthly';

const EXCLUSION_OPTIONS = [
  { label: '24 Hours', hours: 24, description: 'Short cooling-off break', icon: Clock, color: 'text-[#38BDF8]' },
  { label: '7 Days', hours: 168, description: 'One-week break', icon: Clock, color: 'text-[#FACC15]' },
  { label: '30 Days', hours: 720, description: 'One-month break', icon: Clock, color: 'text-orange-400' },
  { label: '90 Days', hours: 2160, description: 'Three-month exclusion', icon: Ban, color: 'text-red-400' },
  { label: 'Permanent', hours: null, description: 'Permanently close betting', icon: Ban, color: 'text-red-500' },
];

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} day${d > 1 ? 's' : ''} remaining`;
  return `${h} hour${h > 1 ? 's' : ''} remaining`;
}

export function ResponsibleGamblingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<RGStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Limit form state
  const [limitType, setLimitType] = useState<LimitType>('loss');
  const [period, setPeriod] = useState<Period>('daily');
  const [limitAmount, setLimitAmount] = useState('');

  // Exclusion state
  const [selExclusion, setSelExclusion] = useState<number | null | undefined>(undefined); // undefined=no selection, number=hours, null=permanent
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    api.get<RGStatus>('/rg/status')
      .then(data => setStatus(data))
      .catch(() => setStatus({ limits: [], exclusion: null }))
      .finally(() => setLoading(false));
  }, []);

  function flash(type: 'ok' | 'err', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleSetLimit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(limitAmount);
    if (isNaN(amt) || amt <= 0) { flash('err', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      await api.post('/rg/limits', { limitType, period, amountUsdt: amt });
      const updated = await api.get<RGStatus>('/rg/status');
      setStatus(updated);
      setLimitAmount('');
      flash('ok', `${limitType.charAt(0).toUpperCase() + limitType.slice(1)} limit set — ${amt.toFixed(2)} USDT ${period}`);
    } catch (e) {
      flash('err', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveLimit(id: number) {
    setSaving(true);
    try {
      await api.delete(`/rg/limits/${id}`);
      setStatus(prev => prev ? { ...prev, limits: prev.limits.filter(l => l.id !== id) } : prev);
      flash('ok', 'Limit removed');
    } catch (e) {
      flash('err', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExclusion() {
    if (!confirm) { flash('err', 'Please confirm you understand by checking the box'); return; }
    const opt = EXCLUSION_OPTIONS.find(o => o.hours === selExclusion);
    if (!opt && selExclusion !== null) { flash('err', 'Select an exclusion period'); return; }
    setSaving(true);
    try {
      await api.post('/rg/exclusion', {
        durationHours: selExclusion ?? undefined,
        isPermanent: selExclusion === null,
        isTakeABreak: selExclusion !== null && selExclusion !== undefined && selExclusion <= 24,
      });
      const updated = await api.get<RGStatus>('/rg/status');
      setStatus(updated);
      setConfirm(false);
      flash('ok', selExclusion === null ? 'Account permanently excluded' : `Break activated — ${opt?.label}`);
      setTab('overview');
    } catch (e) {
      flash('err', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-[#00DFA9]" />
      </div>
    );
  }

  const active = status?.exclusion;
  const limits = status?.limits ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#00DFA9]" /> Responsible Gambling
        </h2>
        <p className="text-sm text-[#64748B] mt-0.5">
          Tools to help you stay in control. All limits take effect immediately.
        </p>
      </div>

      {/* Active exclusion banner */}
      {active && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${active.isPermanent ? 'bg-red-400/8 border-red-400/20' : 'bg-yellow-400/8 border-yellow-400/20'}`}>
          <Ban className={`w-5 h-5 mt-0.5 ${active.isPermanent ? 'text-red-400' : 'text-yellow-400'}`} />
          <div>
            <p className={`font-semibold text-sm ${active.isPermanent ? 'text-red-300' : 'text-yellow-300'}`}>
              {active.isTakeABreak ? 'Cooling-off break active' : active.isPermanent ? 'Account permanently excluded' : 'Self-exclusion active'}
            </p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {active.isPermanent
                ? 'Betting is disabled. Contact support to discuss options.'
                : active.endsAt
                  ? `${timeLeft(active.endsAt)} · Betting is temporarily blocked.`
                  : 'Betting is blocked.'}
            </p>
          </div>
        </div>
      )}

      {/* Flash message */}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
          msg.type === 'ok' ? 'bg-[#00DFA9]/8 border-[#00DFA9]/20 text-[#00DFA9]' : 'bg-red-400/8 border-red-400/20 text-red-400'
        }`}>
          {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {(['overview', 'limits', 'exclusion'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-[#0B0F14] text-white shadow' : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}>
            {t === 'exclusion' ? 'Self-Exclude' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setTab('limits')}>
              <div className="flex items-center gap-2 text-[#38BDF8] text-sm mb-2">
                <TrendingDown className="w-4 h-4" /> Spend Limits
              </div>
              <p className="text-white font-semibold">{limits.length} active limit{limits.length !== 1 ? 's' : ''}</p>
              <p className="text-[#64748B] text-xs mt-0.5">Set daily, weekly, or monthly caps on deposits or losses →</p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setTab('exclusion')}>
              <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                <Ban className="w-4 h-4" /> Self-Exclusion
              </div>
              <p className="text-white font-semibold">
                {active ? (active.isPermanent ? 'Permanently excluded' : 'Break active') : 'Not excluded'}
              </p>
              <p className="text-[#64748B] text-xs mt-0.5">Take a break or permanently exclude yourself →</p>
            </div>
          </div>

          {limits.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-white">Active Limits</p>
              {limits.map(lim => {
                const used = parseFloat(lim.currentUsage);
                const cap = parseFloat(lim.amountUsdt);
                const pct = Math.min(100, Math.round((used / cap) * 100));
                return (
                  <div key={lim.id}>
                    <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                      <span className="capitalize">{lim.limitType} ({lim.period})</span>
                      <span className="font-mono">{used.toFixed(2)} / {cap.toFixed(2)} USDT</span>
                    </div>
                    <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-[#00DFA9]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Support Resources</p>
            <p className="text-xs text-[#64748B]">
              If you feel your gambling may be out of control, please reach out for help:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { name: 'GamCare', url: 'https://www.gamcare.org.uk' },
                { name: 'BeGambleAware', url: 'https://www.begambleaware.org' },
                { name: 'Gambling Therapy', url: 'https://www.gamblingtherapy.org' },
              ].map(r => (
                <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#38BDF8] hover:underline border border-[#38BDF8]/20 px-2 py-1 rounded-lg hover:bg-[#38BDF8]/5 transition-colors">
                  {r.name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Limits tab */}
      {tab === 'limits' && (
        <div className="space-y-4">
          <form onSubmit={handleSetLimit} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-4">
            <p className="text-sm font-medium text-white">Set a New Limit</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#64748B] mb-1.5 block">Limit Type</label>
                <div className="flex gap-1">
                  {(['loss', 'deposit'] as LimitType[]).map(t => (
                    <button key={t} type="button"
                      onClick={() => setLimitType(t)}
                      className={`flex-1 text-xs py-2 rounded-lg border capitalize transition-colors ${
                        limitType === t
                          ? 'bg-[#00DFA9]/15 border-[#00DFA9]/40 text-[#00DFA9]'
                          : 'bg-white/3 border-white/10 text-[#94A3B8] hover:text-white'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748B] mb-1.5 block">Period</label>
                <div className="flex gap-1">
                  {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
                    <button key={p} type="button"
                      onClick={() => setPeriod(p)}
                      className={`flex-1 text-xs py-2 rounded-lg border capitalize transition-colors ${
                        period === p
                          ? 'bg-[#38BDF8]/15 border-[#38BDF8]/40 text-[#38BDF8]'
                          : 'bg-white/3 border-white/10 text-[#94A3B8] hover:text-white'
                      }`}>
                      {p.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#64748B] mb-1.5 block">Max Amount (USDT)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={limitAmount}
                  onChange={e => setLimitAmount(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-16 text-white text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#00DFA9]/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">USDT</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#00DFA9] hover:bg-[#00DFA9]/90 text-[#0B0F14] font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Set Limit
            </button>
          </form>

          {limits.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">Your Active Limits</p>
              {limits.map(lim => {
                const used = parseFloat(lim.currentUsage);
                const cap = parseFloat(lim.amountUsdt);
                const pct = Math.min(100, Math.round((used / cap) * 100));
                return (
                  <div key={lim.id} className="bg-white/3 border border-white/8 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm text-white capitalize">{lim.limitType} — {lim.period}</p>
                        <p className="text-xs text-[#64748B]">
                          Resets {new Date(lim.resetAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveLimit(lim.id)}
                        disabled={saving}
                        className="text-xs text-red-400 hover:bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-lg transition-colors">
                        Remove
                      </button>
                    </div>
                    <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                      <span>{used.toFixed(2)} USDT used</span>
                      <span>{cap.toFixed(2)} USDT cap</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-[#00DFA9]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center">
              <TrendingDown className="w-8 h-8 text-[#475569] mx-auto mb-2" />
              <p className="text-[#64748B] text-sm">No active limits. Set one above to stay in control.</p>
            </div>
          )}
        </div>
      )}

      {/* Exclusion tab */}
      {tab === 'exclusion' && !active && (
        <div className="space-y-4">
          <div className="bg-red-400/5 border border-red-400/15 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Self-Exclusion / Take a Break</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Once activated, you will not be able to place bets for the selected duration.
                  Permanent exclusions cannot be reversed without contacting support.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm font-medium text-white">Select Duration</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXCLUSION_OPTIONS.map(opt => {
              const selected = selExclusion === opt.hours;
              return (
                <button key={opt.label} type="button"
                  onClick={() => setSelExclusion(opt.hours ?? null)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    selected
                      ? 'bg-red-400/10 border-red-400/40'
                      : 'bg-white/3 border-white/8 hover:bg-white/5'
                  }`}>
                  <div className="flex items-center gap-2">
                    <opt.icon className={`w-4 h-4 ${opt.color}`} />
                    <p className={`text-sm font-medium ${selected ? 'text-red-300' : 'text-white'}`}>{opt.label}</p>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5 ml-6">{opt.description}</p>
                </button>
              );
            })}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)}
              className="mt-0.5 accent-red-400 w-4 h-4" />
            <span className="text-xs text-[#94A3B8]">
              I understand that self-exclusion will immediately block me from placing bets.
              {selExclusion === null && ' Permanent exclusion cannot be undone without contacting support.'}
            </span>
          </label>

          <button
            onClick={handleExclusion}
            disabled={saving || selExclusion === undefined}
            className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {selExclusion === null ? 'Permanently Exclude Account' : `Activate ${EXCLUSION_OPTIONS.find(o => o.hours === selExclusion)?.label ?? ''} Break`}
          </button>
        </div>
      )}

      {tab === 'exclusion' && active && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-6 text-center space-y-3">
          <Shield className="w-10 h-10 text-[#00DFA9] mx-auto" />
          <p className="text-white font-semibold">Exclusion is Active</p>
          <p className="text-sm text-[#94A3B8]">
            {active.isPermanent
              ? 'Your account is permanently excluded. Contact support if you need assistance.'
              : active.endsAt
                ? `Your break ends in ${timeLeft(active.endsAt)}. Betting is blocked until then.`
                : 'Betting is currently blocked.'}
          </p>
          <p className="text-xs text-[#64748B]">
            For urgent help, contact <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer"
              className="text-[#38BDF8] hover:underline">GamCare</a> or{' '}
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer"
              className="text-[#38BDF8] hover:underline">BeGambleAware</a>.
          </p>
        </div>
      )}
    </div>
  );
}
