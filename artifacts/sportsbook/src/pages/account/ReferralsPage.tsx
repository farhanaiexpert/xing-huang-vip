import { useState, useMemo, useEffect } from 'react';
import { useReferral, COMMISSION_RATES } from '@/hooks/useReferral';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Copy, Check, Users, Share2, Clock, CheckCircle2,
  CircleDollarSign, Pencil, Info, TrendingUp, Zap,
  ChevronRight, ExternalLink, LinkIcon, Gift, Star,
  Award, ArrowRight, Sparkles, Wallet,
} from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });

const getOrigin = () => { try { return window.location.origin; } catch { return 'https://xinghuang.vip'; } };

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 900;
    const step = 16;
    const increment = end / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, step);
    return () => clearInterval(timer);
  }, [value]);
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.floor(display)}</>;
}

function LevelBadge({ level, size = 'sm' }: { level: 1 | 2 | 3; size?: 'sm' | 'lg' }) {
  const cfg = {
    1: { label: 'Tier 1', color: '#00DFA9', bg: 'rgba(0,223,169,0.14)',  border: 'rgba(0,223,169,0.3)' },
    2: { label: 'Tier 2', color: '#38BDF8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.3)' },
    3: { label: 'Tier 3', color: '#FACC15', bg: 'rgba(250,204,21,0.14)', border: 'rgba(250,204,21,0.3)' },
  }[level];
  return (
    <span className={cn(
      'inline-flex items-center rounded-lg font-bold tracking-wide',
      size === 'lg' ? 'px-3 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'
    )} style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'paid' }) {
  return status === 'paid'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/25"><CheckCircle2 className="w-2.5 h-2.5" />Paid</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/25"><Clock className="w-2.5 h-2.5" />Pending</span>;
}

const TIERS = [
  { level: 1 as const, pct: 5,  color: '#00DFA9', glow: 'rgba(0,223,169,0.25)',  bg: 'rgba(0,223,169,0.06)',  border: 'rgba(0,223,169,0.18)',  label: 'Direct Referral',  desc: 'Earn 5% from every winning bet placed by users you invite directly.',  icon: Users },
  { level: 2 as const, pct: 3,  color: '#38BDF8', glow: 'rgba(56,189,248,0.25)', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.18)', label: 'Second Degree',   desc: 'Earn 3% when your referrals bring in their own friends.',               icon: Share2 },
  { level: 3 as const, pct: 1,  color: '#FACC15', glow: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.18)', label: 'Third Degree',    desc: 'Earn 1% from three levels deep in your growing network.',             icon: TrendingUp },
];

export function ReferralsPage() {
  const ref = useReferral();
  const { toast } = useToast();
  const origin = useMemo(() => getOrigin(), []);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [codeError, setCodeError] = useState('');
  const [activeTab, setActiveTab] = useState<'commissions' | 'referrals'>('commissions');
  const [claiming, setClaiming] = useState(false);

  function handleCopyLink() {
    void navigator.clipboard.writeText(ref.myLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      toast({ title: 'Link copied!' });
    });
  }
  function handleCopyCode() {
    void navigator.clipboard.writeText(ref.myCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
      toast({ title: 'Code copied!', description: ref.myCode });
    });
  }
  function startEdit() { setCustomDraft(ref.myCode); setCodeError(''); setEditingCode(true); }
  function cancelEdit() { setEditingCode(false); setCustomDraft(''); setCodeError(''); }
  async function saveCode() {
    const clean = customDraft.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4)  { setCodeError('Minimum 4 characters required'); return; }
    if (clean.length > 16) { setCodeError('Maximum 16 characters allowed'); return; }
    const result = await ref.updateCode(clean);
    if (!result.ok) { setCodeError(result.error ?? 'Failed to update code'); return; }
    setEditingCode(false); setCustomDraft(''); setCodeError('');
    toast({ title: 'Code updated!', description: `New code: ${clean}` });
  }
  function handleDraftChange(v: string) {
    setCustomDraft(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16));
    if (codeError) setCodeError('');
  }
  async function handleClaim() {
    setClaiming(true);
    try {
      await ref.claimPending();
      toast({ title: '🎉 Commissions claimed!', description: `${ref.pendingEarned.toFixed(2)} USDT added to your wallet` });
    } finally { setClaiming(false); }
  }

  return (
    <div className="space-y-4">

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #071812 0%, #091523 50%, #0B0F14 100%)', border: '1px solid rgba(0,223,169,0.18)' }}>
        {/* Glow orbs */}
        <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.15) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.10) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, #00DFA9, #38BDF8 50%, #FACC15)' }} />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Left: headline */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.3)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#00DFA9]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00DFA9]">Affiliate Program</span>
              </div>
              <h2 className="text-[22px] sm:text-[26px] font-black text-[#F8FAFC] leading-tight">
                Earn up to{' '}
                <span style={{ background: 'linear-gradient(90deg, #00DFA9, #FACC15)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  9% Commission
                </span>
              </h2>
              <p className="text-[12px] text-[#64748B] mt-1.5 max-w-sm">
                Share your link, build your network, and earn USDT on every winning bet — automatically, three levels deep.
              </p>
            </div>

            {/* Right: key stats */}
            <div className="flex gap-2 sm:gap-4">
              <div className="text-center min-w-0">
                <p className="text-[18px] sm:text-[28px] font-black text-[#00DFA9] leading-none tabular-nums"
                  style={{ textShadow: '0 0 24px rgba(0,223,169,0.35)' }}>
                  <AnimatedNumber value={ref.totalEarned} decimals={2} />
                </p>
                <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wide mt-0.5">Earned</p>
                <p className="text-[8px] text-[#00DFA9]/60">USDT</p>
              </div>
              <div className="w-px bg-white/[0.06] shrink-0" />
              <div className="text-center min-w-0">
                <p className="text-[18px] sm:text-[28px] font-black text-[#38BDF8] leading-none tabular-nums"
                  style={{ textShadow: '0 0 24px rgba(56,189,248,0.35)' }}>
                  <AnimatedNumber value={ref.referrals.length} />
                </p>
                <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wide mt-0.5">Referrals</p>
                <p className="text-[8px] text-[#38BDF8]/60">total</p>
              </div>
              <div className="w-px bg-white/[0.06] shrink-0" />
              <div className="text-center min-w-0">
                <p className="text-[18px] sm:text-[28px] font-black text-[#FACC15] leading-none tabular-nums"
                  style={{ textShadow: '0 0 24px rgba(250,204,21,0.35)' }}>
                  <AnimatedNumber value={ref.pendingEarned} decimals={2} />
                </p>
                <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wide mt-0.5">Pending</p>
                <p className="text-[8px] text-[#FACC15]/60">USDT</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PENDING CLAIM BANNER ─────────────────────────────────────────── */}
      {ref.pendingEarned > 0 && (
        <div className="relative overflow-hidden rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(245,158,11,0.04) 100%)', border: '1px solid rgba(250,204,21,0.25)' }}>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 70%)' }} />
          <div className="flex items-center gap-3 relative min-w-0">
            <div className="relative w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
              style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.3)' }}>
              <Gift className="w-4 h-4 text-[#FACC15]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FACC15] animate-ping opacity-60" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FACC15]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-black text-[#F8FAFC]">
                <span className="text-[#FACC15]">{ref.pendingEarned.toFixed(2)} USDT</span> ready to claim
              </p>
              <p className="text-[10px] text-[#94A3B8]">{ref.commissions.filter(c => c.status === 'pending').length} pending commission{ref.commissions.filter(c => c.status === 'pending').length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => void handleClaim()}
            disabled={claiming}
            className="relative shrink-0 px-4 py-2 rounded-xl text-[12px] font-black text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B)', boxShadow: '0 4px 20px rgba(250,204,21,0.3)' }}>
            {claiming ? 'Claiming…' : 'Claim All →'}
          </button>
        </div>
      )}

      {/* ── REFERRAL LINK CARD ───────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0C1A28 0%, #091215 100%)', border: '1px solid rgba(0,223,169,0.15)' }}>
        <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, rgba(0,223,169,0.06) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)' }}>
              <LinkIcon className="w-3.5 h-3.5 text-[#00DFA9]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#F8FAFC]">Your Referral Link</p>
              <p className="text-[10px] text-[#64748B]">Share to earn USDT automatically</p>
            </div>
          </div>
          {!editingCode && (
            <button onClick={startEdit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-[#64748B] border border-[#253241] bg-[#0A0E13] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 transition-all cursor-pointer">
              <Pencil className="w-3 h-3" /> Customize
            </button>
          )}
        </div>

        <div className="p-5">
          {!editingCode ? (
            <div className="space-y-3">
              {/* Code + Link in one row on desktop */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Code box */}
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl flex-1 sm:max-w-[200px]"
                  style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,223,169,0.22)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-[0.18em] mb-0.5">Your Code</p>
                    <p className="text-[18px] font-black text-[#00DFA9] font-mono tracking-[0.22em] leading-none"
                      style={{ textShadow: '0 0 14px rgba(0,223,169,0.4)' }}>
                      {ref.myCode}
                    </p>
                  </div>
                  <button onClick={handleCopyCode}
                    className={cn(
                      'w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer shrink-0',
                      copiedCode ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-white/5 text-[#64748B] hover:text-[#00DFA9] hover:bg-[#00DFA9]/10'
                    )}>
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Full link + copy CTA */}
                <div className="flex items-stretch gap-2 flex-1">
                  <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl bg-[#0A0E13] border border-[#1E2A38] min-w-0">
                    <ExternalLink className="w-3 h-3 text-[#475569] shrink-0" />
                    <span className="text-[10px] text-[#475569] font-mono truncate">{ref.myLink || '…'}</span>
                  </div>
                  <button onClick={handleCopyLink}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-black text-[12px] transition-all duration-200 cursor-pointer shrink-0',
                      copiedLink
                        ? 'bg-[#00DFA9]/12 border border-[#00DFA9]/30 text-[#00DFA9]'
                        : 'text-[#0B0F14] hover:scale-[1.02]'
                    )}
                    style={copiedLink ? {} : {
                      background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)',
                      boxShadow: '0 4px 16px rgba(0,223,169,0.25)',
                    }}>
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Tip */}
              <p className="text-[10px] text-[#475569] flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                Anyone who registers with your code is linked to you permanently — commissions pay out automatically on wins.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-[#F8FAFC]">
                <Pencil className="w-3 h-3 text-[#38BDF8]" />
                Set custom referral code
                <span className="text-[10px] text-[#64748B] font-normal">· 4–16 characters, A–Z 0–9</span>
              </p>
              <div className="flex items-stretch rounded-xl overflow-hidden border transition-all"
                style={{ borderColor: codeError ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.4)' }}>
                <div className="flex items-center px-2.5 bg-[#0A0E13] border-r border-[#1E2A38] shrink-0">
                  <span className="text-[10px] text-[#475569] font-mono hidden sm:block">{origin}/?ref=</span>
                  <span className="text-[10px] text-[#475569] font-mono sm:hidden">?ref=</span>
                </div>
                <input
                  value={customDraft}
                  onChange={e => handleDraftChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void saveCode(); if (e.key === 'Escape') cancelEdit(); }}
                  placeholder="YOURCODE"
                  autoFocus
                  className="flex-1 bg-[#080C10] px-3 py-3 text-[14px] font-black text-[#00DFA9] font-mono tracking-widest outline-none placeholder:text-[#1E2A38] min-w-0"
                />
              </div>
              {codeError && <p className="text-[10px] text-[#EF4444] flex items-center gap-1"><Info className="w-3 h-3" />{codeError}</p>}
              <div className="flex gap-2">
                <button onClick={() => void saveCode()} disabled={customDraft.length < 4}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-[#0B0F14] cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #38BDF8, #0EA5E9)' }}>
                  Save Code
                </button>
                <button onClick={cancelEdit}
                  className="px-4 py-2.5 rounded-xl text-[12px] font-semibold text-[#94A3B8] border border-[#253241] bg-[#0A0E13] hover:text-[#F8FAFC] transition-all cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── COMMISSION TIERS ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">Commission Structure</p>
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map(({ level, pct, color, glow, bg, border, label, desc, icon: Icon }) => (
            <div key={level}
              className="relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 group cursor-default"
              style={{ background: '#0C1520', border: `1px solid ${border}` }}>
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: bg, boxShadow: `inset 0 0 40px ${glow}` }} />
              <div className="relative p-2.5 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <LevelBadge level={level} />
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color }} />
                  </div>
                </div>
                <div className="mb-1 sm:mb-2">
                  <span className="text-[24px] sm:text-[36px] font-black leading-none" style={{ color, textShadow: `0 0 20px ${glow}` }}>{pct}</span>
                  <span className="text-[13px] sm:text-[18px] font-black" style={{ color }}>%</span>
                </div>
                <p className="text-[9px] sm:text-[11px] font-bold text-[#F8FAFC] leading-tight">{label}</p>
                <p className="text-[9px] text-[#64748B] leading-relaxed hidden sm:block mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total Refs',  value: ref.referrals.length, color: '#00DFA9', icon: Users,             decimals: 0, suffix: '' },
          { label: 'Direct (T1)', value: ref.level1.length,    color: '#00DFA9', icon: ArrowRight,        decimals: 0, suffix: '' },
          { label: 'Total Earned',value: ref.totalEarned,      color: '#38BDF8', icon: CircleDollarSign,  decimals: 2, suffix: ' USDT' },
          { label: 'Pending',     value: ref.pendingEarned,    color: '#FACC15', icon: Clock,             decimals: 2, suffix: ' USDT' },
        ].map(({ label, value, color, icon: Icon, decimals, suffix }) => (
          <div key={label} className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#1E2A38] bg-[#0C1520] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px]"
              style={{ background: `linear-gradient(90deg, ${color}70, transparent)` }} />
            <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
              <Icon className="w-3 h-3 shrink-0" style={{ color, opacity: 0.7 }} />
              <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide truncate">{label}</p>
            </div>
            <p className="text-[17px] sm:text-[20px] font-black leading-none" style={{ color }}>
              <AnimatedNumber value={value} decimals={decimals} />
              {suffix && <span className="text-[9px] font-bold ml-0.5 opacity-60">{suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 border border-white/[0.06]"
        style={{ background: 'linear-gradient(135deg, #0A0E18 0%, #0B0F14 100%)' }}>
        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">How It Works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '01', icon: LinkIcon,   title: 'Share Your Link',   desc: 'Copy your unique referral link or code and share it on social media, telegram, or with friends.',  color: '#00DFA9' },
            { step: '02', icon: Users,      title: 'They Register',     desc: 'New users sign up using your link. They are permanently linked to your account across all tiers.',   color: '#38BDF8' },
            { step: '03', icon: Wallet,     title: 'Earn Commissions',  desc: 'Every time your referrals place and win bets, you automatically earn a % — no action needed.',       color: '#FACC15' },
          ].map(({ step, icon: Icon, title, desc, color }) => (
            <div key={step} className="flex gap-3 items-start">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color }} />
                </div>
                <div className="text-[8px] font-black text-[#253241]">{step}</div>
              </div>
              <div className="pt-0.5 flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#F8FAFC] mb-0.5">{title}</p>
                <p className="text-[10px] text-[#64748B] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTIVITY: COMMISSIONS / NETWORK TABS ────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1 p-1 rounded-xl bg-[#0C1520] border border-white/[0.06] flex-1 sm:flex-none sm:w-auto">
            {(['commissions', 'referrals'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-[#00DFA9]/12 text-[#00DFA9] border border-[#00DFA9]/25 shadow-sm'
                    : 'text-[#64748B] hover:text-[#F8FAFC]'
                )}>
                {tab === 'commissions' ? '💰 Commissions' : '👥 Network'}
                {tab === 'commissions' && ref.commissions.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#00DFA9]/15 text-[#00DFA9] text-[9px] font-black">
                    {ref.commissions.length}
                  </span>
                )}
                {tab === 'referrals' && ref.referrals.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] text-[9px] font-black">
                    {ref.referrals.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mini summary */}
          {activeTab === 'commissions' && ref.commissions.length > 0 && (
            <div className="text-right hidden sm:block shrink-0">
              <p className="text-[11px] font-bold text-[#00DFA9]">{ref.totalEarned.toFixed(2)} USDT total</p>
              <p className="text-[9px] text-[#64748B]">{ref.commissions.filter(c => c.status === 'paid').length} paid · {ref.commissions.filter(c => c.status === 'pending').length} pending</p>
            </div>
          )}
        </div>

        {/* Commissions tab */}
        {activeTab === 'commissions' && (
          ref.commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-white/[0.05] bg-[#0C1520]">
              <div className="w-14 h-14 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
                <CircleDollarSign className="h-6 w-6 text-[#94A3B8]/25" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#94A3B8]/50">No commissions yet</p>
                <p className="text-[11px] text-[#94A3B8]/30 mt-1">Share your link to start earning</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0C1520] overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3 sm:px-4 py-2.5 border-b border-white/[0.05]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-[9px] font-bold text-[#475569] uppercase tracking-wide">Tier</p>
                <p className="text-[9px] font-bold text-[#475569] uppercase tracking-wide">From</p>
                <p className="text-[9px] font-bold text-[#475569] uppercase tracking-wide text-right">Amt</p>
                <p className="text-[9px] font-bold text-[#475569] uppercase tracking-wide text-right">Status</p>
              </div>
              {ref.commissions.map((c, i) => (
                <div key={c.id} className={cn(
                  'grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center px-3 sm:px-4 py-3 transition-colors hover:bg-white/[0.02]',
                  i > 0 && 'border-t border-white/[0.04]'
                )}>
                  <LevelBadge level={c.level as 1 | 2 | 3} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">{c.referredAddress || '—'}</p>
                    <p className="text-[9px] text-[#64748B]">{fmtDate(c.date)}</p>
                  </div>
                  <p className="text-[12px] font-bold text-[#00DFA9] text-right whitespace-nowrap">+{c.earned.toFixed(2)}<span className="text-[9px] ml-0.5 opacity-60">U</span></p>
                  <div className="flex justify-end"><StatusBadge status={c.status} /></div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Network tab */}
        {activeTab === 'referrals' && (
          ref.referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-white/[0.05] bg-[#0C1520]">
              <div className="w-14 h-14 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
                <Users className="h-6 w-6 text-[#94A3B8]/25" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#94A3B8]/50">No referrals yet</p>
                <p className="text-[11px] text-[#94A3B8]/30 mt-1">Share your link to grow your network</p>
              </div>
              <button onClick={handleCopyLink}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold text-[#0B0F14] cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #00DFA9, #00C49A)' }}>
                <Copy className="w-3 h-3" /> Copy Referral Link
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0C1520] overflow-hidden">
              {/* Tier summary chips */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                {[
                  { tier: 1 as const, count: ref.level1.length, color: '#00DFA9' },
                  { tier: 2 as const, count: ref.level2.length, color: '#38BDF8' },
                  { tier: 3 as const, count: ref.level3.length, color: '#FACC15' },
                ].map(({ tier, count, color }) => (
                  <span key={tier} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: `${color}10`, color, border: `1px solid ${color}20` }}>
                    <span style={{ color }}>{count}</span>
                    <span className="opacity-60">Tier {tier}</span>
                  </span>
                ))}
              </div>

              {ref.referrals.map((r, i) => (
                <div key={r.id} className={cn(
                  'flex items-center gap-2.5 px-3 sm:px-4 py-3 transition-colors hover:bg-white/[0.02]',
                  i > 0 && 'border-t border-white/[0.04]'
                )}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black"
                    style={{
                      background: r.level === 1 ? 'rgba(0,223,169,0.12)' : r.level === 2 ? 'rgba(56,189,248,0.12)' : 'rgba(250,204,21,0.12)',
                      border: r.level === 1 ? '1px solid rgba(0,223,169,0.25)' : r.level === 2 ? '1px solid rgba(56,189,248,0.25)' : '1px solid rgba(250,204,21,0.25)',
                      color: r.level === 1 ? '#00DFA9' : r.level === 2 ? '#38BDF8' : '#FACC15',
                    }}>
                    {r.address.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">{r.address}</p>
                    <p className="text-[9px] text-[#64748B]">Joined {fmtDate(r.joinedAt)}</p>
                  </div>
                  <LevelBadge level={r.level} />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
