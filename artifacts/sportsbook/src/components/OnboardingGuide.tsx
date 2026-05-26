import { useState, useEffect } from 'react';
import { Wallet, MousePointerClick, SlidersHorizontal, Rocket, X, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'oddschain_onboarding_seen';

const STEPS = [
  {
    icon: <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />,
    color: '#00DFA9',
    bg: 'rgba(0,223,169,0.1)',
    border: 'rgba(0,223,169,0.2)',
    num: '01',
    title: 'Connect your wallet',
    desc: 'Hit the green "Connect Wallet" button in the top-right corner to link your crypto wallet and fund your account.',
  },
  {
    icon: <MousePointerClick className="h-5 w-5 sm:h-6 sm:w-6" />,
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.1)',
    border: 'rgba(56,189,248,0.2)',
    num: '02',
    title: 'Pick a match',
    desc: 'Browse sports using the top carousel or the sidebar. Click any match to see all available markets.',
  },
  {
    icon: <SlidersHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />,
    color: '#FACC15',
    bg: 'rgba(250,204,21,0.1)',
    border: 'rgba(250,204,21,0.2)',
    num: '03',
    title: 'Select your odds',
    desc: 'Tap any odds button — it turns mint green and lands straight in your Bet Slip on the right.',
  },
  {
    icon: <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />,
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.2)',
    num: '04',
    title: 'Place your bet',
    desc: 'Enter your stake in the slip, check the potential return, then hit "Place Bet". Done — good luck!',
  },
];

export function OnboardingGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const lastSeen = stored ? parseInt(stored, 10) : 0;
    const hours24 = 24 * 60 * 60 * 1000;
    if (!lastSeen || Date.now() - lastSeen > hours24) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(6,10,20,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          background: 'linear-gradient(160deg, #0C1422 0%, #0D1117 60%, #091610 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,223,169,0.06) inset',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px shrink-0"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,223,169,0.4), transparent)' }} />

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-5 pb-4 sm:px-7 sm:pt-7 sm:pb-5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00DFA9]/60">New here?</span>
            </div>
            <h2 className="text-[18px] sm:text-[22px] font-black text-[#F8FAFC] leading-tight">How to place your first bet</h2>
            <p className="text-xs sm:text-sm text-[#94A3B8]/50 mt-1">Four simple steps — takes less than a minute.</p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-[#94A3B8]/40 hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-all duration-150 shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 sm:mx-7 h-px bg-white/[0.05] shrink-0" />

        {/* Steps grid — scrollable area */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-7">
            {STEPS.map(step => (
              <div
                key={step.num}
                className="rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 transition-all duration-200"
                style={{ background: step.bg, border: `1px solid ${step.border}` }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${step.color}18`, color: step.color, border: `1px solid ${step.color}30` }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="text-[24px] sm:text-[28px] font-black leading-none tabular-nums"
                    style={{ color: `${step.color}20` }}
                  >
                    {step.num}
                  </span>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#F8FAFC] mb-1" style={{ color: step.color }}>{step.title}</p>
                  <p className="text-[12px] text-[#94A3B8]/60 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 sm:px-7 sm:pb-7 pt-0 flex flex-wrap items-center justify-between gap-3 shrink-0 border-t border-white/[0.04]">
          <p className="text-[11px] text-[#94A3B8]/30">
            Revisit anytime from the <span className="text-[#94A3B8]/50">Help</span> page.
          </p>
          <button
            onClick={dismiss}
            className="flex items-center gap-2 px-5 h-10 rounded-xl text-[#0B0F14] text-sm font-black tracking-tight transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shrink-0"
            style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.3)' }}
          >
            Got it — let's go
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
