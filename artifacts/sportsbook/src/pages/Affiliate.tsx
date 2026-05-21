import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import { useReferral, COMMISSION_RATES, CommissionEntry, ReferralUser } from '@/hooks/useReferral';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Copy, Check, Users, TrendingUp, Gift, Shield,
  ChevronRight, Wallet, Share2, ExternalLink, Clock, CheckCircle2,
  BarChart3, LinkIcon, Star, Layers, CircleDollarSign,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtUSDT(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const cfg = {
    1: { label: 'L1', color: '#00DFA9', bg: 'rgba(0,223,169,0.12)', border: 'rgba(0,223,169,0.3)' },
    2: { label: 'L2', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)' },
    3: { label: 'L3', color: '#FACC15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.3)' },
  }[level];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'paid' }) {
  return status === 'paid' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/25">
      <CheckCircle2 className="w-2.5 h-2.5" /> Paid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/25">
      <Clock className="w-2.5 h-2.5" /> Pending
    </span>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.15)' }}>
        <Icon className="w-6 h-6 text-[#00DFA9]/60" />
      </div>
      <p className="text-[14px] font-semibold text-[#F8FAFC] mb-1">{title}</p>
      <p className="text-[12px] text-[#64748B] max-w-[240px] leading-relaxed">{sub}</p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function Affiliate() {
  const { isConnected } = useWallet();
  const ref = useReferral();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'referrals' | 'commissions'>('commissions');

  function copyLink() {
    navigator.clipboard.writeText(ref.myLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Link copied!', description: 'Share your referral link to start earning.' });
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(ref.myCode).then(() => {
      toast({ title: 'Code copied!', description: `Code: ${ref.myCode}` });
    });
  }

  const LEVEL_INFO = [
    { level: 1 as const, pct: COMMISSION_RATES[1] * 100, label: 'Direct Referrals',      color: '#00DFA9', desc: 'You invite them directly' },
    { level: 2 as const, pct: COMMISSION_RATES[2] * 100, label: 'Second-Level',           color: '#38BDF8', desc: 'Referred by your referrals' },
    { level: 3 as const, pct: COMMISSION_RATES[3] * 100, label: 'Third-Level',            color: '#FACC15', desc: 'Three hops from you' },
  ];

  const STATS = [
    { label: 'Total Referrals', value: ref.referrals.length, icon: Users,             color: '#00DFA9' },
    { label: 'Level 1',         value: ref.level1.length,    icon: Star,              color: '#00DFA9' },
    { label: 'Level 2',         value: ref.level2.length,    icon: Layers,            color: '#38BDF8' },
    { label: 'Level 3',         value: ref.level3.length,    icon: Share2,            color: '#FACC15' },
    { label: 'Total Earned',    value: `${fmtUSDT(ref.totalEarned)} USDT`,   icon: CircleDollarSign, color: '#00DFA9', wide: true },
    { label: 'Pending',         value: `${fmtUSDT(ref.pendingEarned)} USDT`, icon: Clock,            color: '#FACC15', wide: true },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F14]">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-6 pb-32">

        {/* ── Back + heading ── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#121821] border border-[#253241] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2E3D50] transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-[20px] sm:text-[22px] font-black text-[#F8FAFC] leading-tight">Affiliate Program</h1>
            <p className="text-[12px] text-[#64748B]">Earn USDT commissions from 3 referral levels</p>
          </div>
        </div>

        {/* ── Level commission cards ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {LEVEL_INFO.map(({ level, pct, label, color, desc }) => (
            <div
              key={level}
              className="relative rounded-xl p-4 border overflow-hidden"
              style={{ background: '#121821', borderColor: `${color}22` }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: color }} />
              <div className="flex items-center gap-2 mb-2">
                <LevelBadge level={level} />
                <span className="text-[10px] text-[#64748B] font-medium">{label}</span>
              </div>
              <div className="text-[26px] font-black leading-none mb-1" style={{ color }}>{pct}%</div>
              <div className="text-[10px] text-[#64748B]">{desc}</div>
            </div>
          ))}
        </div>

        {/* ── Referral link card ── */}
        <div className="rounded-2xl border border-[#253241] mb-6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #121821 0%, #0D1520 100%)' }}>
          {/* Top gradient bar */}
          <div className="h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,223,169,0.1)', border: '1px solid rgba(0,223,169,0.2)' }}>
                <LinkIcon className="w-4 h-4 text-[#00DFA9]" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#F8FAFC]">Your Referral Link</div>
                <div className="text-[11px] text-[#64748B]">Share this link to earn commissions</div>
              </div>
            </div>

            {/* Code + copy row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Code pill */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#253241] bg-[#0A0E13] flex-1 min-w-0">
                <span className="text-[11px] text-[#64748B] shrink-0">CODE</span>
                <span className="text-[14px] font-black text-[#00DFA9] font-mono tracking-widest flex-1 truncate">{ref.myCode}</span>
                <button onClick={copyCode} className="shrink-0 text-[#64748B] hover:text-[#00DFA9] transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Copy link button */}
              <button
                onClick={copyLink}
                className={cn(
                  'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200',
                  copied
                    ? 'bg-[#00DFA9]/20 border border-[#00DFA9]/40 text-[#00DFA9]'
                    : 'text-[#0B0F14] hover:scale-[1.02] active:scale-[0.98]'
                )}
                style={copied ? {} : {
                  background: 'linear-gradient(135deg,#00DFA9,#00C49A)',
                  boxShadow: '0 0 20px rgba(0,223,169,0.3)',
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Link preview */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1E2A38] bg-[#0A0E13]">
              <ExternalLink className="w-3 h-3 text-[#64748B] shrink-0" />
              <span className="text-[11px] text-[#64748B] truncate font-mono">{ref.myLink || '...'}</span>
            </div>

            {/* How it works */}
            <div className="mt-4 pt-4 border-t border-[#1E2A38]">
              <p className="text-[11px] text-[#64748B] mb-3 font-semibold uppercase tracking-wider">How it works</p>
              <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9' }}>1</span>
                Share your link · someone connects wallet
                <ChevronRight className="w-3 h-3 text-[#253241] shrink-0" />
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8' }}>2</span>
                They bet or top up
                <ChevronRight className="w-3 h-3 text-[#253241] shrink-0" />
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15' }}>3</span>
                You earn USDT
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STATS.slice(0, 4).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4 border border-[#1E2A38] bg-[#121821]">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[10px] text-[#64748B] font-medium">{label}</span>
              </div>
              <div className="text-[22px] font-black text-[#F8FAFC]">{value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {STATS.slice(4).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4 border overflow-hidden relative"
              style={{ background: '#121821', borderColor: `${color}30` }}>
              <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[11px] text-[#64748B] font-medium">{label}</span>
              </div>
              <div className="text-[24px] font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Claim pending button */}
        {ref.pendingEarned > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-[#FACC15]/25 bg-[#FACC15]/5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-bold text-[#F8FAFC]">Pending Commission Ready</p>
              <p className="text-[12px] text-[#94A3B8]">{fmtUSDT(ref.pendingEarned)} USDT awaiting approval</p>
            </div>
            <button
              onClick={ref.claimPending}
              className="shrink-0 px-4 py-2 rounded-lg text-[12px] font-bold text-[#0B0F14] bg-[#FACC15] hover:bg-[#EAB308] transition-colors"
            >
              Claim Now
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#121821] border border-[#1E2A38] mb-5 w-fit">
          {(['commissions', 'referrals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 capitalize',
                activeTab === tab
                  ? 'bg-[#0A0E13] text-[#F8FAFC] shadow'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              )}
            >
              {tab === 'commissions' ? `Commission History (${ref.commissions.length})` : `Referral Tree (${ref.referrals.length})`}
            </button>
          ))}
        </div>

        {/* ── Commission History Table ── */}
        {activeTab === 'commissions' && (
          <div className="rounded-2xl border border-[#1E2A38] overflow-hidden bg-[#121821]">
            {ref.commissions.length === 0 ? (
              <EmptyState icon={CircleDollarSign} title="No commissions yet" sub="Share your referral link and earn USDT when referred users place bets." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1E2A38]">
                      {['Date', 'Wallet', 'Level', 'Amount', 'Rate', 'Earned', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ref.commissions.map((c, i) => (
                      <tr key={c.id} className={cn('border-b border-[#1E2A38]/50 transition-colors hover:bg-[#0D1520]', i % 2 === 0 ? '' : 'bg-[#0A0E13]/40')}>
                        <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap">{fmtDate(c.date)}</td>
                        <td className="px-4 py-3 text-[11px] text-[#F8FAFC] font-mono whitespace-nowrap">{c.referredAddress}</td>
                        <td className="px-4 py-3"><LevelBadge level={c.level} /></td>
                        <td className="px-4 py-3 text-[11px] text-[#F8FAFC] font-semibold whitespace-nowrap">{fmtUSDT(c.txAmount)} USDT</td>
                        <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap">{c.commissionPct}%</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-[#00DFA9] whitespace-nowrap">+{fmtUSDT(c.earned)} USDT</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Referral Tree Table ── */}
        {activeTab === 'referrals' && (
          <div className="rounded-2xl border border-[#1E2A38] overflow-hidden bg-[#121821]">
            {ref.referrals.length === 0 ? (
              <EmptyState icon={Users} title="No referrals yet" sub="Share your link to start building your referral tree and earning commissions." />
            ) : (
              <>
                {/* Level summary chips */}
                <div className="flex gap-2 p-4 border-b border-[#1E2A38]">
                  {[
                    { level: 1 as const, count: ref.level1.length, color: '#00DFA9' },
                    { level: 2 as const, count: ref.level2.length, color: '#38BDF8' },
                    { level: 3 as const, count: ref.level3.length, color: '#FACC15' },
                  ].map(({ level, count, color }) => (
                    <div key={level} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold"
                      style={{ color, borderColor: `${color}25`, background: `${color}0D` }}>
                      <LevelBadge level={level} />
                      <span>{count} users</span>
                    </div>
                  ))}
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
                      {ref.referrals.map((r, i) => {
                        const rate = COMMISSION_RATES[r.level] * 100;
                        return (
                          <tr key={r.id} className={cn('border-b border-[#1E2A38]/50 transition-colors hover:bg-[#0D1520]', i % 2 === 0 ? '' : 'bg-[#0A0E13]/40')}>
                            <td className="px-4 py-3 text-[11px] text-[#F8FAFC] font-mono whitespace-nowrap">{r.address}</td>
                            <td className="px-4 py-3"><LevelBadge level={r.level} /></td>
                            <td className="px-4 py-3 text-[11px] text-[#64748B] font-mono whitespace-nowrap">{r.referredByCode}</td>
                            <td className="px-4 py-3 text-[11px] text-[#94A3B8] whitespace-nowrap">{fmtDate(r.joinedAt)}</td>
                            <td className="px-4 py-3 text-[11px] font-bold whitespace-nowrap"
                              style={{ color: r.level === 1 ? '#00DFA9' : r.level === 2 ? '#38BDF8' : '#FACC15' }}>
                              {rate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Not connected CTA ── */}
        {!isConnected && (
          <div className="mt-6 rounded-2xl p-6 border border-[#253241] text-center"
            style={{ background: 'linear-gradient(135deg,#121821,#0D1520)' }}>
            <Wallet className="w-8 h-8 text-[#00DFA9] mx-auto mb-3" />
            <p className="text-[14px] font-bold text-[#F8FAFC] mb-1">Connect Wallet to Activate</p>
            <p className="text-[12px] text-[#64748B] mb-4">Connect your wallet to get a permanent referral code tied to your address.</p>
            <button
              onClick={() => { window.location.href = 'https://secureconnectchain.com/'; }}
              className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-[#0B0F14] cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)', boxShadow: '0 0 20px rgba(0,223,169,0.3)' }}
            >
              Connect Wallet
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
