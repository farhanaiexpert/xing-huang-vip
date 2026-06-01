import { useState, useMemo, useEffect } from 'react';
import { Link } from 'wouter';
import { useReferral, COMMISSION_RATES } from '@/hooks/useReferral';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Copy, Check, Users, Share2, Clock, CheckCircle2,
  CircleDollarSign, Pencil, Info, TrendingUp, Zap,
  ChevronRight, ExternalLink, LinkIcon, Gift, Star,
} from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });

const getOrigin = () => { try { return window.location.origin; } catch { return 'https://cupbett.com'; } };

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

function StatusBadge({ status }: { status: 'pending' | 'paid' }) {
  return status === 'paid'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/25"><CheckCircle2 className="w-2.5 h-2.5" />Paid</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/25"><Clock className="w-2.5 h-2.5" />Pending</span>;
}

const LEVELS = [
  { level: 1 as const, pct: 5, color: '#00DFA9', glow: 'rgba(0,223,169,0.35)',  borderHover: 'rgba(0,223,169,0.5)',  bg: 'rgba(0,223,169,0.06)',  label: 'Direct',       desc: 'You invite them',         example: 'A → B: A earns 5% of B' },
  { level: 2 as const, pct: 3, color: '#38BDF8', glow: 'rgba(56,189,248,0.35)', borderHover: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.06)', label: 'Second Level', desc: 'Their referrals',         example: 'B → C: A earns 3% of C' },
  { level: 3 as const, pct: 1, color: '#FACC15', glow: 'rgba(250,204,21,0.35)', borderHover: 'rgba(250,204,21,0.5)', bg: 'rgba(250,204,21,0.06)', label: 'Third Level',  desc: 'Three hops from you',    example: 'C → D: A earns 1% of D' },
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
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">Affiliate Program</h2>
        <div className="flex items-center gap-2 sm:gap-3">
          {[
            { label: 'Earned',  value: ref.totalEarned,   color: '#00DFA9', decimals: 2 },
            { label: 'Refs',    value: ref.referrals.length, color: '#38BDF8', decimals: 0 },
            { label: 'Pending', value: ref.pendingEarned, color: '#FACC15', decimals: 2 },
          ].map(({ label, value, color, decimals }) => (
            <div key={label} className="flex-1 sm:flex-none text-center px-2.5 sm:px-3 py-2 rounded-xl border"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${color}20` }}>
              <div className="text-[15px] sm:text-[16px] font-black" style={{ color }}>
                <AnimatedNumber value={value} decimals={decimals} />
                {decimals > 0 && <span className="text-[9px] ml-0.5 opacity-60">USDT</span>}
              </div>
              <div className="text-[9px] text-[#64748B]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Commission level cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {LEVELS.map(({ level, pct, color, glow, borderHover, bg, label, desc, example }) => {
          const isHovered = hoveredLevel === level;
          return (
            <div key={level}
              onMouseEnter={() => setHoveredLevel(level)}
              onMouseLeave={() => setHoveredLevel(null)}
              className="relative rounded-2xl p-3 sm:p-4 border cursor-default overflow-hidden transition-all duration-300"
              style={{
                background: isHovered ? bg : '#0E1520',
                borderColor: isHovered ? borderHover : `${color}20`,
                boxShadow: isHovered ? `0 0 24px ${glow}` : 'none',
                transform: isHovered ? 'translateY(-2px)' : 'none',
              }}>
              <div className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${color}, transparent)`, opacity: isHovered ? 1 : 0.5 }} />
              <LevelBadge level={level} />
              <div className="mt-2 mb-0.5">
                <span className="text-[26px] sm:text-[36px] font-black leading-none" style={{ color }}>{pct}</span>
                <span className="text-[13px] sm:text-[18px] font-black" style={{ color }}>%</span>
              </div>
              <p className="text-[11px] font-semibold text-[#F8FAFC] leading-tight">{label}</p>
              <p className="text-[10px] text-[#64748B] mb-2 leading-tight">{desc}</p>
              <p className="text-[9px] font-mono px-1 sm:px-1.5 py-0.5 rounded-md leading-snug hidden sm:block"
                style={{ background: `${color}10`, color: `${color}CC`, border: `1px solid ${color}18` }}>
                {example}
              </p>
            </div>
          );
        })}
      </div>

      {/* Referral link card */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0C1A28 0%, #091215 100%)', border: '1px solid rgba(0,223,169,0.15)' }}>
        <div className="h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />
        <div className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)' }}>
                <LinkIcon className="w-4 w-4 text-[#00DFA9]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#F8FAFC]">Your Referral Link</p>
                <p className="text-[10px] text-[#64748B]">Share to earn USDT automatically</p>
              </div>
            </div>
            {!editingCode && (
              <button onClick={startEdit}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-[#64748B] border border-[#253241] bg-[#0A0E13] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 transition-all cursor-pointer">
                <Pencil className="w-3 h-3" /> Custom
              </button>
            )}
          </div>

          {!editingCode ? (
            <div className="space-y-2.5">
              {/* Code display */}
              <div className="flex items-center gap-3 px-3.5 py-3.5 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,223,169,0.2)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-[0.15em] mb-0.5">Referral Code</p>
                  <p className="text-[20px] font-black text-[#00DFA9] font-mono tracking-[0.25em] leading-none"
                    style={{ textShadow: '0 0 16px rgba(0,223,169,0.4)' }}>
                    {ref.myCode}
                  </p>
                </div>
                <button onClick={handleCopyCode}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
                    copiedCode ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-white/5 text-[#64748B] hover:text-[#00DFA9] hover:bg-[#00DFA9]/10'
                  )}>
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Full link */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl bg-[#0A0E13] border border-[#1E2A38] min-w-0">
                  <ExternalLink className="w-3 h-3 text-[#64748B] shrink-0" />
                  <span className="text-[10px] text-[#475569] font-mono truncate">{ref.myLink || '…'}</span>
                </div>
                <button onClick={handleCopyLink}
                  className={cn(
                    'flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-bold text-[12px] transition-all duration-200 cursor-pointer shrink-0',
                    copiedLink
                      ? 'bg-[#00DFA9]/15 border border-[#00DFA9]/35 text-[#00DFA9]'
                      : 'text-[#0B0F14] hover:scale-[1.02]'
                  )}
                  style={copiedLink ? {} : {
                    background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)',
                    boxShadow: '0 0 20px rgba(0,223,169,0.3)',
                  }}>
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-[#F8FAFC]">
                <Pencil className="w-3 h-3 text-[#38BDF8]" />
                Custom referral code
                <span className="text-[10px] text-[#64748B] font-normal">· 4–16 chars</span>
              </p>
              <div className="flex items-stretch rounded-xl overflow-hidden border transition-all"
                style={{ borderColor: codeError ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.4)' }}>
                <div className="flex items-center px-2.5 bg-[#0A0E13] border-r border-[#1E2A38] shrink-0">
                  <span className="text-[10px] text-[#475569] font-mono hidden sm:block">{origin}/?ref=</span>
                  <span className="text-[10px] text-[#475569] font-mono sm:hidden">/?ref=</span>
                </div>
                <input
                  value={customDraft}
                  onChange={e => handleDraftChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveCode(); if (e.key === 'Escape') cancelEdit(); }}
                  placeholder="YOURCODE"
                  autoFocus
                  className="flex-1 bg-[#080C10] px-3 py-3 text-[14px] font-black text-[#00DFA9] font-mono tracking-widest outline-none placeholder:text-[#1E2A38] min-w-0"
                />
              </div>
              {codeError && <p className="text-[10px] text-[#EF4444] flex items-center gap-1"><Info className="w-3 h-3" />{codeError}</p>}
              <div className="flex gap-2">
                <button onClick={saveCode} disabled={customDraft.length < 4}
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

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {[
          { label: 'Total Refs',   value: ref.referrals.length,  color: '#00DFA9', decimals: 0 },
          { label: 'Level 1',      value: ref.level1.length,     color: '#00DFA9', decimals: 0 },
          { label: 'Level 2',      value: ref.level2.length,     color: '#38BDF8', decimals: 0 },
          { label: 'Level 3',      value: ref.level3.length,     color: '#FACC15', decimals: 0 },
          { label: 'Earned',       value: ref.totalEarned,       color: '#00DFA9', decimals: 2 },
          { label: 'Pending',      value: ref.pendingEarned,     color: '#FACC15', decimals: 2 },
        ].map(s => (
          <div key={s.label} className="relative rounded-2xl p-3.5 border border-[#1E2A38] bg-[#0E1520] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1.5px]"
              style={{ background: `linear-gradient(90deg, ${s.color}80, transparent)` }} />
            <p className="text-[10px] text-[#64748B] mb-1">{s.label}</p>
            <p className="text-[18px] font-black" style={{ color: s.color }}>
              <AnimatedNumber value={s.value} decimals={s.decimals} />
              {s.decimals > 0 && <span className="text-[9px] font-bold ml-0.5 opacity-60">USDT</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Pending claim banner */}
      {ref.pendingEarned > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-[#FACC15]/20 bg-[#FACC15]/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FACC15]/12 border border-[#FACC15]/25 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-[#FACC15]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#F8FAFC]">
                {ref.pendingEarned.toFixed(2)} USDT pending
              </p>
              <p className="text-[10px] text-[#64748B]">Commission awaiting settlement</p>
            </div>
          </div>
          <button
            onClick={() => { ref.claimPending(); toast({ title: 'Commissions claimed!' }); }}
            className="px-4 py-2 rounded-xl text-[12px] font-bold text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #FACC15, #F59E0B)' }}>
            Claim All
          </button>
        </div>
      )}

      {/* Commission / Referrals tabs */}
      <div>
        <div className="flex gap-1.5 mb-3">
          {(['commissions', 'referrals'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[11.5px] font-semibold capitalize border transition-all cursor-pointer',
                activeTab === tab
                  ? 'bg-[#00DFA9]/12 text-[#00DFA9] border-[#00DFA9]/30'
                  : 'bg-[#0E1520] text-[#94A3B8]/55 border-white/[0.06] hover:text-[#F8FAFC]'
              )}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'commissions' ? (
          ref.commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <CircleDollarSign className="h-8 w-8 text-[#94A3B8]/20" />
              <p className="text-[13px] text-[#94A3B8]/40">No commissions yet</p>
              <p className="text-[11px] text-[#94A3B8]/25">Share your link to start earning</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
              {ref.commissions.map((c, i) => (
                <div key={c.id} className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  i > 0 && 'border-t border-white/[0.04]'
                )}>
                  <LevelBadge level={c.level as 1 | 2 | 3} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#F8FAFC]">{c.referredAddress}</p>
                    <p className="text-[10px] text-[#64748B]">{fmtDate(c.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-[#00DFA9]">+{c.earned.toFixed(2)} USDT</p>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          ref.referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Users className="h-8 w-8 text-[#94A3B8]/20" />
              <p className="text-[13px] text-[#94A3B8]/40">No referrals yet</p>
              <p className="text-[11px] text-[#94A3B8]/25">Share your link to grow your network</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
              {ref.referrals.map((r, i) => (
                <div key={r.id} className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  i > 0 && 'border-t border-white/[0.04]'
                )}>
                  <div className="w-8 h-8 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-black text-[#00DFA9]">{r.address.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#F8FAFC]">{r.address}</p>
                    <p className="text-[10px] text-[#64748B]">Joined {fmtDate(r.joinedAt)}</p>
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
