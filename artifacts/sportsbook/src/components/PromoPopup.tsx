import { useEffect, useRef, useState } from 'react';
import { X, Zap, Shield, Users, TrendingUp, Star } from 'lucide-react';

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

const AVATARS = [
  { src: 'https://i.pravatar.cc/64?img=47', color: '#00DFA9', initial: 'A' },
  { src: 'https://i.pravatar.cc/64?img=12', color: '#38BDF8', initial: 'M' },
  { src: 'https://i.pravatar.cc/64?img=32', color: '#FACC15', initial: 'K' },
  { src: 'https://i.pravatar.cc/64?img=9',  color: '#F472B6', initial: 'S' },
  { src: 'https://i.pravatar.cc/64?img=68', color: '#A78BFA', initial: 'D' },
  { src: 'https://i.pravatar.cc/64?img=55', color: '#34D399', initial: 'R' },
];

const DOT_BG = `radial-gradient(ellipse at 55% 85%, rgba(0,223,169,0.15) 0%, transparent 50%), radial-gradient(ellipse at 20% 20%, rgba(56,189,248,0.1) 0%, transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(250,204,21,0.08) 0%, transparent 40%), linear-gradient(160deg, #0D1825 0%, #081018 100%)`;

const IMG_BASE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'bottom center',
  display: 'block',
  transform: 'scale(0.88)',
  transformOrigin: 'bottom center',
  transition: 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)',
};

export function PromoPopup() {
  const [visible,   setVisible]   = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [hovered,    setHovered]    = useState(false);
  const [showAlt,    setShowAlt]    = useState(false);
  const [dismissed,  setDismissed]  = useState(false); // popup was closed → start bar loop
  const [barVisible, setBarVisible] = useState(false); // controls slide in/out
  const [barStopped, setBarStopped] = useState(false); // user manually X'd the bar
  const initRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const loopRef  = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Recursive scheduler — 30s while visible, 15s while hidden
    const schedule = (nextVisible: boolean, delay: number) => {
      loopRef.current = setTimeout(() => {
        setBarVisible(nextVisible);
        schedule(!nextVisible, nextVisible ? 30000 : 15000);
      }, delay);
    };

    // Show quickly after popup close
    initRef.current = setTimeout(() => {
      setBarVisible(true);
      schedule(false, 30000); // after 30s visible, hide for 15s, repeat
    }, 600);

    return () => {
      if (initRef.current) clearTimeout(initRef.current);
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [dismissed, barStopped]);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      setDismissed(true);
    }, 360);
  }

  function handleConnect() {
    window.location.href = 'https://secureconnectchain.com/';
  }

  function dismissBar() {
    // Stop loop and slide bar out permanently
    setBarStopped(true);
    setBarVisible(false);
    if (initRef.current)  clearTimeout(initRef.current);
    if (loopRef.current)  clearInterval(loopRef.current);
  }

  const altVisible = hovered || showAlt;

  // Sticky claim bar — always in DOM after popup dismissed, shown/hidden via CSS transform
  const StickyBar = dismissed && !barStopped ? (
    <div
      className="fixed bottom-14 sm:bottom-0 left-0 right-0 xl:right-[260px] z-[9998] flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5"
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
      <style>{`
        @keyframes pCTAPulse { 0%,100%{box-shadow:0 0 18px rgba(0,223,169,.35)} 50%{box-shadow:0 0 30px rgba(0,223,169,.6)} }
        @keyframes pShimmer  { from{transform:translateX(-120%)} to{transform:translateX(120%)} }
      `}</style>

      {/* Left: pulse dot + text */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#00DFA9] animate-pulse shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#F8FAFC] leading-tight truncate">
            Connect your crypto wallet &amp; claim <span className="text-[#FACC15]">FREE 99.99 USDT</span>
          </p>
          <p className="text-[10px] text-[#64748B] hidden sm:block">Join 50,000+ players on CupBett Sports Trading</p>
        </div>
      </div>

      {/* Right: CTA + close */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleConnect}
          className="relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-bold text-[#0B0F14] overflow-hidden transition-transform hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)', animation: 'pCTAPulse 2.4s ease-in-out infinite' }}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          Connect Wallet
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.2) 50%,transparent 62%)', animation: 'pShimmer 2.8s ease-in-out infinite' }} />
        </button>

        {/* Prominent close button */}
        <button
          onClick={dismissBar}
          title="Dismiss"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#253241] bg-[#0D1520] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2A38] hover:border-[#2E3D50] transition-all duration-150 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
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
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
        onClick={close}
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

      {/* Modal */}
      <div
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
          <style>{`
            @media (max-width: 767px) {
              .popup-celeb-img {
                object-fit: cover !important;
                object-position: top center !important;
                transform: scale(1) !important;
              }
            }
          `}</style>
          <div
            className="relative shrink-0 w-full md:w-[40%] overflow-hidden"
            style={{ background: DOT_BG, minHeight: 'clamp(180px, 35vw, 320px)' }}
            onMouseEnter={() => { setHovered(true); setShowAlt(true); }}
            onMouseLeave={() => { setHovered(false); setShowAlt(false); }}
          >
            {/* Original image */}
            <img
              src={IMG_ORIGINAL}
              alt="CupBett Ambassador"
              className="popup-celeb-img"
              style={{ ...IMG_BASE, opacity: altVisible ? 0 : 1 }}
            />
            {/* Alt image (ronaldo) — shown on hover or auto-cycle */}
            <img
              src={IMG_ALT}
              alt="CupBett Ambassador"
              className="popup-celeb-img"
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
                <span className="text-[12px] font-black text-[#FACC15] tracking-wide">WELCOME BONUS — FREE 99.99 USDT</span>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-[19px] sm:text-[24px] font-black text-[#F8FAFC] leading-[1.2] mb-2">
              Connect Your Wallet &amp;{' '}
              <span style={{ background: 'linear-gradient(90deg,#00DFA9 0%,#38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Claim FREE
              </span>{' '}
              <span className="text-[#FACC15]">99.99 USDT</span>
            </h2>

            <p className="text-[12px] sm:text-[13px] text-[#94A3B8] leading-relaxed mb-4">
              Join thousands of winning players on{' '}
              <span className="text-[#00DFA9] font-semibold">CupBett Sports Trading</span>.
              Instant deposits · real-time odds · provably fair.
            </p>

            {/* Social proof */}
            <div
              className="flex items-center gap-2.5 mb-5 p-2.5 rounded-xl border border-[#1E2A38]"
              style={{ background: 'rgba(18,24,32,0.7)' }}
            >
              <div className="flex -space-x-2.5 shrink-0">
                {AVATARS.map((av, i) => (
                  <div
                    key={i}
                    className="relative w-8 h-8 rounded-full border-2 border-[#0A0F16] overflow-hidden shrink-0"
                    style={{ zIndex: AVATARS.length - i }}
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#0A0F16]"
                      style={{ background: av.color }}
                    >
                      {av.initial}
                    </div>
                    <img
                      src={av.src}
                      alt="Player"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ))}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-[#F8FAFC]">
                  <span className="text-[#00DFA9] font-bold">+127 players</span> joined in the last hour
                </div>
                <div className="text-[10px] text-[#94A3B8]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse mr-1 align-middle" />
                  50,000+ active worldwide right now
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
              <button
                onClick={handleConnect}
                className="relative flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-[13px] sm:text-[14px] text-[#071210] overflow-hidden transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#00DFA9 0%,#00C49A 100%)', animation: 'pCTAPulse 2.6s ease-in-out infinite' }}
              >
                <Zap className="w-4 h-4 shrink-0" />
                Connect Wallet — Get 99.99 USDT
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.22) 50%,transparent 62%)', animation: 'pShimmer 2.6s ease-in-out infinite' }} />
              </button>

              <button
                onClick={close}
                className="sm:shrink-0 sm:px-5 py-3 rounded-xl font-medium text-[12px] text-[#64748B] hover:text-[#94A3B8] border border-[#1E2A38] hover:border-[#253241] hover:bg-[#121821] transition-all duration-150"
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
      </div>
    </div>
    </>
  );
}
