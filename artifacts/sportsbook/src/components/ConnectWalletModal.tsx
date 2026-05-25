import { useState } from 'react';
import { useLocation } from 'wouter';
import { X, QrCode, CreditCard, Zap, Wallet, ChevronRight, Shield, Clock } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../contexts/AuthContext';

interface ConnectWalletModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const PAYMENT_METHODS = [
  {
    id: 'usdt-trc20',
    name: 'Manual USDT Deposit',
    tag: 'TRC-20 / TRON',
    description: 'Scan QR code or copy address, paste your TxID and get credited within 5–30 min.',
    fee: '0% fee',
    time: '5–30 min',
    icon: QrCode,
    color: '#00DFA9',
    bgColor: 'rgba(0,223,169,0.10)',
    borderColor: 'rgba(0,223,169,0.30)',
    available: true,
    badge: 'Available Now',
    badgeColor: '#00DFA9',
  },
  {
    id: 'nowpayments',
    name: 'NOWPayments',
    tag: 'Auto-detect · 100+ coins',
    description: 'Pay with Bitcoin, ETH, BNB and 100+ other cryptocurrencies automatically.',
    fee: '0.5% fee',
    time: 'Instant',
    icon: Zap,
    color: '#38BDF8',
    bgColor: 'rgba(56,189,248,0.08)',
    borderColor: 'rgba(56,189,248,0.18)',
    available: false,
    badge: 'Coming Soon',
    badgeColor: '#64748B',
  },
  {
    id: 'binance-pay',
    name: 'Binance Pay',
    tag: 'Binance account',
    description: 'Pay directly from your Binance account with zero fees and instant settlement.',
    fee: '0% fee',
    time: 'Instant',
    icon: CreditCard,
    color: '#FACC15',
    bgColor: 'rgba(250,204,21,0.08)',
    borderColor: 'rgba(250,204,21,0.18)',
    available: false,
    badge: 'Coming Soon',
    badgeColor: '#64748B',
  },
  {
    id: 'walletconnect',
    name: 'MetaMask / WalletConnect',
    tag: 'Web3 wallet',
    description: 'Connect any Web3 wallet via WalletConnect protocol for on-chain deposits.',
    fee: 'Gas fees apply',
    time: '1–3 min',
    icon: Wallet,
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.18)',
    available: false,
    badge: 'Coming Soon',
    badgeColor: '#64748B',
  },
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

  function handleMethod(id: string) {
    if (id !== 'usdt-trc20') return;
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
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
            style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)' }}
                >
                  <Wallet className="w-4 h-4 text-[#00DFA9]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#F8FAFC] leading-tight">Deposit Funds</h2>
                  <p className="text-[11px] text-[#64748B] leading-tight">Choose your payment method</p>
                </div>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.07] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Methods list */}
            <div className="p-3 space-y-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const disabled = !method.available;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethod(method.id)}
                    disabled={disabled}
                    className="w-full text-left rounded-xl p-3.5 transition-all duration-150 group"
                    style={{
                      background: disabled ? 'rgba(255,255,255,0.02)' : method.bgColor,
                      border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : method.borderColor}`,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.55 : 1,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background: disabled ? 'rgba(255,255,255,0.05)' : method.bgColor,
                          border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : method.borderColor}`,
                        }}
                      >
                        <Icon
                          className="w-4.5 h-4.5"
                          style={{ color: disabled ? '#64748B' : method.color }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span
                            className="text-[13px] font-bold leading-tight"
                            style={{ color: disabled ? '#64748B' : '#F8FAFC' }}
                          >
                            {method.name}
                          </span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            style={{
                              background: method.available
                                ? 'rgba(0,223,169,0.15)'
                                : 'rgba(100,116,139,0.15)',
                              color: method.badgeColor,
                              border: `1px solid ${method.available ? 'rgba(0,223,169,0.3)' : 'rgba(100,116,139,0.25)'}`,
                            }}
                          >
                            {method.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B] font-medium mb-1">{method.tag}</p>
                        <p className="text-[11px] text-[#94A3B8]/70 leading-relaxed">{method.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-[#64748B]">
                            <Shield className="w-2.5 h-2.5" />
                            {method.fee}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-[#64748B]">
                            <Clock className="w-2.5 h-2.5" />
                            {method.time}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      {!disabled && (
                        <ChevronRight
                          className="w-4 h-4 shrink-0 mt-2 opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ color: method.color }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="px-4 pb-4">
              <p className="text-[10px] text-[#64748B]/70 text-center leading-relaxed">
                All deposits are processed in <span className="text-[#FACC15] font-semibold">USDT</span>.
                Need help? Visit our{' '}
                <a href="/help" onClick={close} className="text-[#38BDF8] hover:underline">Help Center</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
