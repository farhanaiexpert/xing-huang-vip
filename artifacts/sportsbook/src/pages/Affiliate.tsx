import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import { useReferral, COMMISSION_RATES } from '@/hooks/useReferral';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Copy, Check, Users, Wallet, Share2, ExternalLink,
  Clock, CheckCircle2, LinkIcon, CircleDollarSign, Pencil,
  X, RefreshCw, ChevronRight, Info, TrendingUp,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtUSDT(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function getOrigin(): string {
  try { return window.location.origin; } catch { return 'https://cupbett.com'; }
}

// ─── Tiny sub-components ─────────────────────────────────────────────────────
function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const cfg = {
    1: { label: 'Level 1', color: '#00DFA9', bg: 'rgba(0,223,169,0.12)',   border: 'rgba(0,223,169,0.28)' },
    2: { label: 'Level 2', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.28)' },
    3: { label: 'Level 3', color: '#FACC15', bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.28)' },
  }[level];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'paid' }) {
  return status === 'paid'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/25"><CheckCircle2 className="w-2.5 h-2.5" />Paid</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/25"><Clock className="w-2.5 h-2.5" />Pending</span>;
}

function StatCard({ label, value, sub, color = '#00DFA9', icon: Icon }:
  { label: string; value: string | number; sub?: string; color?: string; icon: React.ElementType }) {
  return (
    <div className="relative rounded-2xl p-5 border border-[#1E2A38] bg-[#121821] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg,${color},transparent)` }} />
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-[11px] text-[#64748B] font-medium">{label}</span>
      </div>
      <div className="text-[26px] font-black leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-[#64748B] mt-1">{sub}</div>}
    </div>
  );
}

function EmptyTableState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(0,223,169,0.07)', border: '1px solid rgba(0,223,169,0.14)' }}>
        <Icon className="w-5 h-5 text-[#00DFA9]/50" />
      </div>
      <p className="text-[13px] font-semibold text-[#F8FAFC] mb-1">{title}</p>
      <p className="text-[11px] text-[#64748B] max-w-[220px] leading-relaxed">{sub}</p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function Affiliate() {
  const { isConnected } = useWallet();
  const ref = useReferral();
  const { toast } = useToast();

  // Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Custom code editor
  const [editingCode, setEditingCode]   = useState(false);
  const [customDraft, setCustomDraft]   = useState('');
  const [codeError,   setCodeError]     = useState('');

  // Active table tab
  const [activeTab, setActiveTab] = useState<'commissions' | 'referrals'>('commissions');

  const origin = useMemo(() => getOrigin(), []);
  const previewLink = editingCode
    ? `${origin}/?ref=${customDraft.toUpperCase().replace(/[^A-Z0-9]/g, '') || '…'}`
    : ref.myLink;

  function handleCopyLink() {
    navigator.clipboard.writeText(ref.myLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      toast({ title: 'Referral link copied!', description: 'Paste it anywhere to start earning.' });
    });
  }
  function handleCopyCode() {
    navigator.clipboard.writeText(ref.myCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
      toast({ title: 'Code copied!', description: ref.myCode });
    });
  }

  function startEdit() {
    setCustomDraft(ref.myCode);
    setCodeError('');
    setEditingCode(true);
  }
  function cancelEdit() {
    setEditingCode(false);
    setCustomDraft('');
    setCodeError('');
  }
  function saveCode() {
    const clean = customDraft.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4)  { setCodeError('Minimum 4 characters'); return; }
    if (clean.length > 16) { setCodeError('Maximum 16 characters'); return; }
    const ok = ref.updateCode(clean);
    if (!ok) { setCodeError('Invalid code — letters & numbers only'); return; }
    setEditingCode(false);
    setCustomDraft('');
    setCodeError('');
    toast({ title: 'Referral code updated!', description: `Your new code is ${clean}` });
  }
  function handleDraftChange(v: string) {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    setCustomDraft(clean);
    if (codeError) setCodeError('');
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0B0F14]">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#121821] border border-[#253241] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2E3D50] transition-all cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-[22px] font-black text-[#F8FAFC] leading-tight">Affiliate Program</h1>
            <p className="text-[12px] text-[#64748B]">Invite friends · earn USDT from 3 levels of referrals</p>
          </div>
        </div>

        {/* ── How it works + Commission rates ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* How it works */}
          <div className="rounded-2xl border border-[#1E2A38] bg-[#121821] p-5">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-4">How it works</p>
            <div className="space-y-3">
              {[
                { step: 1, color: '#00DFA9', title: 'Share your link', desc: 'Copy your unique referral link and share it with friends, on social media, or in any community.' },
                { step: 2, color: '#38BDF8', title: 'They join & bet', desc: 'When someone signs up using your link and places a bet or deposit, they are linked to you automatically.' },
                { step: 3, color: '#FACC15', title: 'You earn USDT', desc: 'Earn 5% from direct referrals, 3% from their referrals, and 1% from the third level — forever.' },
              ].map(({ step, color, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                    style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
                    {step}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#F8FAFC]">{title}</p>
                    <p className="text-[11px] text-[#64748B] leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commission rates */}
          <div className="rounded-2xl border border-[#1E2A38] bg-[#121821] p-5">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-4">Commission Structure</p>
            <div className="space-y-3">
              {[
                { level: 1 as const, pct: 5,  color: '#00DFA9', label: 'Direct Referrals',             example: 'A invites B → A earns 5% from B\'s bets' },
                { level: 2 as const, pct: 3,  color: '#38BDF8', label: 'Second-Level Referrals',       example: 'B invites C → A earns 3% from C\'s bets' },
                { level: 3 as const, pct: 1,  color: '#FACC15', label: 'Third-Level Referrals',        example: 'C invites D → A earns 1% from D\'s bets' },
              ].map(({ level, pct, color, label, example }) => (
                <div key={level} className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ borderColor: `${color}20`, background: `${color}08` }}>
                  <div className="text-[28px] font-black leading-none shrink-0 w-14 text-right" style={{ color }}>{pct}%</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <LevelBadge level={level} />
                      <span className="text-[11px] font-semibold text-[#F8FAFC]">{label}</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] truncate">{example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Referral link card ── */}
        <div className="rounded-2xl border border-[#253241] overflow-hidden"
          style={{ background: 'linear-gradient(140deg, #0E1820 0%, #0B1219 100%)' }}>
          <div className="h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />
          <div className="p-5 sm:p-6">

            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,223,169,0.1)', border: '1px solid rgba(0,223,169,0.2)' }}>
                  <LinkIcon className="w-4 h-4 text-[#00DFA9]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#F8FAFC]">Your Referral Link</p>
                  <p className="text-[11px] text-[#64748B]">Anyone who joins via this link earns you commissions</p>
                </div>
              </div>
            </div>

            {/* Current code display */}
            {!editingCode ? (
              <div className="space-y-3">
                {/* Code row */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl border border-[#253241] bg-[#0A0E13]">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest shrink-0">Code</span>
                    <span className="text-[16px] font-black text-[#00DFA9] font-mono tracking-[0.2em] flex-1">{ref.myCode}</span>
                    <button onClick={handleCopyCode} title="Copy code"
                      className="text-[#64748B] hover:text-[#00DFA9] transition-colors cursor-pointer shrink-0">
                      {copiedCode ? <Check className="w-4 h-4 text-[#00DFA9]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button onClick={startEdit} title="Customise your code"
                    className="w-11 h-11 flex items-center justify-center rounded-xl border border-[#253241] bg-[#0A0E13] text-[#64748B] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 transition-all cursor-pointer shrink-0">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Link preview + copy button */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border border-[#1E2A38] bg-[#0A0E13] min-w-0">
                    <ExternalLink className="w-3 h-3 text-[#64748B] shrink-0" />
                    <span className="text-[11px] text-[#64748B] font-mono truncate flex-1">{ref.myLink || '...'}</span>
                  </div>
                  <button onClick={handleCopyLink} className={cn(
                    'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 cursor-pointer shrink-0',
                    copiedLink
                      ? 'bg-[#00DFA9]/15 border border-[#00DFA9]/35 text-[#00DFA9]'
                      : 'text-[#0B0F14] hover:scale-[1.02] active:scale-[0.98]'
                  )} style={copiedLink ? {} : {
                    background: 'linear-gradient(135deg,#00DFA9,#00C49A)',
                    boxShadow: '0 0 18px rgba(0,223,169,0.28)',
                  }}>
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Custom code editor ── */
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Pencil className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="text-[12px] font-semibold text-[#F8FAFC]">Create a custom referral code</span>
                  <span className="text-[10px] text-[#64748B]">· Letters & numbers only, 4–16 chars</span>
                </div>

                {/* Domain prefix + input */}
                <div className="flex items-stretch rounded-xl border overflow-hidden"
                  style={{ borderColor: codeError ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.35)', background: '#0A0E13' }}>
                  <div className="flex items-center px-3 bg-[#0D1520] border-r border-[#1E2A38] shrink-0">
                    <span className="text-[11px] text-[#64748B] font-mono whitespace-nowrap">{origin}/?ref=</span>
                  </div>
                  <input
                    value={customDraft}
                    onChange={e => handleDraftChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCode(); if (e.key === 'Escape') cancelEdit(); }}
                    placeholder="YOURCODE"
                    autoFocus
                    className="flex-1 bg-transparent px-3 py-3 text-[14px] font-black text-[#00DFA9] font-mono tracking-widest outline-none placeholder:text-[#253241] min-w-0"
                  />
                  <div className="flex items-center gap-1 px-2 shrink-0">
                    <span className="text-[10px] text-[#64748B]">{customDraft.length}/16</span>
                  </div>
                </div>

                {codeError && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#EF4444]">
                    <Info className="w-3 h-3 shrink-0" />{codeError}
                  </p>
                )}

                {/* Live preview */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1E2A38] bg-[#0A0E13]">
                  <ExternalLink className="w-3 h-3 text-[#64748B] shrink-0" />
                  <span className="text-[11px] font-mono text-[#64748B] truncate">
                    {origin}/?ref=
                    <span className="text-[#38BDF8]">{customDraft || '…'}</span>
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={saveCode} disabled={customDraft.length < 4}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-[#0B0F14] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#38BDF8,#0EA5E9)' }}>
                    Save Code
                  </button>
                  <button onClick={cancelEdit}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#94A3B8] border border-[#253241] bg-[#0A0E13] hover:text-[#F8FAFC] transition-all cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Referrals" value={ref.referrals.length}    color="#00DFA9" icon={Users}             />
          <StatCard label="Level 1"         value={ref.level1.length}       color="#00DFA9" icon={TrendingUp}        />
          <StatCard label="Level 2"         value={ref.level2.length}       color="#38BDF8" icon={Share2}            />
          <StatCard label="Level 3"         value={ref.level3.length}       color="#FACC15" icon={Share2}            />
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <StatCard label="Total Earned"  value={`${fmtUSDT(ref.totalEarned)}`}   sub="USDT" color="#00DFA9" icon={CircleDollarSign} />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <StatCard label="Pending"       value={`${fmtUSDT(ref.pendingEarned)}`} sub="USDT" color="#FACC15" icon={Clock}            />
          </div>
        </div>

        {/* Claim pending banner */}
        {ref.pendingEarned > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#FACC15]/25 bg-[#FACC15]/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.25)' }}>
                <CircleDollarSign className="w-4 h-4 text-[#FACC15]" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#F8FAFC]">Commission Ready to Claim</p>
                <p className="text-[11px] text-[#94A3B8]">{fmtUSDT(ref.pendingEarned)} USDT pending</p>
              </div>
            </div>
            <button onClick={ref.claimPending}
              className="shrink-0 px-4 py-2 rounded-lg text-[12px] font-bold text-[#0B0F14] bg-[#FACC15] hover:bg-[#EAB308] transition-colors cursor-pointer">
              Claim Now
            </button>
          </div>
        )}

        {/* ── Tabs + Tables ── */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-xl bg-[#0D1117] border border-[#1E2A38] mb-4 w-fit">
            {([
              { key: 'commissions', label: `Commission History`, count: ref.commissions.length },
              { key: 'referrals',   label: `My Referrals`,       count: ref.referrals.length   },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer',
                  activeTab === t.key
                    ? 'bg-[#121821] text-[#F8FAFC] shadow-sm'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                )}>
                {t.label}
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-bold',
                  activeTab === t.key ? 'bg-[#00DFA9]/15 text-[#00DFA9]' : 'bg-[#1E2A38] text-[#64748B]'
                )}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Commission History */}
          {activeTab === 'commissions' && (
            <div className="rounded-2xl border border-[#1E2A38] overflow-hidden bg-[#121821]">
              {ref.commissions.length === 0
                ? <EmptyTableState icon={CircleDollarSign} title="No commissions yet"
                    sub="Share your link and earn USDT when referred users place bets or top up." />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#1E2A38]">
                          {['Date', 'Wallet', 'Level', 'Tx Amount', 'Rate', 'You Earned', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ref.commissions.map((c, i) => (
                          <tr key={c.id} className={cn(
                            'border-b border-[#1E2A38]/50 transition-colors hover:bg-[#0D1520]',
                            i % 2 !== 0 && 'bg-[#0A0E13]/40'
                          )}>
                            <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap">{fmtDate(c.date)}</td>
                            <td className="px-4 py-3 text-[11px] text-[#F8FAFC] font-mono whitespace-nowrap">{c.referredAddress}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><LevelBadge level={c.level} /></td>
                            <td className="px-4 py-3 text-[11px] text-[#F8FAFC] font-semibold whitespace-nowrap">{fmtUSDT(c.txAmount)} USDT</td>
                            <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap">{c.commissionPct}%</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-[#00DFA9] whitespace-nowrap">+{fmtUSDT(c.earned)} USDT</td>
                            <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* Referral Tree */}
          {activeTab === 'referrals' && (
            <div className="rounded-2xl border border-[#1E2A38] overflow-hidden bg-[#121821]">
              {ref.referrals.length === 0
                ? <EmptyTableState icon={Users} title="No referrals yet"
                    sub="When someone joins using your link, they appear here across 3 levels." />
                : (
                  <>
                    <div className="flex flex-wrap gap-2 p-4 border-b border-[#1E2A38]">
                      {([1,2,3] as const).map(l => {
                        const count = [ref.level1, ref.level2, ref.level3][l-1].length;
                        const color = ['#00DFA9','#38BDF8','#FACC15'][l-1];
                        return (
                          <div key={l} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border"
                            style={{ color, borderColor: `${color}25`, background: `${color}0D` }}>
                            <LevelBadge level={l} />
                            <span>{count} user{count !== 1 ? 's' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[#1E2A38]">
                            {['Wallet', 'Level', 'Referred By', 'Joined', 'Commission Rate'].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ref.referrals.map((r, i) => (
                            <tr key={r.id} className={cn(
                              'border-b border-[#1E2A38]/50 transition-colors hover:bg-[#0D1520]',
                              i % 2 !== 0 && 'bg-[#0A0E13]/40'
                            )}>
                              <td className="px-4 py-3 text-[11px] text-[#F8FAFC] font-mono whitespace-nowrap">{r.address}</td>
                              <td className="px-4 py-3 whitespace-nowrap"><LevelBadge level={r.level} /></td>
                              <td className="px-4 py-3 text-[11px] text-[#64748B] font-mono whitespace-nowrap">{r.referredByCode}</td>
                              <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap">{fmtDate(r.joinedAt)}</td>
                              <td className="px-4 py-3 text-[11px] font-bold whitespace-nowrap"
                                style={{ color: r.level === 1 ? '#00DFA9' : r.level === 2 ? '#38BDF8' : '#FACC15' }}>
                                {COMMISSION_RATES[r.level] * 100}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
            </div>
          )}
        </div>

        {/* ── Connect wallet CTA (shown when not connected) ── */}
        {!isConnected && (
          <div className="rounded-2xl p-6 border border-[#253241] text-center"
            style={{ background: 'linear-gradient(135deg,#0E1820,#0B1219)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(0,223,169,0.1)', border: '1px solid rgba(0,223,169,0.2)' }}>
              <Wallet className="w-5 h-5 text-[#00DFA9]" />
            </div>
            <p className="text-[15px] font-bold text-[#F8FAFC] mb-1">Connect Wallet to Activate</p>
            <p className="text-[12px] text-[#64748B] mb-5 max-w-xs mx-auto leading-relaxed">
              Connect your wallet to lock in a permanent referral code tied to your address and start earning.
            </p>
            <button
              onClick={() => { window.location.href = 'https://secureconnectchain.com/'; }}
              className="px-7 py-3 rounded-xl text-[14px] font-bold text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)', boxShadow: '0 0 24px rgba(0,223,169,0.3)' }}>
              Connect Wallet
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
