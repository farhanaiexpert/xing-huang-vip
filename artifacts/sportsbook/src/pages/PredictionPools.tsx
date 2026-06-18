import { useState, useMemo, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import { useOddsData } from '@/hooks/useOddsData';
import { cn } from '@/lib/utils';
import type { Match, League } from '@/types';
import {
  Trophy, Users, Target, Clock, CheckCircle2, Star, Flame,
  X, ArrowRight, Mail, User, Wallet, ShieldCheck, Loader2,
  Calendar, Lock, Zap, TrendingUp, Award, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Wallet list (used in outright pool entry flow) ───────────────────────────
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

// ─── Outright pool types & data ───────────────────────────────────────────────
interface PoolOption { id: string; label: string; votes: number; }
interface Pool {
  id: string; category: OutrightCategory; sport: string; sportEmoji: string;
  question: string; options: PoolOption[]; totalPicks: number;
  closesLabel: string; closesUrgent: boolean;
  accent: string; prizePool: string; status: 'open' | 'settled';
  winnerOptionId?: string;
}
type OutrightCategory = 'All' | 'Football' | 'Basketball' | 'Tennis' | 'Special' | 'Settled';
interface UserProfile { name: string; email: string; }

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
      { id: 'haaland', label: 'Erling Haaland',  votes: 2395 },
      { id: 'palmer',  label: 'Cole Palmer',     votes: 1283 },
      { id: 'isak',    label: 'Alexander Isak',  votes: 1050 },
      { id: 'saka',    label: 'Bukayo Saka',     votes: 700  },
      { id: 'other',   label: 'Other',           votes: 409  },
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
      { id: 'jokic',   label: 'Nikola Jokić',            votes: 3951 },
      { id: 'luka',    label: 'Luka Dončić',             votes: 3277 },
      { id: 'sga',     label: 'Shai Gilgeous-Alexander', votes: 2377 },
      { id: 'giannis', label: 'Giannis Antetokounmpo',   votes: 1696 },
    ],
    totalPicks: 11301, closesLabel: '28d', closesUrgent: false,
    accent: '#F97316', prizePool: '3,000 USDT', status: 'open',
  },
  {
    id: 'wimbledon', category: 'Tennis', sport: 'Wimbledon 2026', sportEmoji: '🎾',
    question: "Wimbledon 2026 Men's Singles Champion?",
    options: [
      { id: 'alcaraz',  label: 'Carlos Alcaraz', votes: 2327 },
      { id: 'sinner',   label: 'Jannik Sinner',  votes: 1715 },
      { id: 'djokovic', label: 'Novak Djokovic', votes: 1350 },
      { id: 'other',    label: 'Other',          votes: 735  },
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

const OUTRIGHT_CATEGORIES: OutrightCategory[] = ['All', 'Football', 'Basketball', 'Tennis', 'Special', 'Settled'];
const LS_KEY_OUTRIGHT_PICKS   = 'gobet_predictions_v1';
const LS_KEY_OUTRIGHT_PROFILE = 'gobet_predictor_profile_v1';
const LS_KEY_WEEKLY           = 'pools_weekly_v2';

// ─── Weekly challenge helpers ─────────────────────────────────────────────────

function getCurrentWeekId(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`;
}

interface WeeklyState {
  roundId: string;
  picks: Record<string, 'home' | 'draw' | 'away'>;
  submitted: boolean;
}

function loadWeeklyState(): WeeklyState {
  try {
    const raw = localStorage.getItem(LS_KEY_WEEKLY);
    if (!raw) return { roundId: getCurrentWeekId(), picks: {}, submitted: false };
    const parsed = JSON.parse(raw) as WeeklyState;
    if (parsed.roundId !== getCurrentWeekId()) {
      return { roundId: getCurrentWeekId(), picks: {}, submitted: false };
    }
    return parsed;
  } catch {
    return { roundId: getCurrentWeekId(), picks: {}, submitted: false };
  }
}

interface ChallengeMatch { match: Match; leagueName: string; }

function selectChallengeMatches(allLeagues: League[]): ChallengeMatch[] {
  const now = Date.now();
  const items: ChallengeMatch[] = [];

  for (const league of allLeagues) {
    if (league.sportId !== 'sp_soccer') continue;
    for (const match of league.matches) {
      if (!match.odds.home || !match.odds.away) continue;
      if (match.isLive) continue;
      if (match.commenceIso && new Date(match.commenceIso).getTime() <= now) continue;
      items.push({ match, leagueName: league.name });
    }
  }

  return items
    .sort((a, b) => {
      const at = a.match.commenceIso ? new Date(a.match.commenceIso).getTime() : Infinity;
      const bt = b.match.commenceIso ? new Date(b.match.commenceIso).getTime() : Infinity;
      return at - bt;
    })
    .slice(0, 6);
}

function fmtOdds(o: number): string {
  return o.toFixed(2);
}

function useCountdown(targetIso: string | undefined): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!targetIso) { setLabel(''); return; }
    const target = new Date(targetIso).getTime();
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setLabel('Kicked off'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h >= 48) {
        const days = Math.floor(h / 24);
        setLabel(`${days}d ${h % 24}h`);
      } else if (h >= 1) {
        setLabel(`${h}h ${m}m`);
      } else {
        setLabel(`${m}m ${s}s`);
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return label;
}

// ─── Outright pool: entry modal ───────────────────────────────────────────────

function EntryModal({
  pool, optionId, profile, onSaveProfile, onConfirm, onClose,
}: {
  pool: Pool; optionId: string; profile: UserProfile | null;
  onSaveProfile: (p: UserProfile) => void; onConfirm: () => void; onClose: () => void;
}) {
  const { connect, isConnecting, isConnected } = useWallet();
  const [step, setStep] = useState<'details' | 'wallet'>(profile ? 'wallet' : 'details');
  const [name,  setName]  = useState(profile?.name  ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
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

  useEffect(() => {
    if (!(step === 'wallet' && isConnected && !connectingWallet)) return;
    const t = setTimeout(onConfirm, 200);
    return () => clearTimeout(t);
  }, [isConnected, step, connectingWallet, onConfirm]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-[440px] bg-[#0D1117] border border-[#253241] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${pool.accent} 0%, ${pool.accent}40 60%, transparent 100%)` }} />
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#1E2A38] flex items-center justify-center text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors z-10">
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-6 pt-5 pb-6 space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#121821] border border-[#1E2A38]">
            <span className="text-lg shrink-0">{pool.sportEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/40 mb-0.5">{pool.sport}</p>
              <p className="text-[11px] font-semibold text-[#F8FAFC] leading-snug line-clamp-1">{pool.question}</p>
            </div>
            <div className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap"
              style={{ background: `${pool.accent}18`, color: pool.accent, border: `1px solid ${pool.accent}35` }}>
              {option?.label}
            </div>
          </div>

          <div className="flex items-center">
            {(['details', 'wallet'] as const).map((s, i) => {
              const done = s === 'details' && step === 'wallet';
              const active = step === s;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all"
                      style={active || done ? { background: pool.accent, color: '#0B0F14' } : { background: '#1E2A38', color: '#475569' }}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={cn('text-[11px] font-semibold', active ? 'text-[#F8FAFC]' : done ? 'text-[#94A3B8]/45' : 'text-[#94A3B8]/30')}>
                      {s === 'details' ? 'Your details' : 'Connect wallet'}
                    </span>
                  </div>
                  {i === 0 && <div className="flex-1 mx-3 h-px" style={{ background: step === 'wallet' ? `${pool.accent}60` : '#1E2A38' }} />}
                </div>
              );
            })}
          </div>

          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <h2 className="text-[17px] font-black text-[#F8FAFC]">Who are you? 👋</h2>
                <p className="text-[12px] text-[#94A3B8]/55 mt-1">We need your name and email to notify you if your pick wins.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]/50 block mb-1.5">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]/30 pointer-events-none" />
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Johnson" required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#121821] border border-[#253241] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/20 outline-none"
                      onFocus={e => (e.target.style.borderColor = `${pool.accent}55`)}
                      onBlur={e => (e.target.style.borderColor = '#253241')} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]/50 block mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]/30 pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#121821] border border-[#253241] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/20 outline-none"
                      onFocus={e => (e.target.style.borderColor = `${pool.accent}55`)}
                      onBlur={e => (e.target.style.borderColor = '#253241')} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#94A3B8]/30">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                We never share your data. Email is only used for prize notifications.
              </div>
              <button type="submit" disabled={!name.trim() || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[13px] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ background: pool.accent, color: '#0B0F14' }}>
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 'wallet' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[17px] font-black text-[#F8FAFC]">Choose your wallet 💰</h2>
                <p className="text-[12px] text-[#94A3B8]/55 mt-1">Select a wallet to lock in your prediction.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {WALLETS.map(w => {
                  const isThisConnecting = connectingWallet === w.name;
                  const disabled = !!connectingWallet;
                  return (
                    <button key={w.name} onClick={() => !disabled && handleWalletSelect(w.name)} disabled={disabled}
                      className={cn('relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border text-center transition-all duration-200',
                        isThisConnecting ? 'border-opacity-60 shadow-lg' : disabled ? 'bg-[#121821] border-[#1E2A38] opacity-30 cursor-not-allowed' : 'bg-[#121821] border-[#1E2A38] hover:bg-[#18212B] hover:border-[#2E3D50] cursor-pointer')}
                      style={isThisConnecting ? { background: `${w.color}08`, borderColor: `${w.color}55` } : undefined}>
                      {w.popular && !connectingWallet && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider bg-[#00DFA9] text-[#0B0F14] px-2 py-[2px] rounded-full whitespace-nowrap">Popular</span>
                      )}
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${w.color}12`, border: `1.5px solid ${w.color}28` }}>
                        {isThisConnecting ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: w.color }} /> : w.logo}
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[13px] font-bold text-[#F8FAFC] truncate">{w.name}</p>
                        <p className="text-[10px] text-[#94A3B8]/55 mt-0.5 truncate">{isThisConnecting ? 'Connecting…' : w.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
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

// ─── Weekly challenge: wallet connect modal ───────────────────────────────────

function WeeklyWalletModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const { connect, isConnected } = useWallet();
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  async function handleWalletSelect(wName: string) {
    setConnectingWallet(wName);
    await connect(wName);
    setConnectingWallet(null);
    setTimeout(onConfirm, 150);
  }

  useEffect(() => {
    if (!isConnected || connectingWallet) return;
    const t = setTimeout(onConfirm, 200);
    return () => clearTimeout(t);
  }, [isConnected, connectingWallet, onConfirm]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-[400px] bg-[#0D1117] border border-[#253241] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #00DFA9 0%, #00DFA940 60%, transparent 100%)' }} />
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#1E2A38] flex items-center justify-center text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="px-6 pt-5 pb-6 space-y-5">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#00DFA9]/12 flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-[#00DFA9]" />
            </div>
            <h2 className="text-[17px] font-black text-[#F8FAFC]">Connect to submit 🏆</h2>
            <p className="text-[12px] text-[#94A3B8]/55 mt-1">Link your wallet to lock in your Weekly Challenge picks and become eligible for prizes.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {WALLETS.map(w => {
              const isThisConnecting = connectingWallet === w.name;
              const disabled = !!connectingWallet;
              return (
                <button key={w.name} onClick={() => !disabled && handleWalletSelect(w.name)} disabled={disabled}
                  className={cn('relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border text-center transition-all duration-200',
                    isThisConnecting ? 'shadow-lg' : disabled ? 'bg-[#121821] border-[#1E2A38] opacity-30 cursor-not-allowed' : 'bg-[#121821] border-[#1E2A38] hover:bg-[#18212B] hover:border-[#2E3D50] cursor-pointer')}
                  style={isThisConnecting ? { background: `${w.color}08`, borderColor: `${w.color}55` } : undefined}>
                  {w.popular && !connectingWallet && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider bg-[#00DFA9] text-[#0B0F14] px-2 py-[2px] rounded-full whitespace-nowrap">Popular</span>
                  )}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${w.color}12`, border: `1.5px solid ${w.color}28` }}>
                    {isThisConnecting ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: w.color }} /> : w.logo}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-[13px] font-bold text-[#F8FAFC] truncate">{w.name}</p>
                    <p className="text-[10px] text-[#94A3B8]/55 mt-0.5 truncate">{isThisConnecting ? 'Connecting…' : w.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#94A3B8]/30">
            <ShieldCheck className="h-3 w-3 shrink-0 text-[#00DFA9]/40" />
            Non-custodial &amp; encrypted — we never hold your funds
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Match pick card (Weekly Challenge) ──────────────────────────────────────

type PickValue = 'home' | 'draw' | 'away';

function MatchPickCard({
  cm, pick, locked, onPick, index,
}: {
  cm: ChallengeMatch; pick: PickValue | null; locked: boolean;
  onPick: (v: PickValue) => void; index: number;
}) {
  const { match, leagueName } = cm;
  const hasDraw = !!match.odds.draw;

  const options: { key: PickValue; label: string; sub: string; odds: number }[] = [
    { key: 'home', label: '1', sub: match.team1, odds: match.odds.home },
    ...(hasDraw ? [{ key: 'draw' as PickValue, label: 'X', sub: 'Draw', odds: match.odds.draw! }] : []),
    { key: 'away', label: '2', sub: match.team2, odds: match.odds.away },
  ];

  return (
    <div className={cn(
      'relative rounded-2xl bg-[#121821] border overflow-hidden transition-all duration-200',
      pick ? 'border-[#00DFA9]/30' : 'border-[#253241]',
    )}>
      {/* Top accent line */}
      <div className="h-[2px] w-full" style={{
        background: pick
          ? 'linear-gradient(90deg, #00DFA9 0%, #00DFA940 60%, transparent 100%)'
          : 'linear-gradient(90deg, #253241 0%, transparent 100%)',
      }} />

      <div className="p-4 sm:p-5">
        {/* Match header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-[#1E2A38] flex items-center justify-center text-[10px] font-black text-[#94A3B8]/50 shrink-0">
              {index + 1}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#94A3B8]/40 truncate">{leagueName}</p>
              <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">
                {match.team1} <span className="text-[#94A3B8]/35">vs</span> {match.team2}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {pick ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/25">
                <CheckCircle2 className="h-3 w-3 text-[#00DFA9]" />
                <span className="text-[9px] font-black uppercase tracking-wider text-[#00DFA9]">Picked</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1E2A38]/60 border border-[#1E2A38]">
                <Target className="h-3 w-3 text-[#94A3B8]/35" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]/35">Pick</span>
              </div>
            )}
            {match.kickoffTime && (
              <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/35">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{match.kickoffTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pick buttons */}
        <div className={cn('grid gap-2', hasDraw ? 'grid-cols-3' : 'grid-cols-2')}>
          {options.map(opt => {
            const isSelected = pick === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => !locked && onPick(opt.key)}
                disabled={locked}
                className={cn(
                  'relative flex flex-col items-center py-3 px-2 rounded-xl border transition-all duration-150',
                  locked ? 'cursor-default' : 'cursor-pointer active:scale-[0.97]',
                  isSelected
                    ? 'bg-[#00DFA9]/12 border-[#00DFA9]/50 shadow-[0_0_16px_rgba(0,223,169,0.12)]'
                    : locked
                      ? 'bg-[#121821] border-[#1E2A38]/50 opacity-60'
                      : 'bg-[#0D1117] border-[#1E2A38] hover:border-[#253241] hover:bg-[#121821]',
                )}
              >
                {/* Label: 1 / X / 2 */}
                <span className={cn(
                  'text-[11px] font-black tracking-wider mb-1',
                  isSelected ? 'text-[#00DFA9]' : 'text-[#94A3B8]/50',
                )}>
                  {opt.label}
                </span>

                {/* Team / Draw name */}
                <span className={cn(
                  'text-[10px] font-semibold text-center leading-tight line-clamp-1 w-full',
                  isSelected ? 'text-[#F8FAFC]' : 'text-[#94A3B8]/60',
                )}>
                  {opt.sub}
                </span>

                {/* Odds */}
                <span className={cn(
                  'mt-1.5 text-[12px] font-black tabular-nums',
                  isSelected ? 'text-[#00DFA9]' : 'text-[#64748B]',
                )}>
                  {fmtOdds(opt.odds)}
                </span>

                {/* Selected indicator dot */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.8)]" />
                )}

                {/* Locked icon */}
                {locked && isSelected && (
                  <div className="absolute bottom-1.5 right-1.5">
                    <Lock className="h-2.5 w-2.5 text-[#00DFA9]/60" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Kickoff time row on mobile */}
        {match.kickoffTime && (
          <p className="sm:hidden mt-3 text-[10px] text-[#94A3B8]/30 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {match.kickoffTime}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Weekly Challenge section ─────────────────────────────────────────────────

function WeeklyChallenge() {
  const { allLeagues, loading, refresh } = useOddsData();
  const { isConnected } = useWallet();
  const { toast } = useToast();

  const [weeklyState, setWeeklyState] = useState<WeeklyState>(loadWeeklyState);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const challengeMatches = useMemo(() => selectChallengeMatches(allLeagues), [allLeagues]);

  const firstMatchIso = challengeMatches[0]?.match.commenceIso;
  const countdown = useCountdown(firstMatchIso);
  const isLocked = weeklyState.submitted;

  const currentWeekId = getCurrentWeekId();
  const weekLabel = (() => {
    const parts = currentWeekId.split('-W');
    return `第 ${parts[1]} 周，${parts[0]}`;
  })();

  useEffect(() => {
    localStorage.setItem(LS_KEY_WEEKLY, JSON.stringify(weeklyState));
  }, [weeklyState]);

  function handlePick(matchId: string, value: PickValue) {
    if (isLocked) return;
    setWeeklyState(prev => ({
      ...prev,
      picks: { ...prev.picks, [matchId]: value },
    }));
  }

  function handleSubmit() {
    if (challengeMatches.length === 0) return;
    if (!isConnected) {
      setShowWalletModal(true);
      return;
    }
    confirmSubmit();
  }

  function confirmSubmit() {
    setShowWalletModal(false);
    setWeeklyState(prev => ({ ...prev, submitted: true }));
    toast({
      title: '🏆 Picks submitted!',
      description: 'Your Weekly Challenge picks are locked in. Good luck!',
    });
  }

  const pickedCount = challengeMatches.filter(cm => weeklyState.picks[cm.match.id]).length;
  const allPicked = pickedCount === challengeMatches.length && challengeMatches.length > 0;

  // Loading skeleton
  if (loading && allLeagues.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#121821] border border-[#1E2A38] p-6 flex items-center justify-center gap-3 text-[#94A3B8]/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading upcoming matches…</span>
        </div>
      </div>
    );
  }

  // No soccer matches available
  if (challengeMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1E2A38]/60 flex items-center justify-center">
          <Calendar className="h-6 w-6 text-[#94A3B8]/30" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-[#94A3B8]/50">No upcoming matches available</p>
          <p className="text-[12px] text-[#94A3B8]/30 mt-1 max-w-xs mx-auto">Odds for the next round haven't been published yet. Check back soon.</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E2A38] border border-[#253241] text-[#94A3B8]/60 text-[12px] font-semibold hover:text-[#F8FAFC] hover:border-[#00DFA9]/30 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      {showWalletModal && (
        <WeeklyWalletModal onConfirm={confirmSubmit} onClose={() => setShowWalletModal(false)} />
      )}

      {/* Round info strip */}
      <div className="relative rounded-2xl bg-[#121821] border border-[#1E2A38] overflow-hidden mb-6">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 30%, #00DFA910 0%, transparent 55%)' }} />
        <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Prize */}
            <div className="flex flex-col items-center px-4 py-2.5 rounded-xl bg-[#00DFA9]/8 border border-[#00DFA9]/18">
              <p className="text-[18px] font-black text-[#00DFA9] leading-none">5,000</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#00DFA9]/50 mt-0.5">USDT Prize</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[#FACC15]" />
                <span className="text-[13px] font-black text-[#F8FAFC]">{weekLabel}</span>
                {isLocked && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00DFA9]/15 border border-[#00DFA9]/30 text-[9px] font-black uppercase tracking-wider text-[#00DFA9]">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Entered
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#94A3B8]/45">
                {challengeMatches.length}{' matches'} · Pick H/X/A for each · Shared prize pool
              </p>
            </div>
          </div>

          {/* Right side: countdown or participants */}
          <div className="flex items-center gap-4 shrink-0">
            {firstMatchIso && countdown && !isLocked && (
              <div className="text-right">
                <p className="text-[10px] text-[#94A3B8]/35 font-semibold uppercase tracking-wider">First kickoff in</p>
                <p className="text-[15px] font-black text-[#FACC15] font-mono tabular-nums">{countdown}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] text-[#94A3B8]/35 font-semibold uppercase tracking-wider">This week</p>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-[#38BDF8]" />
                <p className="text-[15px] font-black text-[#F8FAFC]">2,847</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {!isLocked && (
          <div className="px-4 sm:px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[#94A3B8]/40">{pickedCount} of {challengeMatches.length} matches picked</span>
              <span className="text-[10px] font-black text-[#00DFA9]">{challengeMatches.length > 0 ? Math.round(pickedCount / challengeMatches.length * 100) : 0}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1E2A38] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${challengeMatches.length > 0 ? (pickedCount / challengeMatches.length) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #00DFA9, #38BDF8)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submitted banner */}
      {isLocked && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#00DFA9]/8 border border-[#00DFA9]/25 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#00DFA9]/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-[#00DFA9]" />
          </div>
          <div>
            <p className="text-[13px] font-black text-[#00DFA9]">Your picks are locked in!</p>
            <p className="text-[11px] text-[#94A3B8]/50 mt-0.5">Results will be announced after all matches in this round are settled.</p>
          </div>
        </div>
      )}

      {/* Match cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {challengeMatches.map((cm, i) => (
          <MatchPickCard
            key={cm.match.id}
            cm={cm}
            pick={weeklyState.picks[cm.match.id] ?? null}
            locked={isLocked}
            onPick={v => handlePick(cm.match.id, v)}
            index={i}
          />
        ))}
      </div>

      {/* Submit CTA */}
      {!isLocked && (
        <div className="relative">
          <button
            onClick={handleSubmit}
            disabled={!allPicked}
            className={cn(
              'w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-[15px] transition-all duration-200',
              allPicked
                ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_4px_32px_rgba(0,223,169,0.35)] hover:shadow-[0_4px_40px_rgba(0,223,169,0.5)] active:scale-[0.98]'
                : 'bg-[#1E2A38]/60 text-[#94A3B8]/25 cursor-not-allowed border border-[#253241]/50',
            )}
          >
            {allPicked ? (
              <>
                <Trophy className="h-5 w-5" />
                Submit All Picks — Enter Challenge
              </>
            ) : (
              <>
                <Target className="h-5 w-5" />
                Pick all {challengeMatches.length} matches to submit ({pickedCount}/{challengeMatches.length})
              </>
            )}
          </button>

          {allPicked && !isConnected && (
            <p className="text-center text-[10px] text-[#94A3B8]/35 mt-2">
              You'll be asked to connect your wallet when you submit.
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ─── Outright pool card ───────────────────────────────────────────────────────

function PoolCard({ pool, userPick, onPickClick }: {
  pool: Pool; userPick: string | null; onPickClick: (poolId: string, optionId: string) => void;
}) {
  const totalVotes = pool.options.reduce((s, o) => s + o.votes, 0) + (userPick ? 1 : 0);

  return (
    <div className={cn(
      'group relative flex flex-col rounded-2xl bg-[#121821] border overflow-hidden transition-all duration-200',
      pool.status === 'open' ? 'border-[#253241] hover:border-[#2D3E50]' : 'border-[#1E2A38] opacity-75',
    )}>
      <div className="h-[2px] w-full shrink-0" style={{ background: `linear-gradient(90deg, ${pool.accent} 0%, ${pool.accent}50 50%, transparent 100%)` }} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm">{pool.sportEmoji}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/40">{pool.sport}</span>
              {pool.status === 'settled' && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-[2px] rounded bg-[#94A3B8]/10 text-[#94A3B8]/45">Settled</span>
              )}
              {pool.status === 'open' && !userPick && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-[2px] rounded border animate-pulse"
                  style={{ background: `${pool.accent}10`, color: pool.accent, borderColor: `${pool.accent}30` }}>
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
          <div className="shrink-0 flex flex-col items-center px-3 py-2 rounded-xl" style={{ background: `${pool.accent}10`, border: `1px solid ${pool.accent}22` }}>
            <p className="text-[13px] font-black leading-none" style={{ color: pool.accent }}>{pool.prizePool}</p>
            <p className="text-[8px] font-semibold uppercase tracking-widest text-[#94A3B8]/40 mt-0.5">prize</p>
          </div>
        </div>

        <div className="space-y-1.5 flex-1">
          {pool.options.map(option => {
            const myVotes = option.votes + (userPick === option.id ? 1 : 0);
            const pct = totalVotes > 0 ? Math.round((myVotes / totalVotes) * 100) : 0;
            const isPicked = userPick === option.id;
            const isWinner = pool.status === 'settled' && pool.winnerOptionId === option.id;
            const isWrongPick = pool.status === 'settled' && isPicked && !isWinner;

            return (
              <button key={option.id}
                onClick={() => pool.status === 'open' && onPickClick(pool.id, option.id)}
                disabled={pool.status === 'settled'}
                className={cn('w-full relative rounded-lg overflow-hidden text-left transition-all duration-150',
                  pool.status === 'open' ? 'cursor-pointer hover:brightness-110 active:scale-[0.99]' : 'cursor-default')}>
                <div className="absolute inset-0 rounded-lg transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: isWinner ? `${pool.accent}22` : isPicked ? `${pool.accent}15` : 'rgba(37,50,65,0.45)' }} />
                <div className={cn('relative flex items-center justify-between px-3 py-2.5 border rounded-lg', isWrongPick ? 'opacity-35' : '')}
                  style={{ borderColor: isWinner ? `${pool.accent}70` : isPicked ? `${pool.accent}50` : 'transparent', background: 'rgba(18,24,33,0.7)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    {(isPicked || isWinner) && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: pool.accent }} />}
                    <span className={cn('text-[12px] font-semibold truncate', isWinner && 'font-black')}
                      style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#CBD5E1' }}>
                      {option.label}
                      {isWinner && <span className="ml-1.5 text-[8px] font-black uppercase tracking-widest opacity-60"> Winner</span>}
                    </span>
                  </div>
                  <span className="text-[11px] font-black tabular-nums shrink-0 ml-3"
                    style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#64748B' }}>
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1E2A38]/70">
          <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
            <Users className="h-3 w-3" />
            <span>{pool.totalPicks.toLocaleString()} predictions</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#475569]">
            <Clock className="h-3 w-3" />
            <span>{pool.status === 'settled' ? 'Closed' : `Closes in ${pool.closesLabel}`}</span>
          </div>
        </div>

        {userPick && pool.status === 'open' && (
          <div className="rounded-xl px-3 py-2.5 text-[11px] font-semibold flex items-center gap-2"
            style={{ background: `${pool.accent}0E`, color: pool.accent, border: `1px solid ${pool.accent}22` }}>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Your prediction is locked in! We'll notify you when results are announced.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TopTab = 'weekly' | 'outright';

export function PredictionPools() {
  const [topTab, setTopTab] = useState<TopTab>('weekly');
  const [outrightCategory, setOutrightCategory] = useState<OutrightCategory>('All');

  const [outrightPicks, setOutrightPicks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_OUTRIGHT_PICKS) ?? '{}'); }
    catch { return {}; }
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_OUTRIGHT_PROFILE) ?? 'null'); }
    catch { return null; }
  });
  const [pendingPick, setPendingPick] = useState<{ poolId: string; optionId: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem(LS_KEY_OUTRIGHT_PICKS, JSON.stringify(outrightPicks)); }, [outrightPicks]);
  useEffect(() => { if (profile) localStorage.setItem(LS_KEY_OUTRIGHT_PROFILE, JSON.stringify(profile)); }, [profile]);

  function handleOutrightPickClick(poolId: string, optionId: string) {
    setPendingPick({ poolId, optionId });
  }

  function handleOutrightConfirm() {
    if (!pendingPick) return;
    const pool   = POOLS.find(p => p.id === pendingPick.poolId);
    const option = pool?.options.find(o => o.id === pendingPick.optionId);
    setOutrightPicks(prev => ({ ...prev, [pendingPick.poolId]: pendingPick.optionId }));
    setPendingPick(null);
    setTimeout(() => {
      toast({ title: '🎯 Prediction locked in!', description: `You picked "${option?.label ?? ''}" — good luck!` });
    }, 0);
  }

  const visiblePools = outrightCategory === 'All'
    ? POOLS.filter(p => p.status === 'open')
    : outrightCategory === 'Settled'
      ? POOLS.filter(p => p.status === 'settled')
      : POOLS.filter(p => p.category === outrightCategory && p.status === 'open');

  const pendingPool = pendingPick ? POOLS.find(p => p.id === pendingPick.poolId) : null;

  const totalPrize = POOLS.filter(p => p.status === 'open').reduce((s, p) => {
    return s + parseFloat(p.prizePool.replace(/[^0-9.]/g, ''));
  }, 0) + 5000; // +5000 for weekly challenge

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-14 xl:pb-0">
      <Header />

      {/* Outright pool entry modal */}
      {pendingPick && pendingPool && (
        <EntryModal
          pool={pendingPool}
          optionId={pendingPick.optionId}
          profile={profile}
          onSaveProfile={p => setProfile(p)}
          onConfirm={handleOutrightConfirm}
          onClose={() => setPendingPick(null)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero ───────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden mb-7 bg-[#121821] border border-[#1E2A38]">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 30%, #00DFA920 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, #38BDF815 0%, transparent 50%)' }} />
          <div className="relative px-6 sm:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-[#00DFA9]/12 border border-[#00DFA9]/25 px-3 py-1 rounded-full">
                  <Target className="h-3 w-3 text-[#00DFA9]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#00DFA9]">Free to Play · No Stake Required</span>
                </div>
                <h1 className="text-[28px] sm:text-3xl font-black tracking-tight text-[#F8FAFC]">Predict &amp; Win</h1>
                <p className="text-[#94A3B8]/65 text-[13px] max-w-sm leading-relaxed">
                  Pick match outcomes from live odds or predict season-long winners. Win a share of the prize pool — completely free.
                </p>
              </div>
              <div className="flex gap-5 sm:gap-7 shrink-0">
                <div className="text-center space-y-0.5">
                  <p className="text-[22px] font-black text-[#00DFA9]">{totalPrize.toLocaleString()} USDT</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/45">In prizes</p>
                </div>
                <div className="w-px bg-[#1E2A38] self-stretch" />
                <div className="text-center space-y-0.5">
                  <p className="text-[22px] font-black text-[#F8FAFC]">{POOLS.filter(p => p.status === 'open').length + 1}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/45">Pools open</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { icon: <Users className="h-3.5 w-3.5" />, label: 'Community picks', value: '84,290+', color: '#00DFA9' },
                { icon: <Trophy className="h-3.5 w-3.5" />, label: 'Winners paid out', value: '1,204', color: '#FACC15' },
                { icon: <Star className="h-3.5 w-3.5" />, label: 'Best accuracy', value: '78%', color: '#38BDF8' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 sm:gap-2.5 rounded-xl bg-[#0B0F14]/50 border border-[#1E2A38] px-3 sm:px-4 py-3">
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <div>
                    <p className="text-[12px] sm:text-[13px] font-black text-[#F8FAFC]">{s.value}</p>
                    <p className="text-[9px] text-[#94A3B8]/45 hidden sm:block">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Top-level tabs ──────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 p-1 rounded-xl bg-[#121821] border border-[#1E2A38] w-fit">
          {([
            { key: 'weekly'   as TopTab, label: '⚡ Weekly Challenge', sub: 'Real match picks' },
            { key: 'outright' as TopTab, label: '🏆 Outright Pools',   sub: 'Season predictions' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setTopTab(tab.key)}
              className={cn(
                'flex flex-col items-center px-4 sm:px-6 py-2.5 rounded-lg text-center transition-all duration-200',
                topTab === tab.key
                  ? 'bg-[#00DFA9] shadow-[0_2px_12px_rgba(0,223,169,0.3)]'
                  : 'hover:bg-[#1E2A38]',
              )}
            >
              <span className={cn('text-[12px] sm:text-[13px] font-black', topTab === tab.key ? 'text-[#0B0F14]' : 'text-[#F8FAFC]')}>{tab.label}</span>
              <span className={cn('text-[9px] font-medium', topTab === tab.key ? 'text-[#0B0F14]/60' : 'text-[#94A3B8]/35')}>{tab.sub}</span>
            </button>
          ))}
        </div>

        {/* ── Weekly Challenge tab ────────────────────────────── */}
        {topTab === 'weekly' && <WeeklyChallenge />}

        {/* ── Outright Pools tab ──────────────────────────────── */}
        {topTab === 'outright' && (
          <>
            {/* How to play */}
            <div className="mb-7 rounded-2xl overflow-hidden border border-[#253241] bg-[#121821]">
              <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[#253241] bg-[#0D1117]/60">
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#00DFA9]/15">
                  <Star className="h-3.5 w-3.5 text-[#00DFA9]" />
                </div>
                <span className="text-sm font-black text-[#F8FAFC]">How it works</span>
                <span className="text-[10px] text-[#94A3B8]/35 font-medium">— 4 easy steps, free to enter</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#1E2A38]">
                {[
                  { num: '1', emoji: '🎯', title: 'Choose a prediction', desc: 'Browse open pools. Pick the option you think will win.', color: '#00DFA9' },
                  { num: '2', emoji: '📝', title: 'Enter name & email', desc: 'Quick form — used to notify you if your prediction wins.', color: '#38BDF8' },
                  { num: '3', emoji: '💼', title: 'Connect your wallet', desc: 'Link any Web3 wallet so we can send you winnings instantly.', color: '#FACC15' },
                  { num: '4', emoji: '🏆', title: 'Win real money', desc: 'Correct picks share the prize pool. Paid within 24 h.', color: '#F97316' },
                ].map(s => (
                  <div key={s.num} className="p-5 flex flex-col gap-3 hover:bg-[#0D1117]/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                        style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}28` }}>
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 border-t border-[#1E2A38] bg-[#0D1117]/40">
                {['Free to enter', 'No experience needed', 'One pick per question', 'Wallet required to win'].map((t, i) => (
                  <span key={t} className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/40">
                    <span style={{ color: ['#00DFA9', '#38BDF8', '#FACC15', '#F97316'][i] }}>✓</span>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Category chips */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {OUTRIGHT_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setOutrightCategory(cat)}
                  className={cn('px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                    outrightCategory === cat
                      ? 'bg-[#00DFA9] text-[#0B0F14] border-[#00DFA9]'
                      : 'bg-[#121821] text-[#94A3B8]/55 border-[#1E2A38] hover:border-[#253241] hover:text-[#94A3B8]/80')}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Pool cards */}
            {visiblePools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visiblePools.map(pool => (
                  <PoolCard key={pool.id} pool={pool} userPick={outrightPicks[pool.id] ?? null} onPickClick={handleOutrightPickClick} />
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
          </>
        )}

        {/* ── Leaderboard ─────────────────────────────────────── */}
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="h-4 w-4 text-[#F97316]" />
            <h2 className="text-[15px] font-black text-[#F8FAFC]">Top Predictors</h2>
            <span className="text-[10px] text-[#94A3B8]/35 ml-1">All-time leaderboard</span>
          </div>
          <div className="rounded-2xl bg-[#121821] border border-[#1E2A38] overflow-hidden">
            <div className="grid grid-cols-[36px_1fr_60px_60px_90px] sm:grid-cols-[36px_1fr_72px_72px_100px] px-4 sm:px-5 py-2.5 border-b border-[#1E2A38]">
              {['#', 'Player', 'Correct', 'Total', 'Winnings'].map(h => (
                <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/30">{h}</span>
              ))}
            </div>
            {LEADERBOARD.map((entry, i) => {
              const accuracy = Math.round((entry.correct / entry.total) * 100);
              return (
                <div key={entry.rank}
                  className={cn(
                    'grid grid-cols-[36px_1fr_60px_60px_90px] sm:grid-cols-[36px_1fr_72px_72px_100px] items-center px-4 sm:px-5 py-3 transition-colors',
                    i < LEADERBOARD.length - 1 ? 'border-b border-[#1E2A38]/60' : '',
                    i < 3 ? 'bg-[#00DFA9]/[0.025]' : 'hover:bg-[#1E2A38]/30',
                  )}>
                  <span className="text-sm font-black">
                    {entry.badge ?? <span className="text-[12px] font-bold text-[#94A3B8]/40">{entry.rank}</span>}
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-semibold text-[#F8FAFC] truncate pr-2">{entry.name}</span>
                  <span className="text-[12px] sm:text-[13px] font-black text-[#00DFA9]">{entry.correct}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[12px] sm:text-[13px] font-semibold text-[#94A3B8]/60">{entry.total}</span>
                    <span className="text-[9px] text-[#94A3B8]/30 hidden sm:inline">{accuracy}%</span>
                  </div>
                  <span className="text-[11px] sm:text-[13px] font-black text-[#FACC15]">{entry.winnings}</span>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
