import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import {
  Trophy, Users, Target, Clock, CheckCircle2, Star, Flame,
  X, ArrowRight, Mail, User, Wallet, ShieldCheck, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';

// ─── Wallet definitions (mirrored from ConnectWalletModal) ────────────────────
const WALLETS = [
  {
    name: 'MetaMask', color: '#F6851B', description: 'Browser extension', popular: true,
    logo: <img src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/meta.svg" alt="MetaMask" className="w-7 h-7 object-contain" />,
  },
  {
    name: 'WalletConnect', color: '#3B99FC', description: 'Scan with mobile', popular: false,
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <circle cx="20" cy="20" r="20" fill="#3B99FC" fillOpacity=".15"/>
        <path d="M11.3 16.2c4.8-4.7 12.6-4.7 17.4 0l.6.6c.2.2.2.6 0 .8l-2 2c-.1.1-.3.1-.4 0l-.8-.8c-3.3-3.3-8.7-3.3-12 0l-.9.9c-.1.1-.3.1-.4 0l-2-2c-.2-.2-.2-.6 0-.8l1.5-1.7zm21.5 4l1.8 1.8c.2.2.2.6 0 .8L27 30.4c-.2.2-.6.2-.8 0l-4.5-4.5c-.1-.1-.2-.1-.2 0l-4.5 4.5c-.2.2-.6.2-.8 0l-7.6-7.6c-.2-.2-.2-.6 0-.8l1.8-1.8c.2-.2.6-.2.8 0l4.5 4.5c.1.1.2.1.2 0l4.5-4.5c.2-.2.6-.2.8 0l4.5 4.5c.1.1.2.1.2 0l4.5-4.5c.2-.2.6-.2.8 0z" fill="#3B99FC"/>
      </svg>
    ),
  },
  {
    name: 'Coinbase Wallet', color: '#0052FF', description: 'Coinbase Wallet app', popular: false,
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="10" fill="#0052FF" fillOpacity=".15"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M20 7C12.8 7 7 12.8 7 20s5.8 13 13 13 13-5.8 13-13S27.2 7 20 7zm-4 9.5h8c.3 0 .5.2.5.5v6c0 .3-.2.5-.5.5h-8c-.3 0-.5-.2-.5-.5v-6c0-.3.2-.5.5-.5z" fill="#0052FF"/>
      </svg>
    ),
  },
  {
    name: 'Phantom', color: '#AB9FF2', description: 'Solana & multi-chain', popular: false,
    logo: <img src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/4850.sp3ow1.192x192.webp" alt="Phantom" className="w-7 h-7 object-contain rounded-lg" />,
  },
];

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
    question: 'Who wins UEFA Champions League 2026/27?',
    options: [
      { id: 'mancity',  label: 'Man City',    votes: 2860 },
      { id: 'real',     label: 'Real Madrid', votes: 2352 },
      { id: 'bayern',   label: 'Bayern',      votes: 1512 },
      { id: 'arsenal',  label: 'Arsenal',     votes: 1008 },
      { id: 'other',    label: 'Other',       votes: 672  },
    ],
    totalPicks: 8404, closesLabel: '3d 14h', closesUrgent: false,
    accent: '#00DFA9', prizePool: '2,500 USDT', status: 'open',
  },
  {
    id: 'pl-scorer', category: 'Football', sport: 'Premier League', sportEmoji: '⚽',
    question: 'Premier League Top Scorer 2026/27?',
    options: [
      { id: 'haaland', label: 'Erling Haaland',    votes: 2395 },
      { id: 'palmer',  label: 'Cole Palmer',       votes: 1283 },
      { id: 'isak',    label: 'Alexander Isak',    votes: 1050 },
      { id: 'saka',    label: 'Bukayo Saka',       votes: 700  },
      { id: 'other',   label: 'Other',             votes: 409  },
    ],
    totalPicks: 5837, closesLabel: '5d 2h', closesUrgent: false,
    accent: '#38BDF8', prizePool: '1,000 USDT', status: 'open',
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
    accent: '#FACC15', prizePool: '10,000 USDT', status: 'open',
  },
  {
    id: 'nba-mvp', category: 'Basketball', sport: 'NBA 2026/27', sportEmoji: '🏀',
    question: 'NBA MVP Award 2026/27?',
    options: [
      { id: 'jokic',   label: 'Nikola Jokić',             votes: 3951 },
      { id: 'luka',    label: 'Luka Dončić',              votes: 3277 },
      { id: 'sga',     label: 'Shai Gilgeous-Alexander',  votes: 2377 },
      { id: 'giannis', label: 'Giannis Antetokounmpo',    votes: 1696 },
    ],
    totalPicks: 11301, closesLabel: '28d', closesUrgent: false,
    accent: '#F97316', prizePool: '3,000 USDT', status: 'open',
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
    accent: '#A78BFA', prizePool: '1,500 USDT', status: 'open',
  },
  {
    id: 'euros-winner', category: 'Special', sport: 'UEFA Euro 2024 — SETTLED', sportEmoji: '🏅',
    question: 'Who won UEFA Euro 2024?',
    options: [
      { id: 'spain',   label: 'Spain',   votes: 8041 },
      { id: 'england', label: 'England', votes: 7213 },
      { id: 'france',  label: 'France',  votes: 4108 },
      { id: 'germany', label: 'Germany', votes: 3309 },
      { id: 'other',   label: 'Other',   votes: 1811 },
    ],
    totalPicks: 24482, closesLabel: 'Settled', closesUrgent: false,
    accent: '#00DFA9', prizePool: '5,000 USDT', status: 'settled', winnerOptionId: 'spain',
  },
  {
    id: 'el-final', category: 'Settled', sport: 'Europa League 2026 — SETTLED', sportEmoji: '🥈',
    question: 'Who won the Europa League Final 2026?',
    options: [
      { id: 'manu',     label: 'Man United', votes: 5201 },
      { id: 'atalanta', label: 'Atalanta',   votes: 4320 },
      { id: 'roma',     label: 'Roma',       votes: 2108 },
      { id: 'other',    label: 'Other',      votes: 980  },
    ],
    totalPicks: 12609, closesLabel: 'Settled', closesUrgent: false,
    accent: '#F97316', prizePool: '2,000 USDT', status: 'settled', winnerOptionId: 'atalanta',
  },
];

const LEADERBOARD = [
  { rank: 1, name: 'CryptoKing88',  correct: 12, total: 14, winnings: '1,250 USDT', badge: '🥇' },
  { rank: 2, name: 'BetWizard',     correct: 11, total: 14, winnings: '840 USDT',   badge: '🥈' },
  { rank: 3, name: 'OddsHacker',    correct: 10, total: 13, winnings: '620 USDT',   badge: '🥉' },
  { rank: 4, name: 'SharpeValue',   correct: 10, total: 14, winnings: '420 USDT',   badge: null },
  { rank: 5, name: 'LuckyStreak7',  correct: 9,  total: 14, winnings: '310 USDT',   badge: null },
  { rank: 6, name: 'TipsterPro',    correct: 9,  total: 13, winnings: '290 USDT',   badge: null },
  { rank: 7, name: 'GreenArrow',    correct: 8,  total: 12, winnings: '210 USDT',   badge: null },
  { rank: 8, name: 'BullsEye99',    correct: 8,  total: 14, winnings: '180 USDT',   badge: null },
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
  const { connect, isConnecting, isConnected, walletName: connectedWalletName } = useWallet();
  const [step, setStep] = useState<'details' | 'wallet'>(profile ? 'wallet' : 'details');
  const [name,  setName]  = useState(profile?.name  ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const { t } = useI18n();
  const option = pool.options.find(o => o.id === optionId);

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSaveProfile({ name: name.trim(), email: email.trim() });
    setStep('wallet');
  }

  async function handleWalletSelect(wName: string) {
    setConnectingWallet(wName);
    await connect(wName);
    setConnectingWallet(null);
    setTimeout(onConfirm, 120);
  }

  // If wallet was already connected when arriving on step 2, confirm straight away
  useEffect(() => {
    if (step === 'wallet' && isConnected && !connectingWallet) {
      const t = setTimeout(onConfirm, 200);
      return () => clearTimeout(t);
    }
  }, [isConnected, step]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[440px] bg-[#0D1117] border border-[#253241] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${pool.accent} 0%, ${pool.accent}40 60%, transparent 100%)` }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#1E2A38] flex items-center justify-center text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors z-10"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-6 pt-5 pb-6 space-y-5">

          {/* Pick preview chip */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#121821] border border-[#1E2A38]">
            <span className="text-lg shrink-0">{pool.sportEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/40 mb-0.5">{pool.sport}</p>
              <p className="text-[11px] font-semibold text-[#F8FAFC] leading-snug line-clamp-1">{pool.question}</p>
            </div>
            <div
              className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap"
              style={{ background: `${pool.accent}18`, color: pool.accent, border: `1px solid ${pool.accent}35` }}
            >
              {option?.label}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center">
            {(['details', 'wallet'] as const).map((s, i) => {
              const done   = s === 'details' && step === 'wallet';
              const active = step === s;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all"
                      style={active || done ? { background: pool.accent, color: '#0B0F14' } : { background: '#1E2A38', color: '#475569' }}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={cn('text-[11px] font-semibold', active ? 'text-[#F8FAFC]' : done ? 'text-[#94A3B8]/45' : 'text-[#94A3B8]/30')}>
                      {s === 'details' ? t('Your details') : t('Connect wallet')}
                    </span>
                  </div>
                  {i === 0 && (
                    <div className="flex-1 mx-3 h-px" style={{ background: step === 'wallet' ? `${pool.accent}60` : '#1E2A38' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Details ── */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <h2 className="text-[17px] font-black text-[#F8FAFC] leading-tight">{t('Who are you? 👋')}</h2>
                <p className="text-[12px] text-[#94A3B8]/55 mt-1">
                  We need your name and email to notify you if your pick wins a prize.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]/50 block mb-1.5">{t('Full name')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]/30 pointer-events-none" />
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Alex Johnson" required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#121821] border border-[#253241] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/20 outline-none transition-colors"
                      onFocus={e => (e.target.style.borderColor = `${pool.accent}55`)}
                      onBlur={e => (e.target.style.borderColor = '#253241')}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]/50 block mb-1.5">{t('Email address')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]/30 pointer-events-none" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#121821] border border-[#253241] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/20 outline-none transition-colors"
                      onFocus={e => (e.target.style.borderColor = `${pool.accent}55`)}
                      onBlur={e => (e.target.style.borderColor = '#253241')}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]/30">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                We never share your data. Email is only used for prize notifications.
              </div>
              <button
                type="submit"
                disabled={!name.trim() || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[13px] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ background: pool.accent, color: '#0B0F14' }}
              >
                {t('Continue')} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* ── Step 2: Wallet grid (inline, all wallets visible) ── */}
          {step === 'wallet' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[17px] font-black text-[#F8FAFC] leading-tight">{t('Choose your wallet 💰')}</h2>
                <p className="text-[12px] text-[#94A3B8]/55 mt-1">
                  Select a wallet below to lock in your prediction and receive prizes.
                </p>
              </div>

              {/* Wallet grid — all 4 visible at once */}
              <div className="grid grid-cols-2 gap-2.5">
                {WALLETS.map(w => {
                  const isThisConnecting = connectingWallet === w.name;
                  const disabled = !!connectingWallet;
                  return (
                    <button
                      key={w.name}
                      onClick={() => !disabled && handleWalletSelect(w.name)}
                      disabled={disabled}
                      className={cn(
                        'relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border text-center transition-all duration-200 group',
                        isThisConnecting
                          ? 'border-opacity-60 shadow-lg'
                          : disabled
                            ? 'bg-[#121821] border-[#1E2A38] opacity-30 cursor-not-allowed'
                            : 'bg-[#121821] border-[#1E2A38] hover:bg-[#18212B] hover:border-[#2E3D50] hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer',
                      )}
                      style={isThisConnecting ? { background: `${w.color}08`, borderColor: `${w.color}55` } : undefined}
                    >
                      {/* Popular badge */}
                      {w.popular && !connectingWallet && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider bg-[#00DFA9] text-[#0B0F14] px-2 py-[2px] rounded-full whitespace-nowrap">
                          Popular
                        </span>
                      )}

                      {/* Logo */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                        style={{ background: `${w.color}12`, border: `1.5px solid ${w.color}28` }}
                      >
                        {isThisConnecting
                          ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: w.color }} />
                          : w.logo}
                      </div>

                      {/* Name + description */}
                      <div className="min-w-0 w-full">
                        <p className="text-[13px] font-bold text-[#F8FAFC] truncate">{w.name}</p>
                        <p className="text-[10px] text-[#94A3B8]/55 mt-0.5 truncate">
                          {isThisConnecting ? 'Connecting…' : w.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#94A3B8]/30 pt-1">
                <ShieldCheck className="h-3 w-3 shrink-0 text-[#00DFA9]/40" />
                Non-custodial &amp; encrypted — we never hold your funds
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── How to Play ──────────────────────────────────────────────────────────────
function HowToPlayGuide() {
  const { t } = useI18n();
  const steps = [
    {
      num: '1', emoji: '🎯',
      title: 'Choose a prediction',
      desc: 'Browse open pools below. Each card has a question with 4–6 options. Tap the one you think will win.',
      color: '#00DFA9',
    },
    {
      num: '2', emoji: '📝',
      title: 'Enter name & email',
      desc: 'Quick 10-second form. We use your email to notify you if your prediction wins a prize.',
      color: '#38BDF8',
    },
    {
      num: '3', emoji: '💼',
      title: 'Connect your wallet',
      desc: 'Link MetaMask, Coinbase, or any Web3 wallet. Required so we can send you winnings instantly.',
      color: '#FACC15',
    },
    {
      num: '4', emoji: '🏆',
      title: 'Win real money',
      desc: 'If your pick is correct, you automatically share the prize pool with all winners. Paid out within 24 h.',
      color: '#F97316',
    },
  ];

  return (
    <div className="mb-8 rounded-2xl overflow-hidden border border-[#253241] bg-[#121821]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#253241] bg-[#0D1117]/60">
        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#00DFA9]/15">
          <Star className="h-3.5 w-3.5 text-[#00DFA9]" />
        </div>
        <span className="text-sm font-black text-[#F8FAFC]">{t('How it works')}</span>
        <span className="text-[10px] text-[#94A3B8]/35 font-medium">— 4 easy steps, completely free</span>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#1E2A38]">
        {steps.map(s => (
          <div key={s.num} className="p-5 flex flex-col gap-3 hover:bg-[#0D1117]/40 transition-colors">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}28` }}
              >
                {s.num}
              </div>
              <span className="text-xl">{s.emoji}</span>
            </div>
            <div>
              <p className="text-[13px] font-black text-[#F8FAFC] leading-snug">{s.title}</p>
              <p className="text-[11px] text-[#94A3B8]/50 leading-relaxed mt-1.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 border-t border-[#1E2A38] bg-[#0D1117]/40">
        {['Free to enter', 'No experience needed', 'One pick per question', 'Wallet required to win'].map((t, i) => (
          <span key={t} className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/40">
            <span style={{ color: ['#00DFA9', '#38BDF8', '#FACC15', '#F97316'][i] }}>✓</span>
            {t}
          </span>
        ))}
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
        'group relative flex flex-col rounded-2xl bg-[#121821] border overflow-hidden transition-all duration-200',
        pool.status === 'open'
          ? 'border-[#253241] hover:border-[#2D3E50]'
          : 'border-[#1E2A38] opacity-75',
      )}
    >
      {/* Top colour line */}
      <div className="h-[2px] w-full shrink-0" style={{ background: `linear-gradient(90deg, ${pool.accent} 0%, ${pool.accent}50 50%, transparent 100%)` }} />

      <div className="p-5 flex flex-col flex-1 gap-4">

        {/* Card header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm">{pool.sportEmoji}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/40">{pool.sport}</span>
              {pool.status === 'settled' && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-[2px] rounded bg-[#94A3B8]/10 text-[#94A3B8]/45">
                  Settled
                </span>
              )}
              {pool.status === 'open' && !userPick && (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-1.5 py-[2px] rounded border animate-pulse"
                  style={{ background: `${pool.accent}10`, color: pool.accent, borderColor: `${pool.accent}30` }}
                >
                  Tap to predict
                </span>
              )}
              {pool.status === 'open' && userPick && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-[2px] rounded border"
                  style={{ background: `${pool.accent}10`, color: pool.accent, borderColor: `${pool.accent}30` }}>
                  Predicted ✓
                </span>
              )}
            </div>
            <h3 className="text-[13px] font-black text-[#F8FAFC] leading-snug">{pool.question}</h3>
          </div>

          {/* Prize badge */}
          <div
            className="shrink-0 flex flex-col items-center px-3 py-2 rounded-xl"
            style={{ background: `${pool.accent}10`, border: `1px solid ${pool.accent}22` }}
          >
            <p className="text-[13px] font-black leading-none" style={{ color: pool.accent }}>{pool.prizePool}</p>
            <p className="text-[8px] font-semibold uppercase tracking-widest text-[#94A3B8]/40 mt-0.5">prize</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-1.5 flex-1">
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
                  'w-full relative rounded-lg overflow-hidden text-left transition-all duration-150',
                  pool.status === 'open'
                    ? 'cursor-pointer hover:brightness-110 active:scale-[0.99]'
                    : 'cursor-default',
                )}
              >
                {/* Fill bar */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: isWinner
                      ? `${pool.accent}22`
                      : isPicked
                        ? `${pool.accent}15`
                        : 'rgba(37,50,65,0.45)',
                  }}
                />
                <div
                  className={cn(
                    'relative flex items-center justify-between px-3 py-2.5 border rounded-lg',
                    isWrongPick ? 'opacity-35' : '',
                  )}
                  style={{
                    borderColor: isWinner
                      ? `${pool.accent}70`
                      : isPicked
                        ? `${pool.accent}50`
                        : 'transparent',
                    background: 'rgba(18,24,33,0.7)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {(isPicked || isWinner) && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: pool.accent }} />
                    )}
                    <span
                      className={cn('text-[12px] font-semibold truncate', isWinner && 'font-black')}
                      style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#CBD5E1' }}
                    >
                      {option.label}
                      {isWinner && <span className="ml-1.5 text-[8px] font-black uppercase tracking-widest opacity-60"> Winner</span>}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-black tabular-nums shrink-0 ml-3"
                    style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#64748B' }}
                  >
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1E2A38]/70">
          <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
            <Users className="h-3 w-3" />
            <span>{pool.totalPicks.toLocaleString()} predictions</span>
          </div>
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: pool.closesUrgent ? '#EF4444' : pool.status === 'settled' ? '#475569' : '#475569' }}
          >
            <Clock className="h-3 w-3" />
            <span>{pool.status === 'settled' ? 'Closed' : `Closes in ${pool.closesLabel}`}</span>
          </div>
        </div>

        {/* Picked confirmation */}
        {userPick && pool.status === 'open' && (
          <div
            className="rounded-xl px-3 py-2.5 text-[11px] font-semibold flex items-center gap-2"
            style={{ background: `${pool.accent}0E`, color: pool.accent, border: `1px solid ${pool.accent}22` }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Your prediction is locked in! We'll notify you when results are announced.
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
  const [pendingPick, setPendingPick] = useState<{ poolId: string; optionId: string } | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => { localStorage.setItem(LS_KEY_PICKS, JSON.stringify(picks)); }, [picks]);
  useEffect(() => { if (profile) localStorage.setItem(LS_KEY_PROFILE, JSON.stringify(profile)); }, [profile]);

  function handlePickClick(poolId: string, optionId: string) {
    setPendingPick({ poolId, optionId });
  }

  function handleConfirm() {
    if (!pendingPick) return;
    const pool   = POOLS.find(p => p.id === pendingPick.poolId);
    const option = pool?.options.find(o => o.id === pendingPick.optionId);
    const label  = option?.label ?? '';
    setPicks(prev => ({ ...prev, [pendingPick.poolId]: pendingPick.optionId }));
    setPendingPick(null);
    setTimeout(() => {
      toast({ title: '🎯 Prediction locked in!', description: `You picked "${label}" — good luck!` });
    }, 0);
  }

  const totalUserPicks   = Object.keys(picks).length;
  const totalPrizePool   = POOLS
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + parseFloat(p.prizePool.replace(/[$,]/g, '')), 0);

  const visible = active === 'All'
    ? POOLS.filter(p => p.status === 'open')
    : active === 'Settled'
      ? POOLS.filter(p => p.status === 'settled')
      : POOLS.filter(p => p.category === active && p.status === 'open');

  const pendingPool = pendingPick ? POOLS.find(p => p.id === pendingPick.poolId) : null;

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-14 xl:pb-0">
      <Header />

      {pendingPick && pendingPool && (
        <EntryModal
          pool={pendingPool}
          optionId={pendingPick.optionId}
          profile={profile}
          onSaveProfile={p => setProfile(p)}
          onConfirm={handleConfirm}
          onClose={() => setPendingPick(null)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden mb-7 bg-[#121821] border border-[#1E2A38]">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 30%, #00DFA920 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, #38BDF815 0%, transparent 50%)' }}
          />
          <div className="relative px-6 sm:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-[#00DFA9]/12 border border-[#00DFA9]/25 px-3 py-1 rounded-full">
                  <Target className="h-3 w-3 text-[#00DFA9]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#00DFA9]">Free to Play · No Stake Required</span>
                </div>
                <h1 className="text-[28px] sm:text-3xl font-black tracking-tight text-[#F8FAFC]">Predict &amp; Win</h1>
                <p className="text-[#94A3B8]/65 text-[13px] max-w-sm leading-relaxed">
                  Think you know sport? Pick the winner of the biggest events in 2026 and win real cash prizes — completely free.
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-5 sm:gap-7 shrink-0">
                <div className="text-center space-y-0.5">
                  <p className="text-[22px] font-black text-[#00DFA9]">{totalPrizePool.toLocaleString()} USDT</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/45">In prizes</p>
                </div>
                <div className="w-px bg-[#1E2A38] self-stretch" />
                <div className="text-center space-y-0.5">
                  <p className="text-[22px] font-black text-[#F8FAFC]">{POOLS.filter(p => p.status === 'open').length}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/45">Open now</p>
                </div>
                {totalUserPicks > 0 && (
                  <>
                    <div className="w-px bg-[#1E2A38] self-stretch" />
                    <div className="text-center space-y-0.5">
                      <p className="text-[22px] font-black text-[#FACC15]">{totalUserPicks}</p>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/45">Your picks</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: <Users className="h-3.5 w-3.5" />, label: 'Community picks', value: '84,290+', color: '#00DFA9' },
                { icon: <Trophy className="h-3.5 w-3.5" />, label: 'Winners paid out', value: '1,204', color: '#FACC15' },
                { icon: <Star className="h-3.5 w-3.5" />, label: 'Best accuracy', value: '78%', color: '#38BDF8' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5 rounded-xl bg-[#0B0F14]/50 border border-[#1E2A38] px-4 py-3">
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <div>
                    <p className="text-[13px] font-black text-[#F8FAFC]">{s.value}</p>
                    <p className="text-[9px] text-[#94A3B8]/45">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── How to Play ──────────────────────────────────── */}
        <HowToPlayGuide />

        {/* ── Category tabs ────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                active === cat
                  ? 'bg-[#00DFA9] text-[#0B0F14] border-[#00DFA9]'
                  : 'bg-[#121821] text-[#94A3B8]/55 border-[#1E2A38] hover:border-[#253241] hover:text-[#94A3B8]/80',
              )}
            >
              {t(cat)}
            </button>
          ))}
        </div>

        {/* ── Pool grid ────────────────────────────────────── */}
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
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1E2A38]/60 flex items-center justify-center">
              <Target className="h-6 w-6 text-[#94A3B8]/25" />
            </div>
            <p className="text-sm text-[#94A3B8]/40">No pools in this category right now</p>
          </div>
        )}

        {/* ── Leaderboard ──────────────────────────────────── */}
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="h-4 w-4 text-[#F97316]" />
            <h2 className="text-[15px] font-black text-[#F8FAFC]">Top Predictors</h2>
            <span className="text-[10px] text-[#94A3B8]/35 ml-1">All-time leaderboard</span>
          </div>

          <div className="rounded-2xl bg-[#121821] border border-[#1E2A38] overflow-hidden">
            <div className="grid grid-cols-[36px_1fr_72px_72px_88px] px-5 py-2.5 border-b border-[#1E2A38]">
              {['#', 'Player', 'Correct', 'Total', 'Winnings'].map(h => (
                <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/30">{h}</span>
              ))}
            </div>
            {LEADERBOARD.map((entry, i) => {
              const accuracy = Math.round((entry.correct / entry.total) * 100);
              return (
                <div
                  key={entry.rank}
                  className={cn(
                    'grid grid-cols-[36px_1fr_72px_72px_88px] items-center px-5 py-3 transition-colors',
                    i < LEADERBOARD.length - 1 ? 'border-b border-[#1E2A38]/60' : '',
                    i < 3 ? 'bg-[#00DFA9]/[0.025]' : 'hover:bg-[#1E2A38]/30',
                  )}
                >
                  <span className="text-sm font-black">
                    {entry.badge ?? <span className="text-[12px] font-bold text-[#94A3B8]/40">{entry.rank}</span>}
                  </span>
                  <span className="text-[13px] font-semibold text-[#F8FAFC] truncate pr-2">{entry.name}</span>
                  <span className="text-[13px] font-black text-[#00DFA9]">{entry.correct}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[13px] font-semibold text-[#94A3B8]/60">{entry.total}</span>
                    <span className="text-[9px] text-[#94A3B8]/30">{accuracy}%</span>
                  </div>
                  <span className="text-[13px] font-black text-[#FACC15]">{entry.winnings}</span>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
