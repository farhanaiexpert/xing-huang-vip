import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Zap, Shield, Users, TrendingUp, Star, Gift, PartyPopper } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { api } from '../lib/apiClient';

const IMG_ORIGINAL = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/Promo-Banner.webp';
const IMG_ALT      = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/ronaldo11.webp';

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2.5 + 1.2,
  delay: Math.random() * 5,
  dur: Math.random() * 4 + 5,
  op: Math.random() * 0.35 + 0.08,
  gold: i < 7,
}));

const COINS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: 5 + Math.random() * 90,
  delay: Math.random() * 1.4,
  dur: 1.6 + Math.random() * 1.4,
  size: 14 + Math.random() * 20,
  rot: Math.random() * 360,
  drift: (Math.random() - 0.5) * 80,
}));

function useCounter(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((target * ease).toFixed(2)));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

const AVATARS = [
  'https://i.pravatar.cc/50?img=1',
  'https://i.pravatar.cc/50?img=3',
  'https://i.pravatar.cc/50?img=5',
  'https://i.pravatar.cc/50?img=8',
  'https://i.pravatar.cc/50?img=12',
  'https://i.pravatar.cc/50?img=15',
  'https://i.pravatar.cc/50?img=20',
];

const AVATAR_COLORS = ['#00DFA9','#38BDF8','#FACC15','#F97316','#A855F7','#00DFA9','#38BDF8'];
const AVATAR_LETTERS = ['A','K','M','J','R','S','T'];

const DOT_BG = `radial-gradient(ellipse at 55% 85%, rgba(0,223,169,0.15) 0%, transparent 50%), radial-gradient(ellipse at 20% 20%, rgba(56,189,248,0.1) 0%, transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(250,204,21,0.08) 0%, transparent 40%), linear-gradient(160deg, #0D1825 0%, #081018 100%)`;

const IMG_BASE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'bottom center',
  display: 'block',
  transform: 'scale(0.87)',
  transformOrigin: 'bottom center',
  transition: 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)',
};

export function PromoPopup() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { refreshBalance } = useWallet();

  const [visible,   setVisible]   = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [hovered,    setHovered]    = useState(false);
  const [showAlt,    setShowAlt]    = useState(false);
  const [dismissed,  setDismissed]  = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [barStopped, setBarStopped] = useState(false);

  // Claim state
  const [claiming,       setClaiming]       = useState(false);
  const [claimError,     setClaimError]     = useState('');
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [showCongrats,   setShowCongrats]   = useState(false);

  const initRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counterVal = useCounter(120, showCongrats);

  // Check claimed status on mount (when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<{ claimed: boolean }>('/wallet/bonus/welcome/status')
      .then(r => { if (r.claimed) setAlreadyClaimed(true); })
      .catch(() => { /* silent — don't block popup */ });
  }, [isAuthenticated]);

  // Show popup after 3 s
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Auto-cycle images every 5 s when not hovered
  useEffect(() => {
    if (!visible || hovered) return;
    const t = setInterval(() => setShowAlt(v => !v), 5000);
    return () => clearInterval(t);
  }, [visible, hovered]);

  // Sticky bar loop: appears 600ms after popup close, visible 30s, hidden 15s, repeats
  useEffect(() => {
    if (!dismissed || barStopped) return;
    const schedule = (nextVisible: boolean, delay: number) => {
      loopRef.current = setTimeout(() => {
        setBarVisible(nextVisible);
        schedule(!nextVisible, nextVisible ? 30000 : 15000);
      }, delay);
    };
    initRef.current = setTimeout(() => {
      setBarVisible(true);
      schedule(false, 30000);
    }, 600);
    return () => {
      if (initRef.current) clearTimeout(initRef.current);
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [dismissed, barStopped]);

  function close() {
    if (showCongrats) return;
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      setDismissed(true);
    }, 360);
  }

  const handleClaim = useCallback(async () => {
    setClaimError('');
    if (!isAuthenticated) {
      close();
      window.dispatchEvent(new Event('openLoginModal'));
      return;
    }
    setClaiming(true);
    try {
      await api.post('/wallet/bonus/welcome', {});
      await refreshBalance();
      setAlreadyClaimed(true);
      setShowCongrats(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('already') || msg.includes('409') || msg.includes('ALREADY_CLAIMED')) {
        setAlreadyClaimed(true);
      } else {
        setClaimError(msg || 'Failed to claim bonus. Please try again.');
      }
    } finally {
      setClaiming(false);
    }
  }, [isAuthenticated, refreshBalance, navigate]);

  function dismissBar() {
    setBarStopped(true);
    setBarVisible(false);
    if (initRef.current) clearTimeout(initRef.current);
    if (loopRef.current) clearTimeout(loopRef.current);
  }

  const altVisible = hovered || showAlt;

  // Only show on the homepage
  if (location !== '/') return null;

  // Never show popup or sticky bar if the bonus has already been claimed
  // (allow showCongrats through so the user sees the celebration on successful claim)
  if (alreadyClaimed && !showCongrats) return null;

  // Sticky claim bar — desktop: fixed bottom strip; mobile: slim top notice below header
  const StickyBar = dismissed && !barStopped ? (
    <>
      <style>{`
        @keyframes pCTAPulse { 0%,100%{box-shadow:0 0 18px rgba(0,223,169,.35)} 50%{box-shadow:0 0 30px rgba(0,223,169,.6)} }
        @keyframes pShimmer  { from{transform:translateX(-120%)} to{transform:translateX(120%)} }
      `}</style>

      {/* ── Desktop (xl+): fixed bottom bar ── */}
      <div
        className="hidden xl:flex fixed bottom-0 left-0 right-[260px] z-[9998] items-center justify-between gap-3 px-6 py-3.5"
        style={{
          background: 'linear-gradient(90deg,#061A14 0%,#091820 50%,#061A14 100%)',
          borderTop: '1px solid rgba(0,223,169,0.25)',
          boxShadow: '0 -6px 36px rgba(0,223,169,0.14)',
          transform: barVisible ? 'translateY(0)' : 'translateY(110%)',
          opacity: barVisible ? 1 : 0,
          transition: 'transform 0.55s cubic-bezier(.16,1,.3,1), opacity 0.45s ease',
          pointerEvents: barVisible ? 'all' : 'none',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00DFA9] animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#F8FAFC] leading-tight truncate">
              Connect your crypto wallet &amp; claim <span className="text-[#FACC15]">FREE 120 USDT</span>
            </p>
            <p className="text-[10px] text-[#64748B]">Join 50,000+ players on <span translate="no">CupBett</span> Sports Trading</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleClaim}
            disabled={claiming || alreadyClaimed}
            className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-[#0B0F14] overflow-hidden transition-transform hover:scale-[1.03] active:scale-[0.97] cursor-pointer disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)', animation: 'pCTAPulse 2.4s ease-in-out infinite' }}
          >
            <Gift className="w-3.5 h-3.5 shrink-0" />
            {alreadyClaimed ? 'Already Claimed' : claiming ? 'Claiming…' : 'Claim Now'}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.2) 50%,transparent 62%)', animation: 'pShimmer 2.8s ease-in-out infinite' }} />
          </button>
          <button
            onClick={dismissBar}
            title="Dismiss"
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#253241] bg-[#0D1520] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2A38] hover:border-[#2E3D50] transition-all duration-150 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile (below xl): slim top notice just below the header ── */}
      <div
        className="xl:hidden fixed top-14 left-0 right-0 z-[9998] flex items-center justify-between gap-2 px-3 py-2"
        style={{
          background: 'linear-gradient(90deg,rgba(6,26,20,0.97) 0%,rgba(9,24,32,0.97) 100%)',
          borderBottom: '1px solid rgba(0,223,169,0.18)',
          backdropFilter: 'blur(10px)',
          transform: barVisible ? 'translateY(0)' : 'translateY(-110%)',
          opacity: barVisible ? 1 : 0,
          transition: 'transform 0.45s cubic-bezier(.16,1,.3,1), opacity 0.35s ease',
          pointerEvents: barVisible ? 'all' : 'none',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Gift className="w-3.5 h-3.5 text-[#00DFA9] shrink-0" />
          <p className="text-[11px] font-semibold text-[#F8FAFC] leading-none truncate">
            Claim <span className="text-[#FACC15] font-black">FREE 120 USDT</span> welcome bonus
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleClaim}
            disabled={claiming || alreadyClaimed}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#0B0F14] bg-[#00DFA9] hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            {alreadyClaimed ? 'Claimed ✓' : claiming ? '…' : 'Claim'}
          </button>
          <button
            onClick={dismissBar}
            className="flex items-center justify-center w-6 h-6 rounded-lg text-[#64748B] hover:text-[#94A3B8] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  ) : null;

  if (!visible) return <>{StickyBar}</>;

  return (
    <>
    {StickyBar}
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
      style={{ animation: closing ? 'pBdOut .36s ease forwards' : 'pBdIn .38s ease forwards' }}
    >
      <style>{`
        @keyframes pBdIn    { from{opacity:0} to{opacity:1} }
        @keyframes pBdOut   { from{opacity:1} to{opacity:0} }
        @keyframes pMIn     { from{opacity:0;transform:scale(.86) translateY(22px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pMOut    { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(.93) translateY(14px)} }
        @keyframes pFloat      { from{transform:translateY(0)} to{transform:translateY(-16px)} }
        @keyframes pPillPulse  { 0%,100%{opacity:1} 50%{opacity:.72} }
        @keyframes pCTAPulse   { 0%,100%{box-shadow:0 0 28px rgba(0,223,169,.4),0 4px 14px rgba(0,0,0,.5)} 50%{box-shadow:0 0 44px rgba(0,223,169,.62),0 4px 18px rgba(0,0,0,.5)} }
        @keyframes pShimmer    { from{transform:translateX(-120%)} to{transform:translateX(120%)} }
        @keyframes coinFall    { 0%{transform:translateY(-60px) rotate(0deg) translateX(0);opacity:1} 100%{transform:translateY(520px) rotate(var(--rot)) translateX(var(--drift));opacity:0} }
        @keyframes congratsIn  { from{opacity:0;transform:scale(.82) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes goldPulse   { 0%,100%{text-shadow:0 0 30px rgba(250,204,21,.5)} 50%{text-shadow:0 0 60px rgba(250,204,21,.9)} }
        @keyframes popIn       { 0%{transform:scale(0)} 70%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes ringPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,.5)} 50%{box-shadow:0 0 0 18px rgba(250,204,21,0)} }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
        onClick={showCongrats ? undefined : close}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              opacity: p.op,
              background: p.gold ? '#FACC15' : '#00DFA9',
              animation: `pFloat ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* ── CONGRATULATIONS OVERLAY ─────────────────────────────────────── */}
      {showCongrats && (
        <div
          className="relative w-full max-w-[480px] overflow-hidden flex flex-col items-center text-center px-6 py-10 sm:py-14"
          style={{
            borderRadius: '20px',
            background: 'linear-gradient(160deg,#0A100A 0%,#0D1A10 55%,#0A0F10 100%)',
            border: '1px solid rgba(250,204,21,0.35)',
            boxShadow: '0 0 80px rgba(250,204,21,0.15), 0 40px 100px rgba(0,0,0,0.9)',
            animation: 'congratsIn 0.5s cubic-bezier(.16,1,.3,1) forwards',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Coin rain */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {COINS.map(c => (
              <div
                key={c.id}
                className="absolute rounded-full flex items-center justify-center font-black text-[#0B0F14] select-none"
                style={{
                  left: `${c.x}%`,
                  top: '-40px',
                  width: c.size,
                  height: c.size,
                  fontSize: c.size * 0.55,
                  background: 'radial-gradient(circle at 35% 35%,#FFE066,#FACC15 55%,#B8960C)',
                  boxShadow: '0 2px 8px rgba(250,204,21,0.5)',
                  ['--rot' as string]: `${c.rot}deg`,
                  ['--drift' as string]: `${c.drift}px`,
                  animation: `coinFall ${c.dur}s ${c.delay}s ease-in forwards`,
                }}
              >
                $
              </div>
            ))}
          </div>
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FACC15] to-transparent" />
          <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(250,204,21,0.12) 0%,transparent 70%)' }} />
          <div
            className="relative mb-5 w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'radial-gradient(circle,#FACC15 0%,#B8960C 100%)', animation: 'popIn 0.5s 0.2s cubic-bezier(.16,1,.3,1) both, ringPulse 2s 0.7s ease-in-out infinite' }}
          >
            <PartyPopper className="w-9 h-9 text-[#0B0F14]" />
          </div>
          <h2 className="text-[26px] sm:text-[32px] font-black text-[#FACC15] leading-tight mb-2"
            style={{ animation: 'goldPulse 2s ease-in-out infinite' }}>
            Congratulations! 🎉
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#94A3B8] mb-6 leading-relaxed">
            Your welcome bonus has been credited to your account
          </p>
          <div className="mb-8 px-8 py-5 rounded-2xl border border-[#FACC15]/30 w-full"
            style={{ background: 'rgba(250,204,21,0.07)' }}>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Bonus Balance</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-[48px] sm:text-[56px] font-black text-[#FACC15] leading-none tabular-nums"
                style={{ textShadow: '0 0 40px rgba(250,204,21,0.4)' }}>
                {counterVal.toFixed(2)}
              </span>
              <span className="text-[20px] font-bold text-[#FACC15]/80">USDT</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-2">Non-withdrawable · Used for betting only</p>
          </div>
          <button
            onClick={() => { setShowCongrats(false); close(); }}
            className="relative w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-[14px] text-[#071210] overflow-hidden transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#00DFA9 0%,#00C49A 100%)', animation: 'pCTAPulse 2.6s ease-in-out infinite' }}
          >
            <Zap className="w-4 h-4 shrink-0" />
            Start Playing →
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.22) 50%,transparent 62%)', animation: 'pShimmer 2.6s ease-in-out infinite' }} />
          </button>
        </div>
      )}

      {/* ── MAIN MODAL ──────────────────────────────────────────────────── */}
      {!showCongrats && <div
        className="relative w-full max-w-[860px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.95)]"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(140deg,#0A0F16 0%,#0D1520 55%,#0A0F16 100%)',
          border: '1px solid rgba(0,223,169,0.2)',
          animation: closing ? 'pMOut .36s cubic-bezier(.4,0,1,1) forwards' : 'pMIn .44s cubic-bezier(.16,1,.3,1) forwards',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />

        {/* Glow blobs */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(0,223,169,0.13) 0%,transparent 70%)' }} />
        <div className="absolute -bottom-24 right-32 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 70%)' }} />

        <div className="flex flex-col md:flex-row md:items-stretch">

          {/* ── LEFT: Celebrity images (crossfade) ── */}
          <div
            className="relative shrink-0 w-full md:w-[40%] overflow-hidden"
            style={{ background: DOT_BG, minHeight: '200px' }}
            onMouseEnter={() => { setHovered(true); setShowAlt(true); }}
            onMouseLeave={() => { setHovered(false); setShowAlt(false); }}
          >
            {/* Original image */}
            <img
              src={IMG_ORIGINAL}
              alt="CupBett Ambassador"
              style={{ ...IMG_BASE, opacity: altVisible ? 0 : 1 }}
            />
            {/* Alt image (ronaldo) — shown on hover or auto-cycle */}
            <img
              src={IMG_ALT}
              alt="CupBett Ambassador"
              style={{ ...IMG_BASE, opacity: altVisible ? 1 : 0 }}
            />

            {/* Right-edge fade */}
            <div className="absolute inset-y-0 right-0 w-16 pointer-events-none hidden md:block"
              style={{ background: 'linear-gradient(to right,transparent,#0A0F16)' }} />
            {/* Bottom fade mobile */}
            <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none md:hidden"
              style={{ background: 'linear-gradient(to top,#0A0F16,transparent)' }} />

            {/* LIVE badge */}
            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-[#00DFA9]/30 pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] animate-pulse shrink-0" />
              <span className="text-[9px] font-bold text-[#00DFA9] tracking-[0.12em] uppercase">Live Promo</span>
            </div>

            {/* Star rating */}
            <div
              className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 border border-[#FACC15]/20 pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            >
              {[1,2,3,4,5].map(s => <Star key={s} className="w-2.5 h-2.5 fill-[#FACC15] text-[#FACC15]" />)}
              <span className="text-[9px] text-[#FACC15] font-semibold ml-0.5">4.9</span>
            </div>
          </div>

          {/* ── RIGHT: Content ── */}
          <div className="relative flex flex-col flex-1 px-5 py-5 sm:px-7 sm:py-7">

            {/* Close */}
            <button
              onClick={close}
              className="absolute top-3 right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1E2A38] transition-all duration-150 z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Bonus pill */}
            <div className="flex items-center mb-3">
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-[#FACC15]/30"
                style={{ background: 'rgba(250,204,21,0.08)', animation: 'pPillPulse 2.2s ease-in-out infinite' }}
              >
                <span className="text-[#FACC15] text-[11px]">✦</span>
                <span className="text-[12px] font-black text-[#FACC15] tracking-wide">WELCOME BONUS — FREE 120 USDT</span>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-[19px] sm:text-[24px] font-black text-[#F8FAFC] leading-[1.2] mb-2">
              Sign Up &amp;{' '}
              <span style={{ background: 'linear-gradient(90deg,#00DFA9 0%,#38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Claim FREE
              </span>{' '}
              <span className="text-[#FACC15]">120 USDT</span>
            </h2>

            <p className="text-[12px] sm:text-[13px] text-[#94A3B8] leading-relaxed mb-4">
              Join thousands of winning players on{' '}
              <span translate="no" className="text-[#00DFA9] font-semibold">CupBett Sports Trading</span>.
              Instant deposits · real-time odds · provably fair.
            </p>

            {/* Social proof */}
            <div
              className="flex items-center gap-2.5 mb-5 p-2.5 rounded-xl border border-[#1E2A38]"
              style={{ background: 'rgba(18,24,32,0.7)' }}
            >
              <div className="flex -space-x-1.5 shrink-0">
                {AVATARS.map((src, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-[#0A0F16] overflow-hidden shrink-0 relative"
                    style={{ zIndex: AVATARS.length - i }}
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#0B0F14]"
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {AVATAR_LETTERS[i % AVATAR_LETTERS.length]}
                    </div>
                    <img
                      src={src}
                      alt="Player"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                    />
                  </div>
                ))}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-[#F8FAFC]">
                  <span className="text-[#00DFA9] font-black">+127 players</span> joined in the last hour
                </div>
                <div className="text-[10px] text-[#94A3B8]">50,000+ active players worldwide</div>
              </div>
            </div>

            {/* Error */}
            {claimError && (
              <div className="mb-3 px-3 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-[12px] text-red-400">
                {claimError}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
              <button
                onClick={handleClaim}
                disabled={claiming || alreadyClaimed}
                className="relative flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-[13px] sm:text-[14px] text-[#071210] overflow-hidden transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#00DFA9 0%,#00C49A 100%)', animation: 'pCTAPulse 2.6s ease-in-out infinite' }}
              >
                <Gift className="w-4 h-4 shrink-0" />
                {alreadyClaimed ? 'Already Claimed' : claiming ? 'Claiming…' : isAuthenticated ? 'Claim Now — Get 120 USDT' : 'Sign Up & Claim 120 USDT'}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.22) 50%,transparent 62%)', animation: 'pShimmer 2.6s ease-in-out infinite' }} />
              </button>

              <button
                onClick={close}
                className="sm:shrink-0 sm:px-5 py-3 rounded-xl font-medium text-[12px] text-[#64748B] hover:text-[#94A3B8] border border-[#1E2A38] hover:border-[#253241] hover:bg-[#121821] transition-all duration-150 cursor-pointer"
              >
                Maybe Later
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#1E2A38]">
              {([
                { icon: Users,      label: '50,000+',  sub: 'Active Players',     color: '#00DFA9' },
                { icon: TrendingUp, label: 'Instant',  sub: 'Crypto Withdrawals', color: '#38BDF8' },
                { icon: Shield,     label: 'Provably', sub: 'Fair Experience',    color: '#FACC15' },
              ] as const).map(({ icon: Icon, label, sub, color }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-bold text-[#E2E8F0] leading-none mt-0.5">{label}</span>
                  <span className="text-[9px] sm:text-[10px] text-[#64748B] leading-tight">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>}
    </div>
    </>
  );
}
