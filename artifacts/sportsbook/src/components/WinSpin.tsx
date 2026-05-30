import { useState, useRef, useEffect } from 'react';
import { Lock, ChevronRight, Star, Clock, Shield, Zap, Users, TrendingUp } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { ConnectWalletModal } from './ConnectWalletModal';

// ── Wheel config ───────────────────────────────────────────────────────────────

const WHEEL_ICON = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/wheel-spin.webp';

const PLAYER_AVATARS = [
  'https://api.dicebear.com/7.x/lorelei/svg?seed=carlos&backgroundColor=0a1628',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=yuki&backgroundColor=0a1628',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=dana&backgroundColor=0a1628',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=leo&backgroundColor=0a1628',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=priya&backgroundColor=0a1628',
];

const SEGMENTS = [
  { label: '2x Boost',         icon: '⚡', fill: '#00DFA9', light: true  },
  { label: 'Football Picks',   icon: '⚽', fill: '#162030', light: false },
  { label: 'Tennis Challenge', icon: '🎾', fill: '#38BDF8', light: true  },
  { label: '5x Reward',        icon: '🏆', fill: '#FACC15', light: true  },
  { label: 'Daily Streak',     icon: '🔥', fill: '#162030', light: false },
  { label: 'Lucky Match',      icon: '⭐', fill: '#F97316', light: true  },
  { label: 'High Odds',        icon: '📈', fill: '#162030', light: false },
  { label: 'Mega Spin',        icon: '💎', fill: '#A855F7', light: false },
];

const R_OUTER = 120;
const R_INNER = 34;
const CX = 140, CY = 140;

function toRad(deg: number) { return ((deg - 90) * Math.PI) / 180; }

function wedgePath(startDeg: number, endDeg: number, ro: number, ri: number) {
  const s1 = { x: CX + ro * Math.cos(toRad(startDeg)), y: CY + ro * Math.sin(toRad(startDeg)) };
  const e1 = { x: CX + ro * Math.cos(toRad(endDeg)),   y: CY + ro * Math.sin(toRad(endDeg))   };
  const s2 = { x: CX + ri * Math.cos(toRad(endDeg)),   y: CY + ri * Math.sin(toRad(endDeg))   };
  const e2 = { x: CX + ri * Math.cos(toRad(startDeg)), y: CY + ri * Math.sin(toRad(startDeg)) };
  return `M ${s1.x} ${s1.y} A ${ro} ${ro} 0 0 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${ri} ${ri} 0 0 0 ${e2.x} ${e2.y} Z`;
}

function iconPos(midDeg: number, r = 82) {
  return { x: CX + r * Math.cos(toRad(midDeg)), y: CY + r * Math.sin(toRad(midDeg)) };
}

// ── SVG Wheel ─────────────────────────────────────────────────────────────────

function SpinWheel({ isConnected }: { isConnected: boolean }) {
  const gRef    = useRef<SVGGElement>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(0.010);
  const lastRef  = useRef<number | null>(null);
  const rafRef   = useRef<number>(0);
  const hovered  = useRef(false);

  useEffect(() => {
    function frame(ts: number) {
      if (lastRef.current === null) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;
      const target = hovered.current ? 0.20 : 0.010;
      speedRef.current += (target - speedRef.current) * 0.04;
      angleRef.current = (angleRef.current + speedRef.current * dt) % 360;
      if (gRef.current) gRef.current.setAttribute('transform', `rotate(${angleRef.current}, ${CX}, ${CY})`);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg
      viewBox="0 0 280 280" width="280" height="280"
      className="select-none"
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; }}
      style={{ filter: 'drop-shadow(0 0 32px rgba(0,223,169,0.3)) drop-shadow(0 0 12px rgba(56,189,248,0.15))' }}
    >
      <defs>
        <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1E2D3D" />
          <stop offset="100%" stopColor="#0D1520" />
        </radialGradient>
        <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="70%"  stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,223,169,0.08)" />
        </radialGradient>
      </defs>

      {/* Outer glow rings */}
      <circle cx={CX} cy={CY} r={R_OUTER + 14} fill="none" stroke="rgba(0,223,169,0.06)" strokeWidth="8" />
      <circle cx={CX} cy={CY} r={R_OUTER + 7}  fill="none" stroke="rgba(0,223,169,0.14)" strokeWidth="5" />
      <circle cx={CX} cy={CY} r={R_OUTER + 2}  fill="none" stroke="rgba(0,223,169,0.22)" strokeWidth="2" />

      {/* Rotating group */}
      <g ref={gRef}>
        {SEGMENTS.map((seg, i) => {
          const start = i * 45;
          const end   = start + 45;
          const mid   = start + 22.5;
          const ip    = iconPos(mid);
          return (
            <g key={i}>
              <path d={wedgePath(start, end, R_OUTER, R_INNER)} fill={seg.fill}
                stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
              <text
                x={ip.x} y={ip.y - 5}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="9.5" fontWeight="800" fill={seg.light ? '#0B0F14' : '#94A3B8'}
                transform={`rotate(${mid}, ${ip.x}, ${ip.y})`}
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {seg.label}
              </text>
            </g>
          );
        })}
        {SEGMENTS.map((_, i) => {
          const angle = i * 45;
          const inner = { x: CX + R_INNER * Math.cos(toRad(angle)), y: CY + R_INNER * Math.sin(toRad(angle)) };
          const outer = { x: CX + R_OUTER * Math.cos(toRad(angle)), y: CY + R_OUTER * Math.sin(toRad(angle)) };
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />;
        })}
      </g>

      {/* Center hub */}
      <circle cx={CX} cy={CY} r={R_INNER} fill="url(#hubGrad)"
        stroke={isConnected ? 'rgba(0,223,169,0.5)' : 'rgba(0,223,169,0.25)'} strokeWidth="2.5" />
      {isConnected ? (
        <>
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="15" fill="#00DFA9">✦</text>
          <text x={CX} y={CY + 11} textAnchor="middle" fontSize="6" fontWeight="800"
            fill="#00DFA9" style={{ fontFamily: 'system-ui', letterSpacing: '0.06em' }}>LIVE SOON</text>
        </>
      ) : (
        <>
          <text x={CX} y={CY - 3} textAnchor="middle" fontSize="14" fill="#94A3B8">🔒</text>
          <text x={CX} y={CY + 11} textAnchor="middle" fontSize="6" fontWeight="800"
            fill="#4B5C6B" style={{ fontFamily: 'system-ui', letterSpacing: '0.05em' }}>LOCKED</text>
        </>
      )}

      {/* Pointer */}
      <polygon
        points={`${CX - 9},${CY - R_OUTER - 18} ${CX + 9},${CY - R_OUTER - 18} ${CX},${CY - R_OUTER - 2}`}
        fill="#00DFA9"
        style={{ filter: 'drop-shadow(0 0 6px rgba(0,223,169,0.8))' }}
      />
    </svg>
  );
}

// ── Challenge card ─────────────────────────────────────────────────────────────

interface ChallengeCardProps {
  icon: string; title: string; desc: string;
  reward: string; rewardColor: string; startsIn: string; locked: boolean;
}

function ChallengeCard({ icon, title, desc, reward, rewardColor, startsIn, locked }: ChallengeCardProps) {
  return (
    <div
      className="shrink-0 w-[200px] flex flex-col rounded-xl overflow-hidden select-none cursor-pointer"
      style={{
        background: 'linear-gradient(160deg,#18212B 0%,#111820 100%)',
        border: '1px solid #253241',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => {
        if (locked) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = rewardColor + '55';
        el.style.boxShadow   = `0 8px 32px ${rewardColor}1A`;
        el.style.transform   = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
        el.style.transform   = '';
      }}
    >
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg,${rewardColor},transparent)` }} />
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: rewardColor + '18', border: `1px solid ${rewardColor}35` }}>
            {icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.22)' }}>
              COMING SOON
            </span>
            <span className="text-[18px] font-black leading-none tabular-nums" style={{ color: rewardColor }}>
              {reward}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-bold text-[#F8FAFC] leading-tight">{title}</p>
          <p className="text-[10.5px] text-[#94A3B8]/60 leading-snug mt-1">{desc}</p>
        </div>
        <div className="flex items-center gap-1.5 pt-2 border-t border-[#253241]/60">
          <Clock className="w-3 h-3 text-[#94A3B8]/40 shrink-0" />
          <span className="text-[10px] text-[#94A3B8]/50 font-medium">Starts in {startsIn}</span>
          {locked && <Lock className="w-2.5 h-2.5 text-[#94A3B8]/30 ml-auto shrink-0" />}
        </div>
      </div>
    </div>
  );
}

const CHALLENGE_CARDS: ChallengeCardProps[] = [
  { icon: '⚽', title: 'Weekend WinSpin Challenge', desc: 'Predict 3 correct football matches',   reward: '5x',  rewardColor: '#00DFA9', startsIn: '2d 14h', locked: true },
  { icon: '⚡', title: 'Daily Streak Boost',         desc: 'Win predictions 3 days in a row',     reward: '2x',  rewardColor: '#38BDF8', startsIn: '18h',   locked: true },
  { icon: '🏀', title: 'High Odds Rush',              desc: 'Nail 2 high-odds picks correctly',    reward: '3x',  rewardColor: '#F97316', startsIn: '1d 6h', locked: true },
  { icon: '🎾', title: 'Tennis Prediction',           desc: 'Pick the correct set winners',        reward: '4x',  rewardColor: '#A855F7', startsIn: '12h',   locked: true },
  { icon: '🌟', title: 'Mega Spin Sunday',            desc: 'All-sports ultimate challenge',       reward: '10x', rewardColor: '#FACC15', startsIn: '5d 3h', locked: true },
];

// ── Trust badges ───────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  { icon: <Shield className="w-3 h-3" />,     label: 'Provably Fair'     },
  { icon: <Zap className="w-3 h-3" />,        label: 'Instant Payouts'   },
  { icon: <TrendingUp className="w-3 h-3" />, label: 'Up to 10x Rewards' },
];

// ── Live ticker entries ────────────────────────────────────────────────────────

const LIVE_WINS = [
  { user: '0x3f…a1', prize: '5x Reward', sport: '⚽' },
  { user: '0x9c…d4', prize: '2x Boost',  sport: '🏀' },
  { user: '0x7e…b2', prize: 'Mega Spin', sport: '🌟' },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function WinSpin() {
  const { isConnected } = useWallet();
  const [walletOpen,  setWalletOpen]  = useState(false);
  const [tickerIdx,   setTickerIdx]   = useState(0);
  const [tickerShow,  setTickerShow]  = useState(true);

  // cycle through fake live win ticker
  useEffect(() => {
    const id = setInterval(() => {
      setTickerShow(false);
      setTimeout(() => {
        setTickerIdx(i => (i + 1) % LIVE_WINS.length);
        setTickerShow(true);
      }, 350);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const win = LIVE_WINS[tickerIdx];

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden mb-5"
        style={{
          background: 'linear-gradient(135deg, #0D1520 0%, #111C2A 50%, #0B1420 100%)',
          border: '1px solid rgba(0,223,169,0.18)',
          boxShadow: '0 0 80px rgba(0,223,169,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.08) 0%, transparent 70%)', transform: 'translate(35%,-35%)' }} />
        <div className="absolute bottom-0 left-0 w-[260px] h-[260px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', transform: 'translate(-35%,35%)' }} />

        <div className="relative px-5 pt-5 pb-6">

          {/* ── Live ticker bar ─────────────────────────────── */}
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2 mb-4"
            style={{ background: 'rgba(0,223,169,0.06)', border: '1px solid rgba(0,223,169,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] shrink-0"
                style={{ animation: 'pulse 1.5s ease-in-out infinite', boxShadow: '0 0 6px rgba(0,223,169,0.8)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#00DFA9]">Live Wins</span>
              <span
                className="text-[11px] font-semibold text-[#F8FAFC] transition-opacity duration-300"
                style={{ opacity: tickerShow ? 1 : 0 }}
              >
                {win.sport} <span className="text-[#94A3B8]/60">Player</span> {win.user} <span className="text-[#94A3B8]/60">just hit</span> <span style={{ color: '#FACC15' }}>{win.prize}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[#94A3B8]/40" />
              <span className="text-[10px] font-bold text-[#94A3B8]/50">1,247 waiting</span>
            </div>
          </div>

          {/* ── Section header ─────────────────────────────── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {/* Wheel image badge */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: 'rgba(0,223,169,0.1)', border: '1px solid rgba(0,223,169,0.25)', boxShadow: '0 0 20px rgba(0,223,169,0.25)' }}>
                <img
                  src={WHEEL_ICON}
                  alt="WinSpin"
                  className="w-8 h-8 object-contain"
                  style={{ animation: 'spinSlow 12s linear infinite' }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[20px] font-black tracking-tight"
                    style={{ background: 'linear-gradient(90deg,#00DFA9,#38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    WinSpin
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.25)' }}>
                    COMING SOON
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8]/60 font-medium leading-none mt-0.5">
                  Predict smart. Win bigger.
                </p>
              </div>
            </div>
            <button className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
              Learn more <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Trust badges ───────────────────────────────── */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {TRUST_BADGES.map((b, i) => (
              <div key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#94A3B8]/60"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-[#00DFA9]/70">{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>

          {/* ── Main layout ────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row gap-6 items-center">

            {/* Left */}
            <div className="flex-1 min-w-0 w-full">
              <div className="mb-4">
                <h2 className="text-[24px] font-black text-[#F8FAFC] leading-tight mb-2">
                  Daily sports challenges
                  <br />
                  <span style={{ background: 'linear-gradient(90deg,#00DFA9 0%,#38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    are coming.
                  </span>
                </h2>
                <p className="text-[12.5px] text-[#94A3B8]/70 leading-relaxed max-w-sm">
                  Spin into boosted sports rewards. Predict outcomes, earn streak multipliers, and climb the leaderboard before anyone else.
                </p>
              </div>

              {/* Wallet CTA */}
              {!isConnected ? (
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: 'rgba(0,223,169,0.05)', border: '1px solid rgba(0,223,169,0.2)' }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Stacked player avatars */}
                    <div className="flex items-center shrink-0">
                      <div className="flex -space-x-2.5">
                        {PLAYER_AVATARS.map((src, i) => {
                          const colors = ['#00DFA9','#38BDF8','#FACC15','#F97316','#A855F7'];
                          const letters = ['K','M','J','R','S'];
                          return (
                            <div key={i}
                              className="w-9 h-9 rounded-full overflow-hidden shrink-0 relative"
                              style={{ border: '2px solid #0D1520', boxShadow: '0 0 8px rgba(0,223,169,0.2)', zIndex: PLAYER_AVATARS.length - i }}>
                              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#0B0F14]"
                                style={{ background: colors[i % colors.length] }}>
                                {letters[i % letters.length]}
                              </div>
                              <img src={src} alt={`player${i + 1}`} className="absolute inset-0 w-full h-full object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                            </div>
                          );
                        })}
                      </div>
                      <span className="ml-2.5 text-[10px] font-bold text-[#94A3B8]/60">+1,247</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#F8FAFC] leading-tight">
                        Connect your wallet to unlock WinSpin
                      </p>
                      <p className="text-[10px] text-[#94A3B8]/50 mt-0.5 leading-snug">
                        Be first in line. Exclusive early access for wallet holders.
                      </p>
                    </div>

                    <button
                      onClick={() => setWalletOpen(true)}
                      className="shrink-0 flex items-center gap-2 h-9 px-4 rounded-xl font-bold text-[12px] text-[#0B0F14] transition-all duration-200"
                      style={{ background: 'linear-gradient(90deg,#00DFA9,#38BDF8)', boxShadow: '0 0 24px rgba(0,223,169,0.45)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(0,223,169,0.7)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(0,223,169,0.45)'; }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Connect Wallet
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl p-3.5 mb-4 flex items-center gap-3"
                  style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.28)' }}
                >
                  <div className="flex -space-x-2.5">
                    {PLAYER_AVATARS.map((src, i) => {
                      const colors = ['#00DFA9','#38BDF8','#FACC15','#F97316','#A855F7'];
                      const letters = ['K','M','J','R','S'];
                      return (
                        <div key={i} className="w-8 h-8 rounded-full overflow-hidden shrink-0 relative"
                          style={{ border: '2px solid #0D1520', zIndex: PLAYER_AVATARS.length - i }}>
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#0B0F14]"
                            style={{ background: colors[i % colors.length] }}>
                            {letters[i % letters.length]}
                          </div>
                          <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#00DFA9]">You're on the early access list!</p>
                    <p className="text-[10px] text-[#94A3B8]/60">You'll be the first to play when WinSpin launches.</p>
                  </div>
                  <Star className="w-4 h-4 text-[#FACC15] ml-auto shrink-0" />
                </div>
              )}

              {/* Challenge cards */}
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-widest mb-2.5">
                  Upcoming Challenges
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                  {CHALLENGE_CARDS.map((card, i) => (
                    <ChallengeCard key={i} {...card} locked={!isConnected} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: wheel */}
            <div className="shrink-0 flex flex-col items-center gap-3">
              {/* Reward legend pills */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-[268px]">
                {SEGMENTS.filter(s => s.fill !== '#162030').map((seg, i) => (
                  <div key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
                    style={{ background: seg.fill + '18', border: `1px solid ${seg.fill}30`, color: seg.fill }}>
                    <span>{seg.icon}</span>
                    <span>{seg.label}</span>
                  </div>
                ))}
              </div>

              {/* Wheel container */}
              <div className="relative">
                {/* Outer glow plate */}
                <div className="absolute inset-[-16px] rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.08) 0%, transparent 70%)' }} />

                <SpinWheel isConnected={isConnected} />

                {/* Wheel icon overlay (bottom-right) */}
                <div className="absolute bottom-3 right-3 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center pointer-events-none"
                  style={{ background: 'rgba(13,21,32,0.85)', border: '1px solid rgba(0,223,169,0.25)', backdropFilter: 'blur(4px)' }}>
                  <img src={WHEEL_ICON} alt="" className="w-6 h-6 object-contain"
                    style={{ animation: 'spinSlow 10s linear infinite' }} />
                </div>

                {/* Locked overlay */}
                {!isConnected && (
                  <div
                    className="absolute inset-0 rounded-full flex flex-col items-center justify-center cursor-pointer"
                    style={{ background: 'rgba(11,15,20,0.55)', backdropFilter: 'blur(2px)' }}
                    onClick={() => setWalletOpen(true)}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1.5"
                      style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.35)' }}>
                      <Lock className="w-5 h-5 text-[#00DFA9]" />
                    </div>
                    <p className="text-[11px] font-bold text-[#F8FAFC] text-center px-6 leading-snug">
                      Connect wallet<br />to unlock
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-[#94A3B8]/35 font-medium text-center">
                {isConnected ? 'Wheel goes live soon — you\'re in early' : 'Hover the wheel for a preview'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <ConnectWalletModal open={walletOpen} onOpenChange={setWalletOpen} />
    </>
  );
}
