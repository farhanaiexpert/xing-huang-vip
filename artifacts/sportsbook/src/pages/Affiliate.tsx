import { useState, useMemo, useEffect } from 'react';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import { useReferral, COMMISSION_RATES } from '@/hooks/useReferral';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import {
  ArrowLeft, Copy, Check, Users, Wallet, Share2,
  Clock, CheckCircle2, CircleDollarSign, Pencil,
  Info, TrendingUp, Zap, ChevronRight, ExternalLink,
  LinkIcon, Gift, Star,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
const fmtUSDT = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const getOrigin = () => { try { return window.location.origin; } catch { return 'https://cupbett.com'; } };

// ─── Animated counter ────────────────────────────────────────────────────────
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

// ─── Badges ──────────────────────────────────────────────────────────────────
function LevelBadge({ level, size = 'sm' }: { level: 1|2|3; size?: 'sm'|'lg' }) {
  const cfg = {
    1: { label: 'Level 1', color: '#00DFA9', bg: 'rgba(0,223,169,0.14)',  border: 'rgba(0,223,169,0.3)' },
    2: { label: 'Level 2', color: '#38BDF8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.3)' },
    3: { label: 'Level 3', color: '#FACC15', bg: 'rgba(250,204,21,0.14)', border: 'rgba(250,204,21,0.3)' },
  }[level];
  return (
    <span className={cn(
      'inline-flex items-center rounded-md font-bold tracking-wide',
      size === 'lg' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'
    )} style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'pending'|'paid' }) {
  return status === 'paid'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/25"><CheckCircle2 className="w-2.5 h-2.5"/>Paid</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/25"><Clock className="w-2.5 h-2.5"/>Pending</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Affiliate() {
  const { isConnected } = useWallet();
  const ref = useReferral();
  const { toast } = useToast();
  const origin = useMemo(() => getOrigin(), []);
  const { t } = useI18n();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [affiliatePaymentOpen, setAffiliatePaymentOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [codeError,   setCodeError]   = useState('');
  const [activeTab, setActiveTab]     = useState<'commissions'|'referrals'>('commissions');
  const [hoveredLevel, setHoveredLevel] = useState<number|null>(null);

  function handleCopyLink() {
    navigator.clipboard.writeText(ref.myLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      toast({ title: 'Link copied!', description: 'Share it anywhere to start earning.' });
    });
  }
  function handleCopyCode() {
    navigator.clipboard.writeText(ref.myCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
      toast({ title: 'Code copied!', description: ref.myCode });
    });
  }
  function startEdit() { setCustomDraft(ref.myCode); setCodeError(''); setEditingCode(true); }
  function cancelEdit() { setEditingCode(false); setCustomDraft(''); setCodeError(''); }
  function saveCode() {
    const clean = customDraft.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4)  { setCodeError('Minimum 4 characters required'); return; }
    if (clean.length > 16) { setCodeError('Maximum 16 characters allowed'); return; }
    if (!ref.updateCode(clean)) { setCodeError('Letters and numbers only'); return; }
    setEditingCode(false); setCustomDraft(''); setCodeError('');
    toast({ title: 'Code updated!', description: `New code: ${clean}` });
  }
  function handleDraftChange(v: string) {
    setCustomDraft(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16));
    if (codeError) setCodeError('');
  }

  const LEVELS = [
    { level: 1 as const, pct: 5, color: '#00DFA9', glow: 'rgba(0,223,169,0.35)',  borderHover: 'rgba(0,223,169,0.5)',  bg: 'rgba(0,223,169,0.06)',  label: 'Direct',       desc: 'You invite them',          example: 'A → B: A earns 5% of B' },
    { level: 2 as const, pct: 3, color: '#38BDF8', glow: 'rgba(56,189,248,0.35)', borderHover: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.06)', label: 'Second Level', desc: 'Their referrals',          example: 'B → C: A earns 3% of C' },
    { level: 3 as const, pct: 1, color: '#FACC15', glow: 'rgba(250,204,21,0.35)', borderHover: 'rgba(250,204,21,0.5)', bg: 'rgba(250,204,21,0.06)', label: 'Third Level',  desc: 'Three hops from you',     example: 'C → D: A earns 1% of D' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F14]">


      <Header />

      <main className="max-w-5xl mx-auto px-4 pb-32">

        {/* ════ HERO BANNER ════ */}
        <div className="relative overflow-hidden rounded-b-3xl mb-8 px-6 pt-8 pb-10"
          style={{ background: 'linear-gradient(135deg, #061A2E 0%, #0A1A10 50%, #0B0F14 100%)' }}>
          {/* Glow orbs */}
          <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.12) 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute -bottom-10 right-10 w-56 h-56 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 70%)' }} />

          {/* Back button */}
          <Link href="/">
            <button className="mb-5 flex items-center gap-1.5 text-[#64748B] hover:text-[#F8FAFC] transition-colors cursor-pointer text-[12px] font-medium group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(0,223,169,0.1)', border: '1px solid rgba(0,223,169,0.2)', color: '#00DFA9' }}>
                <Zap className="w-3 h-3" /> {t('Earn Up To 5% Per Referral')}
              </div>
              <h1 className="text-[32px] sm:text-[38px] font-black text-[#F8FAFC] leading-tight tracking-tight mb-2">
                {t('Affiliate Program')}
              </h1>
              <p className="text-[14px] text-[#64748B] max-w-md leading-relaxed">
                Invite friends, build your network, and earn USDT commissions across <span className="text-[#00DFA9] font-semibold">3 referral levels</span> — forever.
              </p>
            </div>

            {/* Hero stats row */}
            <div className="flex gap-3 shrink-0">
              {[
                { label: t('Total Earned'),  value: ref.totalEarned,   suffix: 'USDT', color: '#00DFA9', decimals: 2 },
                { label: t('Referrals'),     value: ref.referrals.length, suffix: '',  color: '#38BDF8', decimals: 0 },
                { label: t('Pending'),       value: ref.pendingEarned, suffix: 'USDT', color: '#FACC15', decimals: 2 },
              ].map(({ label, value, suffix, color, decimals }) => (
                <div key={label} className="text-center px-4 py-3 rounded-2xl border"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${color}20` }}>
                  <div className="text-[20px] font-black leading-none mb-1" style={{ color }}>
                    <AnimatedNumber value={value} decimals={decimals} />
                    {suffix && <span className="text-[11px] font-bold ml-1 opacity-70">{suffix}</span>}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">

          {/* ════ COMMISSION LEVEL CARDS ════ */}
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.map(({ level, pct, color, glow, borderHover, bg, label, desc, example }) => {
              const isHovered = hoveredLevel === level;
              return (
                <div
                  key={level}
                  onMouseEnter={() => setHoveredLevel(level)}
                  onMouseLeave={() => setHoveredLevel(null)}
                  className="relative rounded-2xl p-5 border cursor-default overflow-hidden transition-all duration-300"
                  style={{
                    background: isHovered ? bg : '#0E1520',
                    borderColor: isHovered ? borderHover : `${color}20`,
                    boxShadow: isHovered ? `0 0 30px ${glow}, 0 0 0 1px ${color}30` : 'none',
                    transform: isHovered ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {/* Top bar */}
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, ${color}, transparent)`, opacity: isHovered ? 1 : 0.5 }} />
                  {/* Glow orb */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full transition-opacity duration-300"
                    style={{ background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`, opacity: isHovered ? 1 : 0 }} />

                  <LevelBadge level={level} />
                  <div className="mt-3 mb-1">
                    <span className="text-[44px] font-black leading-none transition-all duration-300"
                      style={{ color, filter: isHovered ? `drop-shadow(0 0 12px ${color}80)` : 'none' }}>
                      {pct}
                    </span>
                    <span className="text-[22px] font-black" style={{ color }}>%</span>
                  </div>
                  <p className="text-[12px] font-semibold text-[#F8FAFC] mb-0.5">{label}</p>
                  <p className="text-[10px] text-[#64748B] mb-2">{desc}</p>
                  <p className="text-[10px] font-mono px-2 py-1 rounded-lg"
                    style={{ background: `${color}10`, color: `${color}CC`, border: `1px solid ${color}18` }}>
                    {example}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ════ REFERRAL LINK CARD ════ */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0C1A28 0%, #091215 100%)', border: '1px solid rgba(0,223,169,0.15)' }}>
            <div className="h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />
            <div className="p-5 sm:p-6">

              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)', boxShadow: '0 0 16px rgba(0,223,169,0.15)' }}>
                    <LinkIcon className="w-5 h-5 text-[#00DFA9]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#F8FAFC]">{t('Your Referral Link')}</p>
                    <p className="text-[11px] text-[#64748B]">{t('Share to earn USDT commissions automatically')}</p>
                  </div>
                </div>
                {!editingCode && (
                  <button onClick={startEdit} title="Customise code"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#64748B] border border-[#253241] bg-[#0A0E13] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 transition-all cursor-pointer">
                    <Pencil className="w-3 h-3" /> {t('Custom')}
                  </button>
                )}
              </div>

              {!editingCode ? (
                <div className="space-y-3">
                  {/* Code display */}
                  <div className="flex items-center gap-3 px-4 py-4 rounded-2xl"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,223,169,0.2)', boxShadow: '0 0 20px rgba(0,223,169,0.06) inset' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-[0.15em] mb-1">{t('Referral Code')}</p>
                      <p className="text-[22px] font-black text-[#00DFA9] font-mono tracking-[0.25em] leading-none"
                        style={{ textShadow: '0 0 20px rgba(0,223,169,0.4)' }}>
                        {ref.myCode}
                      </p>
                    </div>
                    <button onClick={handleCopyCode} title="Copy code"
                      className={cn(
                        'w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer shrink-0',
                        copiedCode ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-white/5 text-[#64748B] hover:text-[#00DFA9] hover:bg-[#00DFA9]/10'
                      )}>
                      {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Full link + copy button */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl bg-[#0A0E13] border border-[#1E2A38] min-w-0">
                      <ExternalLink className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                      <span className="text-[11px] text-[#475569] font-mono truncate flex-1">{ref.myLink || '…'}</span>
                    </div>
                    <button onClick={handleCopyLink}
                      className={cn(
                        'flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200 cursor-pointer shrink-0',
                        copiedLink
                          ? 'bg-[#00DFA9]/15 border border-[#00DFA9]/35 text-[#00DFA9]'
                          : 'text-[#0B0F14] hover:scale-[1.02] active:scale-[0.97]'
                      )}
                      style={copiedLink ? {} : {
                        background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)',
                        boxShadow: '0 0 24px rgba(0,223,169,0.35)',
                      }}>
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? t('Copied!') : t('Copy Link')}
                    </button>
                  </div>

                  {/* How it works – compact inline */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {[
                      { num: '1', text: t('Share link'), color: '#00DFA9' },
                      { num: '→', text: '', color: '#253241' },
                      { num: '2', text: t('They join & bet'), color: '#38BDF8' },
                      { num: '→', text: '', color: '#253241' },
                      { num: '3', text: t('You earn USDT'), color: '#FACC15' },
                    ].map((s, i) => (
                      s.text
                        ? <span key={i} className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                              style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}>{s.num}</span>
                            <span className="text-[11px] text-[#64748B]">{s.text}</span>
                          </span>
                        : <ChevronRight key={i} className="w-3 h-3 text-[#253241]" />
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Custom code editor ── */
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-[#F8FAFC]">
                    <Pencil className="w-3.5 h-3.5 text-[#38BDF8]" />
                    {t('Create a custom referral code')}
                    <span className="text-[10px] text-[#64748B] font-normal">· 4–16 letters & numbers</span>
                  </p>

                  {/* Input with domain prefix */}
                  <div className="flex items-stretch rounded-xl overflow-hidden border transition-all"
                    style={{ borderColor: codeError ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.4)' }}>
                    <div className="flex items-center px-3 bg-[#0A0E13] border-r border-[#1E2A38] shrink-0">
                      <span className="text-[11px] text-[#475569] font-mono whitespace-nowrap hidden sm:block">{origin}/?ref=</span>
                      <span className="text-[11px] text-[#475569] font-mono whitespace-nowrap sm:hidden">/?ref=</span>
                    </div>
                    <input
                      value={customDraft}
                      onChange={e => handleDraftChange(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveCode(); if (e.key === 'Escape') cancelEdit(); }}
                      placeholder="YOURCODE"
                      autoFocus
                      className="flex-1 bg-[#080C10] px-3 py-3.5 text-[15px] font-black text-[#00DFA9] font-mono tracking-widest outline-none placeholder:text-[#1E2A38] min-w-0"
                    />
                    <div className="flex items-center px-3 bg-[#0A0E13] border-l border-[#1E2A38] shrink-0">
                      <span className={cn('text-[10px] font-mono', customDraft.length >= 14 ? 'text-[#FACC15]' : 'text-[#64748B]')}>
                        {customDraft.length}/16
                      </span>
                    </div>
                  </div>

                  {codeError && (
                    <p className="flex items-center gap-1.5 text-[11px] text-[#EF4444]">
                      <Info className="w-3 h-3 shrink-0" />{codeError}
                    </p>
                  )}

                  {/* Live preview */}
                  <div className="px-3 py-2.5 rounded-xl border border-[#1E2A38] bg-[#080C10]">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748B] mb-1">{t('Live Preview')}</p>
                    <p className="text-[11px] font-mono text-[#475569] truncate">
                      {origin}/?ref=<span className="text-[#38BDF8] font-bold">{customDraft || '…'}</span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={saveCode} disabled={customDraft.length < 4}
                      className="flex-1 py-3 rounded-xl text-[13px] font-bold text-[#0B0F14] cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #38BDF8, #0EA5E9)', boxShadow: customDraft.length >= 4 ? '0 0 20px rgba(56,189,248,0.3)' : 'none' }}>
                      {t('Save Code')}
                    </button>
                    <button onClick={cancelEdit}
                      className="px-5 py-3 rounded-xl text-[13px] font-semibold text-[#94A3B8] border border-[#253241] bg-[#0A0E13] hover:text-[#F8FAFC] hover:border-[#2E3D50] transition-all cursor-pointer">
                      {t('Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ════ STATS ROW ════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: t('Total Refs'),   value: ref.referrals.length,  color: '#00DFA9', icon: Users,           decimals: 0, suffix: '' },
              { label: t('Level 1'),      value: ref.level1.length,     color: '#00DFA9', icon: Star,            decimals: 0, suffix: '' },
              { label: t('Level 2'),      value: ref.level2.length,     color: '#38BDF8', icon: Share2,          decimals: 0, suffix: '' },
              { label: t('Level 3'),      value: ref.level3.length,     color: '#FACC15', icon: TrendingUp,      decimals: 0, suffix: '' },
              { label: t('Total Earned'), value: ref.totalEarned,       color: '#00DFA9', icon: CircleDollarSign,decimals: 2, suffix: ' USDT' },
              { label: t('Pending'),      value: ref.pendingEarned,     color: '#FACC15', icon: Clock,           decimals: 2, suffix: ' USDT' },
            ].map(({ label, value, color, icon: Icon, decimals, suffix }, idx) => (
              <div key={label}
                className={cn('relative rounded-2xl p-4 border border-[#1E2A38] bg-[#0E1520] overflow-hidden group transition-all duration-200 hover:border-opacity-60',
                  (idx === 4 || idx === 5) && 'col-span-1 sm:col-span-1 md:col-span-1'
                )}
                style={{ ['--hover-color' as string]: color }}>
                <div className="absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3 transition-all duration-200"
                  style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <p className="text-[10px] text-[#64748B] font-medium mb-1">{label}</p>
                <p className="text-[20px] font-black leading-none" style={{ color }}>
                  <AnimatedNumber value={value} decimals={decimals} />{decimals > 0 && <span className="text-[10px] font-bold ml-0.5 opacity-70">{suffix}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Claim pending banner */}
          {ref.pendingEarned > 0 && (
            <div className="relative flex items-center justify-between gap-4 p-4 rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.08), rgba(234,179,8,0.04))', border: '1px solid rgba(250,204,21,0.2)' }}>
              <div className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(250,204,21,0.08) 0%, transparent 60%)' }} />
              <div className="flex items-center gap-3 relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.3)', boxShadow: '0 0 16px rgba(250,204,21,0.2)' }}>
                  <Gift className="w-5 h-5 text-[#FACC15]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#F8FAFC]">Commission Ready to Claim</p>
                  <p className="text-[11px] text-[#94A3B8]">
                    <span className="text-[#FACC15] font-bold">{fmtUSDT(ref.pendingEarned)} USDT</span> awaiting approval
                  </p>
                </div>
              </div>
              <button onClick={ref.claimPending}
                className="shrink-0 px-5 py-2.5 rounded-xl text-[13px] font-bold text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97] relative"
                style={{ background: 'linear-gradient(135deg,#FACC15,#EAB308)', boxShadow: '0 0 20px rgba(250,204,21,0.4)' }}>
                Claim Now
              </button>
            </div>
          )}

          {/* ════ TABS + TABLES ════ */}
          <div>
            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-xl bg-[#0A0E13] border border-[#1E2A38] mb-4 w-fit">
              {([
                { key: 'commissions' as const, label: t('Commissions'), count: ref.commissions.length, icon: CircleDollarSign },
                { key: 'referrals'   as const, label: t('Referrals'),  count: ref.referrals.length,   icon: Users },
              ]).map(({ key, label, count, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer',
                    activeTab === key
                      ? 'bg-[#121821] text-[#F8FAFC] shadow-sm'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  )}>
                  <Icon className={cn('w-3.5 h-3.5', activeTab === key ? 'text-[#00DFA9]' : 'text-[#64748B]')} />
                  {label}
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-md text-[9px] font-bold',
                    activeTab === key ? 'bg-[#00DFA9]/15 text-[#00DFA9]' : 'bg-[#1E2A38] text-[#475569]'
                  )}>{count}</span>
                </button>
              ))}
            </div>

            {/* Commission History */}
            {activeTab === 'commissions' && (
              <div className="rounded-2xl border border-[#1E2A38] overflow-hidden bg-[#0E1520]">
                {ref.commissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <div className="relative mb-5">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.15)' }}>
                        <CircleDollarSign className="w-7 h-7 text-[#00DFA9]/50" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.3)' }}>
                        <span className="text-[9px] text-[#00DFA9]">0</span>
                      </div>
                    </div>
                    <p className="text-[14px] font-bold text-[#F8FAFC] mb-1">No commissions yet</p>
                    <p className="text-[12px] text-[#64748B] max-w-[240px] leading-relaxed mb-5">
                      Share your referral link. Every bet your referrals place earns you USDT automatically.
                    </p>
                    <button onClick={handleCopyLink}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)', boxShadow: '0 0 20px rgba(0,223,169,0.3)' }}>
                      <Copy className="w-4 h-4" /> Copy Referral Link
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid #1E2A38' }}>
                          {['Date','Wallet','Level','Tx Amount','Rate','You Earned','Status'].map(h => (
                            <th key={h} className="px-4 py-3.5 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ref.commissions.map((c, i) => (
                          <tr key={c.id} className={cn(
                            'border-b border-[#1E2A38]/40 transition-colors duration-100 hover:bg-white/[0.02]',
                            i % 2 !== 0 && 'bg-black/20'
                          )}>
                            <td className="px-4 py-3.5 text-[11px] text-[#64748B] whitespace-nowrap">{fmtDate(c.date)}</td>
                            <td className="px-4 py-3.5 text-[11px] text-[#94A3B8] font-mono whitespace-nowrap">{c.referredAddress}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><LevelBadge level={c.level} /></td>
                            <td className="px-4 py-3.5 text-[12px] text-[#F8FAFC] font-semibold whitespace-nowrap">{fmtUSDT(c.txAmount)} <span className="text-[#64748B] text-[10px] font-normal">USDT</span></td>
                            <td className="px-4 py-3.5 text-[11px] text-[#64748B] whitespace-nowrap">{c.commissionPct}%</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-[12px] font-black text-[#00DFA9]" style={{ textShadow: '0 0 10px rgba(0,223,169,0.4)' }}>
                                +{fmtUSDT(c.earned)}
                              </span>
                              <span className="text-[10px] text-[#00DFA9]/60 ml-1">USDT</span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={c.status} /></td>
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
              <div className="rounded-2xl border border-[#1E2A38] overflow-hidden bg-[#0E1520]">
                {ref.referrals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <div className="relative mb-5">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.15)' }}>
                        <Users className="w-7 h-7 text-[#00DFA9]/50" />
                      </div>
                    </div>
                    <p className="text-[14px] font-bold text-[#F8FAFC] mb-1">No referrals yet</p>
                    <p className="text-[12px] text-[#64748B] max-w-[260px] leading-relaxed">
                      When someone joins CupBett using your link, they appear here across all 3 levels.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 p-4 border-b border-[#1E2A38]" style={{ background: 'rgba(0,0,0,0.15)' }}>
                      {([1,2,3] as const).map(l => {
                        const count = [ref.level1, ref.level2, ref.level3][l-1].length;
                        const color = ['#00DFA9','#38BDF8','#FACC15'][l-1];
                        return (
                          <div key={l} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold border"
                            style={{ color, borderColor: `${color}25`, background: `${color}08` }}>
                            <LevelBadge level={l} />
                            <span className="font-bold">{count}</span>
                            <span className="text-[#64748B] font-normal">user{count !== 1 ? 's' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid #1E2A38' }}>
                            {['Wallet','Level','Referred By','Joined','Earns You'].map(h => (
                              <th key={h} className="px-4 py-3.5 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ref.referrals.map((r, i) => {
                            const color = r.level === 1 ? '#00DFA9' : r.level === 2 ? '#38BDF8' : '#FACC15';
                            return (
                              <tr key={r.id} className={cn(
                                'border-b border-[#1E2A38]/40 transition-colors duration-100 hover:bg-white/[0.02]',
                                i % 2 !== 0 && 'bg-black/20'
                              )}>
                                <td className="px-4 py-3.5 text-[11px] text-[#94A3B8] font-mono whitespace-nowrap">{r.address}</td>
                                <td className="px-4 py-3.5 whitespace-nowrap"><LevelBadge level={r.level} /></td>
                                <td className="px-4 py-3.5 text-[11px] text-[#64748B] font-mono whitespace-nowrap">{r.referredByCode}</td>
                                <td className="px-4 py-3.5 text-[11px] text-[#64748B] whitespace-nowrap">{fmtDate(r.joinedAt)}</td>
                                <td className="px-4 py-3.5 text-[12px] font-black whitespace-nowrap" style={{ color }}>
                                  {COMMISSION_RATES[r.level] * 100}%
                                  <span className="text-[10px] font-normal text-[#475569] ml-1">of their bets</span>
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
          </div>

          {/* ── Connect wallet CTA ── */}
          {!isConnected && (
            <div className="relative rounded-2xl p-8 text-center overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #061A2E, #0A1A10)', border: '1px solid rgba(0,223,169,0.15)' }}>
              <div className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(0,223,169,0.1) 0%, transparent 60%)' }} />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)', boxShadow: '0 0 24px rgba(0,223,169,0.2)' }}>
                  <Wallet className="w-6 h-6 text-[#00DFA9]" />
                </div>
                <p className="text-[18px] font-black text-[#F8FAFC] mb-2">Connect Wallet to Activate</p>
                <p className="text-[13px] text-[#64748B] mb-6 max-w-sm mx-auto leading-relaxed">
                  Connect your wallet to lock in a permanent referral code and start earning USDT commissions.
                </p>
                <button
                  onClick={() => setAffiliatePaymentOpen(true)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[15px] font-bold text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)', boxShadow: '0 0 32px rgba(0,223,169,0.4)' }}>
                  <Wallet className="w-4 h-4" /> Deposit Funds
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <ConnectWalletModal open={affiliatePaymentOpen} onOpenChange={setAffiliatePaymentOpen} />
    </div>
  );
}
