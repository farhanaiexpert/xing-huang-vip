import { useState, useRef, useEffect } from 'react';
import { Lock, ChevronRight, Zap, Star, Clock } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { ConnectWalletModal } from './ConnectWalletModal';
import { cn } from '../lib/utils';

// ── Wheel config ───────────────────────────────────────────────────────────────

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
  const gRef = useRef<SVGGElement>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(0.012); // deg per ms at idle
  const lastRef  = useRef<number | null>(null);
  const rafRef   = useRef<number>(0);
  const hovered  = useRef(false);

  useEffect(() => {
    function frame(ts: number) {
      if (lastRef.current === null) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;

      const target = hovered.current ? 0.18 : 0.010;
      speedRef.current += (target - speedRef.current) * 0.04;
      angleRef.current = (angleRef.current + speedRef.current * dt) % 360;

      if (gRef.current) {
        gRef.current.setAttribute('transform', `rotate(${angleRef.current}, ${CX}, ${CY})`);
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg
      viewBox="0 0 280 280"
      width="280"
      height="280"
      className="select-none"
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; }}
      style={{ filter: 'drop-shadow(0 0 28px rgba(0,223,169,0.25))' }}
    >
      <defs>
        <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1E2D3D" />
          <stop offset="100%" stopColor="#0D1520" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer glow ring */}
      <circle cx={CX} cy={CY} r={R_OUTER + 6} fill="none"
        stroke="rgba(0,223,169,0.18)" strokeWidth="6" />
      <circle cx={CX} cy={CY} r={R_OUTER + 12} fill="none"
        stroke="rgba(0,223,169,0.06)" strokeWidth="4" />

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
                stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
              {/* Segment label text */}
              <text
                x={ip.x} y={ip.y - 5}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" fontWeight="700" fill={seg.light ? '#0B0F14' : '#94A3B8'}
                transform={`rotate(${mid}, ${ip.x}, ${ip.y})`}
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {seg.label}
              </text>
            </g>
          );
        })}

        {/* Separator lines */}
        {SEGMENTS.map((_, i) => {
          const angle = i * 45;
          const inner = { x: CX + R_INNER * Math.cos(toRad(angle)), y: CY + R_INNER * Math.sin(toRad(angle)) };
          const outer = { x: CX + R_OUTER * Math.cos(toRad(angle)), y: CY + R_OUTER * Math.sin(toRad(angle)) };
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />;
        })}
      </g>

      {/* Center hub */}
      <circle cx={CX} cy={CY} r={R_INNER} fill="url(#hubGrad)"
        stroke="rgba(0,223,169,0.3)" strokeWidth="2" />
      <text x={CX} y={CY - 5} textAnchor="middle" fontSize="16" fill={isConnected ? '#00DFA9' : '#94A3B8'}>
        {isConnected ? '✦' : '🔒'}
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize="6.5" fontWeight="700"
        fill={isConnected ? '#00DFA9' : '#4B5C6B'}
        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.05em' }}>
        {isConnected ? 'UNLOCKED' : 'LOCKED'}
      </text>

      {/* Pointer triangle at top */}
      <polygon
        points={`${CX - 8},${CY - R_OUTER - 16} ${CX + 8},${CY - R_OUTER - 16} ${CX},${CY - R_OUTER - 2}`}
        fill="#00DFA9"
        style={{ filter: 'drop-shadow(0 0 4px rgba(0,223,169,0.6))' }}
      />
    </svg>
  );
}

// ── Challenge card ─────────────────────────────────────────────────────────────

interface ChallengeCardProps {
  icon: string;
  title: string;
  desc: string;
  reward: string;
  rewardColor: string;
  startsIn: string;
  locked: boolean;
}

function ChallengeCard({ icon, title, desc, reward, rewardColor, startsIn, locked }: ChallengeCardProps) {
  return (
    <div
      className="shrink-0 w-[200px] flex flex-col rounded-xl overflow-hidden select-none group cursor-pointer"
      style={{
        background: 'linear-gradient(160deg,#18212B 0%,#111820 100%)',
        border: '1px solid #253241',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => {
        if (locked) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = rewardColor + '55';
        el.style.boxShadow   = `0 8px 32px ${rewardColor}18`;
        el.style.transform   = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
        el.style.transform   = '';
      }}
    >
      {/* Color stripe */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg,${rewardColor},transparent)` }} />

      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        {/* Icon + reward badge */}
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

        {/* Title + desc */}
        <div className="flex-1">
          <p className="text-[12px] font-bold text-[#F8FAFC] leading-tight">{title}</p>
          <p className="text-[10.5px] text-[#94A3B8]/60 leading-snug mt-1">{desc}</p>
        </div>

        {/* Timer */}
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
  {
    icon: '⚽', title: 'Weekend WinSpin Challenge',
    desc: 'Predict 3 correct football matches',
    reward: '5x', rewardColor: '#00DFA9', startsIn: '2d 14h', locked: true,
  },
  {
    icon: '⚡', title: 'Daily Streak Boost',
    desc: 'Win predictions 3 days in a row',
    reward: '2x', rewardColor: '#38BDF8', startsIn: '18h', locked: true,
  },
  {
    icon: '🏀', title: 'High Odds Rush',
    desc: 'Nail 2 high-odds picks correctly',
    reward: '3x', rewardColor: '#F97316', startsIn: '1d 6h', locked: true,
  },
  {
    icon: '🎾', title: 'Tennis Prediction',
    desc: 'Pick the correct set winners',
    reward: '4x', rewardColor: '#A855F7', startsIn: '12h', locked: true,
  },
  {
    icon: '🌟', title: 'Mega Spin Sunday',
    desc: 'All-sports ultimate challenge',
    reward: '10x', rewardColor: '#FACC15', startsIn: '5d 3h', locked: true,
  },
];

// ── Wallet icons ──────────────────────────────────────────────────────────────

const WALLET_ICONS = [
  { name: 'MetaMask',   bg: '#E2761B', letter: 'M' },
  { name: 'Coinbase',   bg: '#0052FF', letter: 'C' },
  { name: 'WalletConnect', bg: '#3B99FC', letter: 'W' },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function WinSpin() {
  const { isConnected } = useWallet();
  const [walletOpen, setWalletOpen] = useState(false);

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden mb-5"
        style={{
          background: 'linear-gradient(135deg, #0D1520 0%, #111C2A 50%, #0B1420 100%)',
          border: '1px solid rgba(0,223,169,0.15)',
          boxShadow: '0 0 60px rgba(0,223,169,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Ambient glow top-right */}
        <div className="absolute top-0 right-0 w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.07) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
        {/* Ambient glow bottom-left */}
        <div className="absolute bottom-0 left-0 w-[240px] h-[240px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', transform: 'translate(-30%,30%)' }} />

        <div className="relative px-5 pt-5 pb-6">

          {/* ── Section header ─────────────────────────────── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              {/* Logo badge */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#00DFA9,#38BDF8)', boxShadow: '0 0 16px rgba(0,223,169,0.4)' }}>
                <Zap className="w-4.5 h-4.5 text-[#0B0F14]" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-black tracking-tight"
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

          {/* ── Main layout: left text + right wheel ─────── */}
          <div className="flex flex-col lg:flex-row gap-6 items-center">

            {/* Left: text + wallet CTA + cards */}
            <div className="flex-1 min-w-0 w-full">
              {/* Headline */}
              <div className="mb-4">
                <h2 className="text-[22px] font-black text-[#F8FAFC] leading-tight mb-1.5">
                  Daily sports challenges
                  <br />
                  <span style={{ background: 'linear-gradient(90deg,#00DFA9 0%,#38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    are coming.
                  </span>
                </h2>
                <p className="text-[12.5px] text-[#94A3B8]/70 leading-relaxed max-w-sm">
                  Spin into boosted sports rewards. Connect your wallet to unlock WinSpin challenges, streak rewards, and boosted opportunities before anyone else.
                </p>
              </div>

              {/* Wallet CTA */}
              {!isConnected ? (
                <div
                  className="rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  style={{ background: 'rgba(0,223,169,0.05)', border: '1px solid rgba(0,223,169,0.18)' }}
                >
                  {/* Wallet icons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {WALLET_ICONS.map(w => (
                      <div key={w.name} title={w.name}
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-[12px] shrink-0"
                        style={{ background: w.bg, boxShadow: `0 0 10px ${w.bg}55` }}>
                        {w.letter}
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] font-bold text-[#F8FAFC] leading-tight">
                      Connect your wallet to unlock WinSpin
                    </p>
                    <p className="text-[10px] text-[#94A3B8]/50 mt-0.5 leading-snug">
                      Be first in line. Exclusive early access for wallet holders.
                    </p>
                  </div>

                  <button
                    onClick={() => setWalletOpen(true)}
                    className="shrink-0 flex items-center gap-2 h-9 px-4 rounded-xl font-bold text-[12px] text-[#0B0F14] transition-all duration-200"
                    style={{
                      background: 'linear-gradient(90deg,#00DFA9,#38BDF8)',
                      boxShadow: '0 0 20px rgba(0,223,169,0.4)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px rgba(0,223,169,0.65)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(0,223,169,0.4)'; }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl p-3.5 mb-4 flex items-center gap-3"
                  style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.25)' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,223,169,0.15)' }}>
                    <Star className="w-4 h-4 text-[#00DFA9]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#00DFA9]">Wallet connected — you're on the list!</p>
                    <p className="text-[10px] text-[#94A3B8]/60">You'll be notified when WinSpin launches.</p>
                  </div>
                </div>
              )}

              {/* Challenge preview cards */}
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-widest mb-2.5">
                  Upcoming Challenges
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1"
                  style={{ scrollbarWidth: 'none' }}>
                  {CHALLENGE_CARDS.map((card, i) => (
                    <ChallengeCard key={i} {...card} locked={!isConnected} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: spinning wheel */}
            <div className="shrink-0 flex flex-col items-center gap-3">
              {/* Reward legend */}
              <div className="flex flex-wrap justify-center gap-1.5 max-w-[260px]">
                {SEGMENTS.filter(s => s.fill !== '#162030').map((seg, i) => (
                  <div key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold"
                    style={{ background: seg.fill + '18', border: `1px solid ${seg.fill}30`, color: seg.fill }}>
                    <span>{seg.icon}</span>
                    <span>{seg.label}</span>
                  </div>
                ))}
              </div>

              {/* Wheel */}
              <div className="relative">
                <SpinWheel isConnected={isConnected} />

                {/* Locked overlay on wheel */}
                {!isConnected && (
                  <div
                    className="absolute inset-0 rounded-full flex flex-col items-center justify-center cursor-pointer"
                    style={{
                      background: 'rgba(11,15,20,0.55)',
                      backdropFilter: 'blur(2px)',
                    }}
                    onClick={() => setWalletOpen(true)}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1.5"
                      style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.3)' }}>
                      <Lock className="w-5 h-5 text-[#00DFA9]" />
                    </div>
                    <p className="text-[11px] font-bold text-[#F8FAFC] text-center px-6 leading-snug">
                      Connect wallet<br />to unlock
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-[#94A3B8]/35 font-medium text-center">
                {isConnected ? 'Wheel launches soon — stay tuned' : 'Hover to preview the wheel'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConnectWalletModal open={walletOpen} onOpenChange={setWalletOpen} />
    </>
  );
}
