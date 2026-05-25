import { useState } from 'react';
import { useLocation } from 'wouter';
import { X, QrCode, Zap, CreditCard, Wallet, ArrowRight, Lock, Shield, Clock, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../contexts/AuthContext';

interface ConnectWalletModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const COMING_SOON = [
  {
    id: 'nowpayments',
    name: 'NOWPayments',
    tag: '100+ coins',
    icon: Zap,
    color: '#38BDF8',
    bgColor: 'rgba(56,189,248,0.08)',
    borderColor: 'rgba(56,189,248,0.14)',
  },
  {
    id: 'binance-pay',
    name: 'Binance Pay',
    tag: '0% fee',
    icon: CreditCard,
    color: '#FACC15',
    bgColor: 'rgba(250,204,21,0.07)',
    borderColor: 'rgba(250,204,21,0.14)',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    tag: 'Web3',
    icon: Wallet,
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.07)',
    borderColor: 'rgba(167,139,250,0.14)',
  },
];

const TRUST_ITEMS = [
  { icon: Shield,            label: '0% Fee',        sub: 'No hidden charges' },
  { icon: Clock,             label: '5–30 min',      sub: 'Processing time'   },
  { icon: CircleDollarSign,  label: 'Min 10 USDT',   sub: 'Low minimum'       },
  { icon: CheckCircle2,      label: 'TRC-20',        sub: 'TRON network'      },
];

export function ConnectWalletModal({ open, onOpenChange, isOpen, onClose }: ConnectWalletModalProps) {
  const isVisible = open ?? isOpen ?? false;
  const [authOpen, setAuthOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  function close() {
    onOpenChange?.(false);
    onClose?.();
  }

  function handleDeposit() {
    close();
    if (user) {
      navigate('/account/wallet');
    } else {
      setAuthOpen(true);
    }
  }

  if (!isVisible && !authOpen) return null;

  return (
    <>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-[420px] rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.85)]"
            style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Top glow accent */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,223,169,0.6), transparent)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-[#F8FAFC] tracking-tight">Add Funds</h2>
                <p className="text-[12px] text-[#64748B] mt-0.5">Choose how you want to deposit USDT</p>
              </div>
              <button
                onClick={close}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              {/* ── Hero card — TRC-20 USDT ── */}
              <div
                className="relative rounded-2xl overflow-hidden p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,223,169,0.12) 0%, rgba(0,196,154,0.06) 100%)',
                  border: '1px solid rgba(0,223,169,0.35)',
                  boxShadow: '0 0 32px rgba(0,223,169,0.08)',
                }}
              >
                {/* Background glow blob */}
                <div
                  className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.15) 0%, transparent 70%)' }}
                />

                <div className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,223,169,0.25) 0%, rgba(0,196,154,0.15) 100%)',
                      border: '1px solid rgba(0,223,169,0.4)',
                      boxShadow: '0 0 16px rgba(0,223,169,0.2)',
                    }}
                  >
                    <QrCode className="w-6 h-6 text-[#00DFA9]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-black text-[#F8FAFC]">Manual USDT Deposit</span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{
                          background: 'rgba(0,223,169,0.18)',
                          color: '#00DFA9',
                          border: '1px solid rgba(0,223,169,0.35)',
                        }}
                      >
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-[#00DFA9]/80 font-semibold mb-1.5">TRC-20 Network · Tron</p>
                    <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">
                      Send USDT to our wallet address, paste your TxID and get credited in 5–30 minutes.
                    </p>

                    {/* Mini stats row */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#00DFA9]">
                        <Shield className="w-3 h-3" /> 0% fee
                      </span>
                      <span className="w-px h-3 bg-white/[0.1]" />
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8]">
                        <Clock className="w-3 h-3" /> 5–30 min
                      </span>
                      <span className="w-px h-3 bg-white/[0.1]" />
                      <span className="text-[11px] font-semibold text-[#94A3B8]">Min 10 USDT</span>
                    </div>

                    {/* CTA button */}
                    <button
                      onClick={handleDeposit}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)',
                        boxShadow: '0 0 20px rgba(0,223,169,0.35)',
                      }}
                    >
                      {user ? 'Deposit Now' : 'Sign In to Deposit'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Coming soon methods (3 small cards) ── */}
              <div>
                <p className="text-[10px] font-bold text-[#64748B]/70 uppercase tracking-wider mb-2 px-1">More methods — coming soon</p>
                <div className="grid grid-cols-3 gap-2">
                  {COMING_SOON.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl p-3 flex flex-col items-center gap-1.5 relative overflow-hidden"
                        style={{
                          background: m.bgColor,
                          border: `1px solid ${m.borderColor}`,
                          opacity: 0.55,
                        }}
                      >
                        {/* Lock icon top-right */}
                        <div className="absolute top-1.5 right-1.5">
                          <Lock className="w-2.5 h-2.5 text-[#64748B]" />
                        </div>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: m.bgColor, border: `1px solid ${m.borderColor}` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: m.color }} />
                        </div>
                        <p className="text-[10px] font-bold text-[#94A3B8] text-center leading-tight">{m.name}</p>
                        <p className="text-[9px] text-[#64748B] text-center">{m.tag}</p>
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                          style={{ background: 'rgba(100,116,139,0.15)', color: '#64748B', border: '1px solid rgba(100,116,139,0.2)' }}
                        >
                          Soon
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Trust bar ── */}
              <div
                className="rounded-xl p-3 grid grid-cols-4 gap-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5 text-center">
                    <Icon className="w-3.5 h-3.5 text-[#00DFA9] mb-0.5" />
                    <p className="text-[10px] font-bold text-[#F8FAFC] leading-tight">{label}</p>
                    <p className="text-[9px] text-[#64748B] leading-tight">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Footer note */}
              <p className="text-[10px] text-[#64748B]/60 text-center">
                Need help?{' '}
                <a href="/help" onClick={close} className="text-[#38BDF8] hover:underline">Visit Help Center</a>
                {' '}· All amounts in <span className="text-[#FACC15] font-semibold">USDT</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
