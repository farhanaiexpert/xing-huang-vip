import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import {
  Trophy, Users, Target, Clock, CheckCircle2, Star, Flame,
  X, ArrowRight, Mail, User, Wallet, Gift, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PoolOption { id: string; label: string; votes: number; }
interface Pool {
  id: string; category: Category; sport: string; sportEmoji: string;
  question: string; options: PoolOption[]; totalPicks: number;
  closesLabel: string; closesUrgent: boolean;
  accent: string; prizePool: string; status: 'open' | 'settled';
  winnerOptionId?: string;
}
type Category = 'All' | 'Football' | 'Basketball' | 'Tennis' | 'Special' | 'Settled';
interface UserProfile { name: string; email: string; }

// ─── Data ─────────────────────────────────────────────────────────────────────
const POOLS: Pool[] = [
  {
    id: 'ucl-winner', category: 'Football', sport: 'Champions League', sportEmoji: '⭐',
    question: 'Who wins UEFA Champions League 2025/26?',
    options: [
      { id: 'mancity',  label: 'Man City',    votes: 2860 },
      { id: 'real',     label: 'Real Madrid', votes: 2352 },
      { id: 'bayern',   label: 'Bayern',      votes: 1512 },
      { id: 'arsenal',  label: 'Arsenal',     votes: 1008 },
      { id: 'other',    label: 'Other',       votes: 672  },
    ],
    totalPicks: 8404, closesLabel: '3d 14h', closesUrgent: false,
    accent: '#00DFA9', prizePool: '$2,500', status: 'open',
  },
  {
    id: 'pl-scorer', category: 'Football', sport: 'Premier League', sportEmoji: '⚽',
    question: 'Premier League Top Scorer 2025/26?',
    options: [
      { id: 'haaland', label: 'Erling Haaland',    votes: 2395 },
      { id: 'palmer',  label: 'Cole Palmer',       votes: 1283 },
      { id: 'isak',    label: 'Alexander Isak',    votes: 1050 },
      { id: 'saka',    label: 'Bukayo Saka',       votes: 700  },
      { id: 'other',   label: 'Other',             votes: 409  },
    ],
    totalPicks: 5837, closesLabel: '5d 2h', closesUrgent: false,
    accent: '#38BDF8', prizePool: '$1,000', status: 'open',
  },
  {
    id: 'world-cup', category: 'Football', sport: 'FIFA World Cup 2026', sportEmoji: '🏆',
    question: 'Who wins the 2026 FIFA World Cup?',
    options: [
      { id: 'brazil',    label: 'Brazil',    votes: 6011 },
      { id: 'france',    label: 'France',    votes: 5083 },
      { id: 'england',   label: 'England',   votes: 4161 },
      { id: 'argentina', label: 'Argentina', votes: 3931 },
      { id: 'germany',   label: 'Germany',   votes: 2774 },
      { id: 'other',     label: 'Other',     votes: 1158 },
    ],
    totalPicks: 23118, closesLabel: '120d', closesUrgent: false,
    accent: '#FACC15', prizePool: '$10,000', status: 'open',
  },
  {
    id: 'nba-mvp', category: 'Basketball', sport: 'NBA 2025/26', sportEmoji: '🏀',
    question: 'NBA MVP Award 2025/26?',
    options: [
      { id: 'jokic',   label: 'Nikola Jokić',             votes: 3951 },
      { id: 'luka',    label: 'Luka Dončić',              votes: 3277 },
      { id: 'sga',     label: 'Shai Gilgeous-Alexander',  votes: 2377 },
      { id: 'giannis', label: 'Giannis Antetokounmpo',    votes: 1696 },
    ],
    totalPicks: 11301, closesLabel: '28d', closesUrgent: false,
    accent: '#F97316', prizePool: '$3,000', status: 'open',
  },
  {
    id: 'wimbledon', category: 'Tennis', sport: 'Wimbledon 2026', sportEmoji: '🎾',
    question: "Wimbledon 2026 Men's Singles Champion?",
    options: [
      { id: 'alcaraz',  label: 'Carlos Alcaraz',   votes: 2327 },
      { id: 'sinner',   label: 'Jannik Sinner',    votes: 1715 },
      { id: 'djokovic', label: 'Novak Djokovic',   votes: 1350 },
      { id: 'other',    label: 'Other',            votes: 735  },
    ],
    totalPicks: 6127, closesLabel: '45d', closesUrgent: false,
    accent: '#A78BFA', prizePool: '$1,500', status: 'open',
  },
  {
    id: 'euros-winner', category: 'Special', sport: 'Euro 2024 — SETTLED', sportEmoji: '🏅',
    question: 'Who won UEFA Euro 2024?',
    options: [
      { id: 'spain',   label: 'Spain',   votes: 8041 },
      { id: 'england', label: 'England', votes: 7213 },
      { id: 'france',  label: 'France',  votes: 4108 },
      { id: 'germany', label: 'Germany', votes: 3309 },
      { id: 'other',   label: 'Other',   votes: 1811 },
    ],
    totalPicks: 24482, closesLabel: 'Settled', closesUrgent: false,
    accent: '#00DFA9', prizePool: '$5,000', status: 'settled', winnerOptionId: 'spain',
  },
  {
    id: 'el-final', category: 'Settled', sport: 'Europa League — SETTLED', sportEmoji: '🥈',
    question: 'Who won the Europa League Final 2024/25?',
    options: [
      { id: 'manu',     label: 'Man United', votes: 5201 },
      { id: 'atalanta', label: 'Atalanta',   votes: 4320 },
      { id: 'roma',     label: 'Roma',       votes: 2108 },
      { id: 'other',    label: 'Other',      votes: 980  },
    ],
    totalPicks: 12609, closesLabel: 'Settled', closesUrgent: false,
    accent: '#F97316', prizePool: '$2,000', status: 'settled', winnerOptionId: 'atalanta',
  },
];

const LEADERBOARD = [
  { rank: 1, name: 'CryptoKing88',  correct: 12, total: 14, winnings: '$1,250', badge: '🥇' },
  { rank: 2, name: 'BetWizard',     correct: 11, total: 14, winnings: '$840',   badge: '🥈' },
  { rank: 3, name: 'OddsHacker',    correct: 10, total: 13, winnings: '$620',   badge: '🥉' },
  { rank: 4, name: 'SharpeValue',   correct: 10, total: 14, winnings: '$420',   badge: null },
  { rank: 5, name: 'LuckyStreak7',  correct: 9,  total: 14, winnings: '$310',   badge: null },
  { rank: 6, name: 'TipsterPro',    correct: 9,  total: 13, winnings: '$290',   badge: null },
  { rank: 7, name: 'GreenArrow',    correct: 8,  total: 12, winnings: '$210',   badge: null },
  { rank: 8, name: 'BullsEye99',    correct: 8,  total: 14, winnings: '$180',   badge: null },
];

const CATEGORIES: Category[] = ['All', 'Football', 'Basketball', 'Tennis', 'Special', 'Settled'];
const LS_KEY_PICKS   = 'gobet_predictions_v1';
const LS_KEY_PROFILE = 'gobet_predictor_profile_v1';

// ─── Entry Modal ──────────────────────────────────────────────────────────────
function EntryModal({
  pool, optionId, profile, onSaveProfile, onConfirm, onClose,
}: {
  pool: Pool;
  optionId: string;
  profile: UserProfile | null;
  onSaveProfile: (p: UserProfile) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { isConnected } = useWallet();
  const [step, setStep] = useState<'details' | 'wallet'>(profile ? 'wallet' : 'details');
  const [name,  setName]  = useState(profile?.name  ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [walletOpen, setWalletOpen] = useState(false);
  const option = pool.options.find(o => o.id === optionId);

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSaveProfile({ name: name.trim(), email: email.trim() });
    setStep('wallet');
  }

  function handleSkipWallet() { onConfirm(); }
  function handleWalletConnected() { setWalletOpen(false); onConfirm(); }

  // If wallet just got connected while on wallet step, auto-confirm
  useEffect(() => {
    if (step === 'wallet' && isConnected && !walletOpen) {
      // give a tiny delay so the wallet modal closes cleanly
      const t = setTimeout(onConfirm, 200);
      return () => clearTimeout(t);
    }
  }, [isConnected, step, walletOpen]);

  return (
    <>
      <ConnectWalletModal
        open={walletOpen}
        onOpenChange={(v) => { setWalletOpen(v); }}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md bg-[#0D1117] border border-[#253241] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${pool.accent}, transparent 70%)` }} />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#253241]/50 flex items-center justify-center text-[#94A3B8]/60 hover:text-[#F8FAFC] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="px-6 pt-6 pb-7">
            {/* Your pick preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#121821] border border-[#253241] mb-6">
              <span className="text-xl">{pool.sportEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-widest">{pool.sport}</p>
                <p className="text-[12px] font-semibold text-[#F8FAFC] leading-snug truncate">{pool.question}</p>
              </div>
              <div
                className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black"
                style={{ background: `${pool.accent}20`, color: pool.accent, border: `1px solid ${pool.accent}40` }}
              >
                {option?.label}
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-5">
              {(['details', 'wallet'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all',
                      step === s
                        ? 'text-[#0B0F14]'
                        : (s === 'wallet' && step === 'details') ? 'bg-[#253241] text-[#94A3B8]/40' : 'text-[#0B0F14]',
                    )}
                    style={step === s || (s === 'details' && step === 'wallet')
                      ? { background: pool.accent }
                      : undefined}
                  >
                    {s === 'details' && step === 'wallet' ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    'text-[11px] font-semibold',
                    step === s ? 'text-[#F8FAFC]' : 'text-[#94A3B8]/40',
                  )}>
                    {s === 'details' ? 'Your details' : 'Connect wallet'}
                  </span>
                  {i === 0 && <div className="w-8 h-px bg-[#253241] mx-1" />}
                </div>
              ))}
            </div>

            {/* ── Step 1: Details ─────────────────────────── */}
            {step === 'details' && (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-black text-[#F8FAFC]">First, who are you? 👋</h2>
                  <p className="text-[12px] text-[#94A3B8]/60 mt-1">
                    We'll email you if your prediction wins and you claim a prize.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8]/60 uppercase tracking-wider block mb-1.5">
                      Your name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/30" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        required
                        className="w-full pl-9 pr-4 py-2.5 bg-[#121821] border border-[#253241] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/25 outline-none focus:border-[#253241] transition-colors"
                        style={{ '--focus-ring': pool.accent } as React.CSSProperties}
                        onFocus={e => (e.target.style.borderColor = `${pool.accent}60`)}
                        onBlur={e => (e.target.style.borderColor = '#253241')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#94A3B8]/60 uppercase tracking-wider block mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-9 pr-4 py-2.5 bg-[#121821] border border-[#253241] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/25 outline-none transition-colors"
                        onFocus={e => (e.target.style.borderColor = `${pool.accent}60`)}
                        onBlur={e => (e.target.style.borderColor = '#253241')}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-[#94A3B8]/30 leading-relaxed">
                  🔒 We never share your data. Email is only used to notify you of winnings.
                </p>

                <button
                  type="submit"
                  disabled={!name.trim() || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-30"
                  style={{ background: pool.accent, color: '#0B0F14' }}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* ── Step 2: Wallet ──────────────────────────── */}
            {step === 'wallet' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-black text-[#F8FAFC]">Connect your wallet 💰</h2>
                  <p className="text-[12px] text-[#94A3B8]/60 mt-1">
                    Your wallet is how we send you prize money if you win. It's secure and takes 30 seconds.
                  </p>
                </div>

                <div className="rounded-xl bg-[#121821] border border-[#253241] p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/25 flex items-center justify-center shrink-0">
                      <Gift className="h-4 w-4 text-[#00DFA9]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#F8FAFC]">Your prize goes straight to your wallet</p>
                      <p className="text-[11px] text-[#94A3B8]/55 mt-0.5">No bank, no waiting — instant crypto payout when results are confirmed.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/25 flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4 text-[#38BDF8]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#F8FAFC]">Works with MetaMask, Coinbase & more</p>
                      <p className="text-[11px] text-[#94A3B8]/55 mt-0.5">Use any popular wallet — we support all major Web3 wallets.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setWalletOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ background: pool.accent, color: '#0B0F14' }}
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet &amp; Confirm Pick
                </button>

                <button
                  onClick={handleSkipWallet}
                  className="w-full text-[12px] text-[#94A3B8]/50 hover:text-[#94A3B8]/80 transition-colors py-1"
                >
                  Skip for now — I'll connect later
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── How to Play Guide ────────────────────────────────────────────────────────
function HowToPlayGuide() {
  const steps = [
    {
      emoji: '🎯',
      title: 'Pick your winner',
      desc: 'See a question you like? Tap any option — it\'s that simple. Each question has 4–6 choices.',
      color: '#00DFA9',
      step: '1',
    },
    {
      emoji: '📧',
      title: 'Enter your details',
      desc: 'Just your name and email. We need these to contact you if your prediction wins. Takes 10 seconds.',
      color: '#38BDF8',
      step: '2',
    },
    {
      emoji: '💼',
      title: 'Connect your wallet',
      desc: 'Link a crypto wallet (like MetaMask) so we can send your prize directly. You can skip this and add it later.',
      color: '#FACC15',
      step: '3',
    },
    {
      emoji: '🏆',
      title: 'Win your share',
      desc: 'If you predicted correctly, you automatically share the prize pool with other winners. Paid out within 24 hours.',
      color: '#F97316',
      step: '4',
    },
  ];

  return (
    <div className="mb-8 rounded-2xl bg-[#121821] border border-[#253241] overflow-hidden">
      <div className="px-6 pt-5 pb-2 border-b border-[#253241]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#00DFA9]/15 flex items-center justify-center">
            <Star className="h-3.5 w-3.5 text-[#00DFA9]" />
          </div>
          <h2 className="text-sm font-black text-[#F8FAFC]">How it works — 4 simple steps</h2>
          <span className="ml-1 text-[10px] text-[#94A3B8]/40">No betting knowledge needed</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#253241]">
        {steps.map((s) => (
          <div key={s.step} className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0"
                style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}30` }}
              >
                {s.step}
              </div>
              <span className="text-2xl">{s.emoji}</span>
            </div>
            <div>
              <p className="text-[13px] font-black text-[#F8FAFC]">{s.title}</p>
              <p className="text-[11px] text-[#94A3B8]/55 leading-relaxed mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-3 bg-[#0B0F14]/40 border-t border-[#253241] flex items-center gap-2">
        <span className="text-[10px] text-[#94A3B8]/35">✅ Completely free to enter</span>
        <span className="text-[#253241]">·</span>
        <span className="text-[10px] text-[#94A3B8]/35">✅ No betting experience needed</span>
        <span className="text-[#253241]">·</span>
        <span className="text-[10px] text-[#94A3B8]/35">✅ One pick per question</span>
      </div>
    </div>
  );
}

// ─── Pool Card ────────────────────────────────────────────────────────────────
function PoolCard({ pool, userPick, onPickClick }: {
  pool: Pool;
  userPick: string | null;
  onPickClick: (poolId: string, optionId: string) => void;
}) {
  const totalVotes = pool.options.reduce((s, o) => s + o.votes, 0) + (userPick ? 1 : 0);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl bg-[#121821] border transition-all duration-200 overflow-hidden',
        pool.status === 'settled' ? 'border-[#253241] opacity-80' : 'border-[#253241]',
      )}
      style={pool.status === 'open' ? { boxShadow: `0 0 0 1px ${pool.accent}10 inset` } : undefined}
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${pool.accent}, transparent 70%)` }} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-sm">{pool.sportEmoji}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/45">{pool.sport}</span>
              {pool.status === 'settled' && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#94A3B8]/10 text-[#94A3B8]/50">Settled</span>
              )}
              {pool.status === 'open' && !userPick && (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                  style={{ background: `${pool.accent}12`, color: pool.accent, borderColor: `${pool.accent}30` }}
                >
                  Tap to predict
                </span>
              )}
            </div>
            <h3 className="text-sm font-black text-[#F8FAFC] leading-snug">{pool.question}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black" style={{ color: pool.accent }}>{pool.prizePool}</p>
            <p className="text-[9px] text-[#94A3B8]/40">prize pool</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2 flex-1">
          {pool.options.map(option => {
            const myVotes = option.votes + (userPick === option.id ? 1 : 0);
            const pct = totalVotes > 0 ? Math.round((myVotes / totalVotes) * 100) : 0;
            const isPicked = userPick === option.id;
            const isWinner = pool.status === 'settled' && pool.winnerOptionId === option.id;
            const isWrongPick = pool.status === 'settled' && isPicked && !isWinner;

            return (
              <button
                key={option.id}
                onClick={() => pool.status === 'open' && onPickClick(pool.id, option.id)}
                disabled={pool.status === 'settled'}
                className={cn(
                  'w-full relative rounded-lg overflow-hidden transition-all duration-200 text-left',
                  pool.status === 'open' ? 'cursor-pointer hover:brightness-110 active:scale-[0.99]' : 'cursor-default',
                )}
              >
                {/* Fill bar */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isWinner ? `${pool.accent}25` : isPicked ? `${pool.accent}18` : 'rgba(37,50,65,0.5)',
                  }}
                />
                <div
                  className={cn(
                    'relative flex items-center justify-between px-3 py-2.5 border rounded-lg',
                    isWrongPick ? 'opacity-40' : '',
                  )}
                  style={{
                    borderColor: isWinner ? pool.accent : isPicked ? pool.accent : 'transparent',
                    background: isWinner || isPicked ? 'transparent' : 'rgba(18,24,33,0.8)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {(isPicked || isWinner) && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: pool.accent }} />
                    )}
                    <span
                      className={cn('text-[12px] font-semibold truncate', isWinner ? 'font-black' : '')}
                      style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#F8FAFC' }}
                    >
                      {option.label}
                      {isWinner && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest opacity-70">Winner ✓</span>}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-black tabular-nums shrink-0 ml-2"
                    style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#94A3B8' }}
                  >
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#253241]">
          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/40">
            <Users className="h-3 w-3" />
            <span>{pool.totalPicks.toLocaleString()} predictions</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{
            color: pool.closesUrgent ? '#EF4444' : '#94A3B8',
            opacity: pool.status === 'settled' ? 0.4 : pool.closesUrgent ? 1 : 0.4,
          }}>
            <Clock className="h-3 w-3" />
            <span>{pool.status === 'settled' ? 'Closed' : `Closes in ${pool.closesLabel}`}</span>
          </div>
        </div>

        {userPick && pool.status === 'open' && (
          <div
            className="rounded-lg px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5"
            style={{ background: `${pool.accent}12`, color: pool.accent, border: `1px solid ${pool.accent}25` }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Your prediction is locked in! We'll notify you when results are out.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PredictionPools() {
  const [active, setActive] = useState<Category>('All');
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_PICKS) ?? '{}'); }
    catch { return {}; }
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_PROFILE) ?? 'null'); }
    catch { return null; }
  });
  // Modal state
  const [pendingPick, setPendingPick] = useState<{ poolId: string; optionId: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem(LS_KEY_PICKS, JSON.stringify(picks)); }, [picks]);
  useEffect(() => { if (profile) localStorage.setItem(LS_KEY_PROFILE, JSON.stringify(profile)); }, [profile]);

  function handlePickClick(poolId: string, optionId: string) {
    // If already picked, allow changing — show modal again
    setPendingPick({ poolId, optionId });
  }

  function handleSaveProfile(p: UserProfile) {
    setProfile(p);
  }

  function handleConfirm() {
    if (!pendingPick) return;
    const pool = POOLS.find(p => p.id === pendingPick.poolId);
    const option = pool?.options.find(o => o.id === pendingPick.optionId);
    const label = option?.label ?? '';
    setPicks(prev => ({ ...prev, [pendingPick.poolId]: pendingPick.optionId }));
    setPendingPick(null);
    // defer toast until after state updates settle
    setTimeout(() => {
      toast({ title: '🎯 Prediction locked in!', description: `You picked "${label}" — good luck!` });
    }, 0);
  }

  const totalUserPicks = Object.keys(picks).length;
  const totalPrizePool = POOLS
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + parseFloat(p.prizePool.replace('$', '').replace(',', '')), 0);

  const visible = active === 'All'
    ? POOLS.filter(p => p.status === 'open')
    : active === 'Settled'
      ? POOLS.filter(p => p.status === 'settled')
      : POOLS.filter(p => p.category === active && p.status === 'open');

  const pendingPool = pendingPick ? POOLS.find(p => p.id === pendingPick.poolId) : null;

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-14 xl:pb-0">
      <Header />

      {/* Entry modal */}
      {pendingPick && pendingPool && (
        <EntryModal
          pool={pendingPool}
          optionId={pendingPick.optionId}
          profile={profile}
          onSaveProfile={handleSaveProfile}
          onConfirm={handleConfirm}
          onClose={() => setPendingPick(null)}
        />
      )}

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden mb-6 bg-[#121821] border border-[#253241]">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 75% 40%, #00DFA9 0%, transparent 60%), radial-gradient(ellipse at 15% 80%, #38BDF8 0%, transparent 55%)' }}
          />
          <div className="relative px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#00DFA9]/15 border border-[#00DFA9]/30 px-3 py-1 rounded-full text-[10px] font-bold text-[#00DFA9] uppercase tracking-widest mb-3">
                  <Target className="h-3 w-3" /> 100% Free to Play
                </div>
                <h1 className="text-3xl font-black tracking-tight">Predict &amp; Win</h1>
                <p className="text-[#94A3B8]/70 text-sm mt-1.5 max-w-md">
                  Think you know sport? Predict the outcome of major events and win real cash — no experience, no stake, no risk.
                </p>
              </div>
              <div className="flex gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-black text-[#00DFA9]">${totalPrizePool.toLocaleString()}</p>
                  <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider mt-0.5">In prizes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-[#F8FAFC]">{POOLS.filter(p => p.status === 'open').length}</p>
                  <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider mt-0.5">Open now</p>
                </div>
                {totalUserPicks > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#FACC15]">{totalUserPicks}</p>
                    <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider mt-0.5">Your picks</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* How to play guide */}
        <HowToPlayGuide />

        {/* Category tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                active === cat
                  ? 'bg-[#00DFA9] text-[#0B0F14] border-[#00DFA9]'
                  : 'bg-[#121821] text-[#94A3B8]/60 border-[#253241] hover:border-[#94A3B8]/30 hover:text-[#94A3B8]',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Pool grid */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map(pool => (
              <PoolCard
                key={pool.id}
                pool={pool}
                userPick={picks[pool.id] ?? null}
                onPickClick={handlePickClick}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#253241]/50 flex items-center justify-center">
              <Target className="h-6 w-6 text-[#94A3B8]/30" />
            </div>
            <p className="text-sm text-[#94A3B8]/50">No pools in this category right now</p>
          </div>
        )}

        {/* Leaderboard */}
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="h-4 w-4 text-[#F97316]" />
            <h2 className="text-base font-black text-[#F8FAFC]">Top Predictors</h2>
            <span className="text-[10px] text-[#94A3B8]/40 ml-1">· All-time leaderboard</span>
          </div>
          <div className="rounded-2xl bg-[#121821] border border-[#253241] overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_80px_80px_90px] gap-0 px-4 py-2.5 border-b border-[#253241]">
              {['#', 'Player', 'Correct', 'Total', 'Winnings'].map(h => (
                <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/35">{h}</span>
              ))}
            </div>
            {LEADERBOARD.map((entry, i) => {
              const accuracy = Math.round((entry.correct / entry.total) * 100);
              return (
                <div
                  key={entry.rank}
                  className={cn(
                    'grid grid-cols-[40px_1fr_80px_80px_90px] items-center gap-0 px-4 py-3 transition-colors',
                    i < LEADERBOARD.length - 1 ? 'border-b border-[#253241]/50' : '',
                    i < 3 ? 'bg-[#00DFA9]/[0.02]' : 'hover:bg-[#253241]/20',
                  )}
                >
                  <span className="text-sm font-black">
                    {entry.badge ?? <span className="text-[12px] font-bold text-[#94A3B8]/50">{entry.rank}</span>}
                  </span>
                  <span className="text-sm font-semibold text-[#F8FAFC] truncate pr-2">{entry.name}</span>
                  <span className="text-sm font-bold text-[#00DFA9]">{entry.correct}</span>
                  <div>
                    <span className="text-sm font-semibold text-[#94A3B8]/70">{entry.total}</span>
                    <span className="ml-1.5 text-[10px] text-[#94A3B8]/35">{accuracy}%</span>
                  </div>
                  <span className="text-sm font-black text-[#FACC15]">{entry.winnings}</span>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
