import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import {
  X, QrCode, Zap, CreditCard, Wallet, ArrowRight, Lock,
  Shield, Clock, CheckCircle2, CircleDollarSign, Sparkles,
  Copy, Check, ChevronRight, ExternalLink,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

const ERC20_ADDRESS = import.meta.env.VITE_PLATFORM_ERC20_ADDRESS as string || '';
const TRC20_ADDRESS = import.meta.env.VITE_PLATFORM_TRC20_ADDRESS as string || '';

interface ConnectWalletModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return { copied, copy };
}

function AddressRow({ label, address, network, color }: {
  label: string; address: string; network: string; color: string;
}) {
  const { copied, copy } = useCopy(address);
  const short = address ? address.slice(0, 8) + '…' + address.slice(-6) : '';
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{network}</span>
          <span className="text-[10px] text-[#64748B]">·</span>
          <span className="text-[10px] text-[#64748B]">{label}</span>
        </div>
        <p className="text-[11px] font-mono text-[#94A3B8] truncate">{short}</p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
        style={copied
          ? { background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.3)' }
          : { background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }
        }
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export function ConnectWalletModal({ open, onOpenChange, isOpen, onClose }: ConnectWalletModalProps) {
  const isVisible = open ?? isOpen ?? false;
  const [authOpen, setAuthOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { open: openReown } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const [reownStep, setReownStep] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [copiedErc, setCopiedErc] = useState(false);
  const [copiedTrc, setCopiedTrc] = useState(false);

  function close() {
    onOpenChange?.(false);
    onClose?.();
    setTimeout(() => setReownStep('idle'), 300);
  }

  function handleDeposit(method: 'nowpayments' | 'manual') {
    close();
    if (user) {
      navigate('/account/wallet');
      sessionStorage.setItem('cupbett_deposit_method', method);
    } else {
      setAuthOpen(true);
    }
  }

  async function handleConnectWallet() {
    if (!user) { setAuthOpen(true); return; }
    setReownStep('connecting');
    try {
      await openReown();
    } catch {
      setReownStep('idle');
    }
  }

  useEffect(() => {
    if (isConnected && address && reownStep === 'connecting') {
      setReownStep('connected');
    }
  }, [isConnected, address, reownStep]);

  function copyErc() {
    navigator.clipboard.writeText(ERC20_ADDRESS).catch(() => {});
    setCopiedErc(true); setTimeout(() => setCopiedErc(false), 2000);
  }
  function copyTrc() {
    navigator.clipboard.writeText(TRC20_ADDRESS).catch(() => {});
    setCopiedTrc(true); setTimeout(() => setCopiedTrc(false), 2000);
  }

  function goManualAfterConnect() {
    close();
    if (user) { navigate('/account/wallet'); sessionStorage.setItem('cupbett_deposit_method', 'manual'); }
  }

  if (!isVisible && !authOpen) return null;

  return createPortal(
    <>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={close} />

          <div
            className="relative w-full max-w-[460px] rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)]"
            style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Rainbow top bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, #00DFA9 0%, #38BDF8 50%, #A78BFA 100%)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
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

            <div className="px-4 py-4 space-y-3 max-h-[80vh] overflow-y-auto">

              {/* ── OPTION 1: Connect Wallet (Reown) ── */}
              {reownStep !== 'connected' ? (
                <button
                  onClick={handleConnectWallet}
                  disabled={reownStep === 'connecting'}
                  className="w-full text-left rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group disabled:opacity-80 disabled:cursor-wait"
                  style={{
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.13) 0%, rgba(139,92,246,0.06) 100%)',
                    border: '1px solid rgba(167,139,250,0.30)',
                    boxShadow: '0 0 28px rgba(167,139,250,0.07)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(167,139,250,0.25) 0%, rgba(139,92,246,0.12) 100%)',
                        border: '1px solid rgba(167,139,250,0.4)',
                        boxShadow: '0 0 16px rgba(167,139,250,0.2)',
                      }}>
                      <Wallet className="w-6 h-6 text-[#A78BFA]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[15px] font-black text-[#F8FAFC]">Connect Wallet</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ background: 'rgba(167,139,250,0.18)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.35)' }}>
                          Web3
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                          style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.25)' }}>
                          <Sparkles className="w-2 h-2" />New
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A78BFA]/80 font-semibold mb-1.5">MetaMask · Trust · OKX · Binance · 300+ wallets</p>
                      <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">
                        Connect your crypto wallet and send USDT directly. Supports ERC-20 and TRC-20 networks.
                      </p>

                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#A78BFA]">
                          <Shield className="w-3 h-3" /> Self-custody
                        </span>
                        <span className="w-px h-3 bg-white/[0.1]" />
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8]">
                          <CheckCircle2 className="w-3 h-3" /> No KYC
                        </span>
                        <span className="w-px h-3 bg-white/[0.1]" />
                        <span className="text-[11px] font-semibold text-[#94A3B8]">Min 10 USDT</span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-black text-white transition-all w-fit"
                        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}>
                        {reownStep === 'connecting'
                          ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting…</>
                          : <>{user ? 'Connect Wallet' : 'Sign In to Connect'}<ChevronRight className="w-4 h-4 ml-1" /></>
                        }
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                /* ── Wallet Connected State ── */
                <div
                  className="rounded-2xl overflow-hidden p-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,223,169,0.10) 0%, rgba(0,196,154,0.04) 100%)',
                    border: '1px solid rgba(0,223,169,0.35)',
                    boxShadow: '0 0 24px rgba(0,223,169,0.08)',
                  }}
                >
                  {/* Connected header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.35)' }}>
                      <CheckCircle2 className="w-5 h-5 text-[#00DFA9]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-[#00DFA9]">Wallet Connected</p>
                      <p className="text-[11px] font-mono text-[#64748B]">
                        {address ? address.slice(0, 8) + '…' + address.slice(-6) : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setReownStep('idle')}
                      className="ml-auto text-[10px] text-[#64748B] hover:text-[#94A3B8] underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Instructions */}
                  <p className="text-[12px] text-[#94A3B8] mb-3 leading-relaxed">
                    Send <span className="text-[#FACC15] font-bold">USDT</span> to one of the addresses below, then submit your TxHash to get credited.
                  </p>

                  {/* Platform addresses */}
                  <div className="space-y-2 mb-4">
                    {ERC20_ADDRESS && (
                      <div
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]">ERC-20</span>
                            <span className="text-[10px] text-[#64748B]">· ETH / BNB / Polygon</span>
                          </div>
                          <p className="text-[11px] font-mono text-[#94A3B8] truncate">
                            {ERC20_ADDRESS.slice(0, 10)}…{ERC20_ADDRESS.slice(-8)}
                          </p>
                        </div>
                        <button
                          onClick={copyErc}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                          style={copiedErc
                            ? { background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.3)' }
                            : { background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.25)' }
                          }
                        >
                          {copiedErc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedErc ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}
                    {TRC20_ADDRESS && (
                      <div
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ background: 'rgba(0,223,169,0.07)', border: '1px solid rgba(0,223,169,0.2)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DFA9]">TRC-20</span>
                            <span className="text-[10px] text-[#64748B]">· TRON network</span>
                          </div>
                          <p className="text-[11px] font-mono text-[#94A3B8] truncate">
                            {TRC20_ADDRESS.slice(0, 10)}…{TRC20_ADDRESS.slice(-8)}
                          </p>
                        </div>
                        <button
                          onClick={copyTrc}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                          style={copiedTrc
                            ? { background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.3)' }
                            : { background: 'rgba(0,223,169,0.1)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.25)' }
                          }
                        >
                          {copiedTrc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedTrc ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={goManualAfterConnect}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 16px rgba(0,223,169,0.35)' }}
                  >
                    I've Sent USDT — Submit TxHash
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ── OPTION 2: NOWPayments AUTO ── */}
              <button
                onClick={() => handleDeposit('nowpayments')}
                className="w-full text-left rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group"
                style={{
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.13) 0%, rgba(56,189,248,0.05) 100%)',
                  border: '1px solid rgba(56,189,248,0.30)',
                  boxShadow: '0 0 28px rgba(56,189,248,0.07)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(56,189,248,0.25) 0%, rgba(56,189,248,0.12) 100%)',
                      border: '1px solid rgba(56,189,248,0.4)',
                      boxShadow: '0 0 16px rgba(56,189,248,0.2)',
                    }}>
                    <Zap className="w-6 h-6 text-[#38BDF8]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[15px] font-black text-[#F8FAFC]">Auto Crypto Deposit</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'rgba(56,189,248,0.18)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.35)' }}>
                        Live
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                        style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.25)' }}>
                        <Sparkles className="w-2 h-2" />Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-[#38BDF8]/80 font-semibold mb-1.5">NOWPayments · 100+ coins</p>
                    <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">
                      Pay with BTC, ETH, USDT, BNB and 100+ coins. Address generated instantly — balance credited automatically.
                    </p>

                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8]">
                        <Zap className="w-3 h-3" /> Instant address
                      </span>
                      <span className="w-px h-3 bg-white/[0.1]" />
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8]">
                        <CheckCircle2 className="w-3 h-3" /> Auto-credited
                      </span>
                      <span className="w-px h-3 bg-white/[0.1]" />
                      <span className="text-[11px] font-semibold text-[#94A3B8]">Min ~20 USDT</span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all w-fit"
                      style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)', boxShadow: '0 0 16px rgba(56,189,248,0.35)' }}>
                      {user ? 'Deposit with Crypto' : 'Sign In to Deposit'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
              </button>

              {/* ── OPTION 3: Manual TRC-20 ── */}
              <button
                onClick={() => handleDeposit('manual')}
                className="w-full text-left rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer group"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,223,169,0.08) 0%, rgba(0,196,154,0.04) 100%)',
                  border: '1px solid rgba(0,223,169,0.20)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(0,223,169,0.12)',
                      border: '1px solid rgba(0,223,169,0.28)',
                    }}>
                    <QrCode className="w-5 h-5 text-[#00DFA9]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-bold text-[#F8FAFC]">Manual USDT Deposit</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.28)' }}>
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                      Send USDT (TRC-20 or ERC-20) to our wallet, paste your TxID — credited in 5–30 min.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#00DFA9]">
                        <Shield className="w-3 h-3" /> 0% fee
                      </span>
                      <span className="w-px h-3 bg-white/[0.1]" />
                      <span className="text-[11px] text-[#64748B]">Min 10 USDT</span>
                      <span className="w-px h-3 bg-white/[0.1]" />
                      <span className="text-[11px] text-[#64748B]">TRC-20 / ERC-20</span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#64748B] group-hover:text-[#00DFA9] transition-colors shrink-0 mt-1" />
                </div>
              </button>

              {/* ── Coming soon ── */}
              <div>
                <p className="text-[10px] font-bold text-[#64748B]/70 uppercase tracking-wider mb-2 px-1">More methods — coming soon</p>
                <div
                  className="rounded-xl p-3 flex items-center gap-3 relative overflow-hidden"
                  style={{
                    background: 'rgba(250,204,21,0.07)',
                    border: '1px solid rgba(250,204,21,0.14)',
                    opacity: 0.55,
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.14)' }}>
                    <CreditCard className="w-4 h-4 text-[#FACC15]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#94A3B8] leading-tight">Binance Pay</p>
                    <p className="text-[9px] text-[#64748B]">0% fee</p>
                  </div>
                  <Lock className="w-2.5 h-2.5 text-[#64748B] ml-auto shrink-0" />
                </div>
              </div>

              {/* ── Trust bar ── */}
              <div
                className="rounded-xl p-3 grid grid-cols-4 gap-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {[
                  { icon: Shield,           label: '0% Fee',      sub: 'No hidden charges' },
                  { icon: Clock,            label: '< 30 min',    sub: 'Processing time'   },
                  { icon: CircleDollarSign, label: 'Min 10 USDT', sub: 'Low minimum'       },
                  { icon: CheckCircle2,     label: 'TRC / ERC',   sub: 'Both networks'     },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5 text-center">
                    <Icon className="w-3.5 h-3.5 text-[#00DFA9] mb-0.5" />
                    <p className="text-[10px] font-bold text-[#F8FAFC] leading-tight">{label}</p>
                    <p className="text-[9px] text-[#64748B] leading-tight">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Footer */}
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
    </>,
    document.body
  );
}
