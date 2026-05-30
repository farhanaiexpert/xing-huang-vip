import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import {
  X, QrCode, Zap, CreditCard, Wallet, ArrowRight, Lock,
  Shield, Clock, CheckCircle2, CircleDollarSign, Sparkles,
  Copy, Check, ChevronRight, ExternalLink, AlertCircle, ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { useAutoDeposit } from '../hooks/useAutoDeposit';

const ERC20_ADDRESS = (import.meta.env.VITE_PLATFORM_ERC20_ADDRESS as string) || '';
const TRC20_ADDRESS = (import.meta.env.VITE_PLATFORM_TRC20_ADDRESS as string) || '';
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
  const short = address ? address.slice(0, 10) + '…' + address.slice(-8) : '';
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
  const { open: reownModalOpen } = useAppKitState();
  const { disconnect } = useDisconnect();

  const [connecting, setConnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const {
    depositAmount, setDepositAmount,
    depositPhase, depositError, depositResult,
    isProcessing, hasTronLink, chainCfg,
    handleEvmDeposit: runEvmDeposit, handleTronDeposit: runTronDeposit,
    resetDeposit, clearError,
  } = useAutoDeposit();

  function handleEvmDeposit() { if (!user) { setAuthOpen(true); return; } runEvmDeposit(); }
  function handleTronDeposit() { if (!user) { setAuthOpen(true); return; } runTronDeposit(); }

  // Derive step from live state
  const reownStep: 'idle' | 'connecting' | 'connected' = isConnected && address
    ? 'connected'
    : connecting
      ? 'connecting'
      : 'idle';

  function close() {
    onOpenChange?.(false);
    onClose?.();
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

  function handleConnectWallet() {
    if (!user) { setAuthOpen(true); return; }
    close();
    setConnecting(true);
    setTimeout(() => openReown(), 120);
  }

  function handleDisconnect() {
    disconnect();
    resetDeposit();
  }

  // When Reown modal closes without connecting → clear spinner
  useEffect(() => {
    if (!reownModalOpen && connecting && !isConnected) {
      setConnecting(false);
    }
  }, [reownModalOpen, connecting, isConnected]);

  // Reset deposit state when wallet disconnects
  useEffect(() => {
    if (!isConnected) resetDeposit();
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

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
                          <Sparkles className="w-2 h-2" />Auto
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A78BFA]/80 font-semibold mb-1.5">MetaMask · Trust · OKX · TronLink · 300+ wallets</p>
                      <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">
                        Connect your wallet and deposit USDT in one click. No manual TxHash needed.
                      </p>

                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#A78BFA]">
                          <Shield className="w-3 h-3" /> Self-custody
                        </span>
                        <span className="w-px h-3 bg-white/[0.1]" />
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8]">
                          <CheckCircle2 className="w-3 h-3" /> Instant
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
                /* ── Wallet Connected: Auto-Deposit UI ── */
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,223,169,0.08) 0%, rgba(0,196,154,0.03) 100%)',
                    border: '1px solid rgba(0,223,169,0.30)',
                    boxShadow: '0 0 24px rgba(0,223,169,0.06)',
                  }}
                >
                  {/* ── Success state ── */}
                  {depositPhase === 'success' && depositResult ? (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.35)' }}>
                          <CheckCircle2 className="w-5 h-5 text-[#00DFA9]" />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-[#00DFA9]">
                            {depositResult.autoVerified ? 'Deposit Verified!' : 'Deposit Submitted!'}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {depositResult.autoVerified
                              ? 'Balance has been credited to your account'
                              : 'Under review — usually credited within 5–30 min'}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl p-2.5 text-[10px] font-mono text-[#64748B] break-all"
                        style={{ background: 'rgba(0,0,0,0.2)' }}>
                        TxHash: {depositResult.txHash}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={close}
                          className="flex-1 py-2 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all"
                          style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
                        >
                          Done
                        </button>
                        <button
                          onClick={resetDeposit}
                          className="px-4 py-2 rounded-xl text-[11px] font-bold text-[#64748B] hover:text-[#94A3B8] transition-all"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                          Deposit more
                        </button>
                      </div>
                      <button
                        onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_wallet_tab', 'history'); }}
                        className="w-full py-2 rounded-xl text-[12px] font-bold text-[#38BDF8] border border-[#38BDF8]/20 hover:bg-[#38BDF8]/10 transition-all"
                      >
                        View History →
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {/* Connected header */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.30)' }}>
                          <CheckCircle2 className="w-4.5 h-4.5 text-[#00DFA9]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-black text-[#00DFA9]">Wallet Connected</p>
                          <p className="text-[10px] font-mono text-[#64748B] truncate">
                            {address ? address.slice(0, 10) + '…' + address.slice(-8) : ''}
                            {chainCfg && (
                              <span className="ml-1.5 font-sans" style={{ color: chainCfg.color }}>· {chainCfg.label}</span>
                            )}
                            {!chainCfg && isConnected && (
                              <span className="ml-1.5 text-[#FACC15]">· Unsupported chain</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => { if (!isProcessing) openReown(); }}
                            disabled={isProcessing}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#94A3B8] bg-white/[0.04] border border-white/[0.10] hover:border-white/[0.20] hover:text-[#F8FAFC] transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />Change
                          </button>
                          <button
                            onClick={handleDisconnect}
                            disabled={isProcessing}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#F87171' }}
                          >
                            <X className="w-2.5 h-2.5" />Disconnect
                          </button>
                        </div>
                      </div>

                      {/* Unsupported chain warning */}
                      {!chainCfg && !hasTronLink && (
                        <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                          style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.20)' }}>
                          <AlertCircle className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" />
                          <p className="text-[#FACC15]">
                            Your wallet is on an unsupported network. Switch to <strong>Ethereum, BNB Smart Chain,</strong> or <strong>Polygon</strong> to deposit automatically.
                          </p>
                        </div>
                      )}

                      {/* Error banner */}
                      {depositPhase === 'error' && depositError && (
                        <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-red-400 flex-1">{depositError}</p>
                        </div>
                      )}

                      {/* Amount input */}
                      {(chainCfg || hasTronLink) && (
                        <>
                          <div>
                            <label className="block text-[11px] font-bold text-[#64748B] mb-1.5 uppercase tracking-wider">
                              Amount (USDT)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="10"
                                step="1"
                                value={depositAmount}
                                onChange={e => {
                                  setDepositAmount(e.target.value);
                                  clearError();
                                }}
                                disabled={isProcessing}
                                className="w-full rounded-xl px-4 py-3 text-[15px] font-bold text-[#F8FAFC] pr-16 outline-none disabled:opacity-60"
                                style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid rgba(0,223,169,0.25)',
                                }}
                                placeholder="50"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#00DFA9]">USDT</span>
                            </div>
                            <p className="text-[10px] text-[#64748B] mt-1">Minimum: 10 USDT</p>
                          </div>

                          {/* Deposit buttons */}
                          <div className="space-y-2">
                            {chainCfg && (
                              <button
                                onClick={handleEvmDeposit}
                                disabled={isProcessing}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait disabled:scale-100"
                                style={{
                                  background: isProcessing
                                    ? 'rgba(0,223,169,0.5)'
                                    : 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)',
                                  boxShadow: isProcessing ? 'none' : '0 0 20px rgba(0,223,169,0.30)',
                                }}
                              >
                                {depositPhase === 'sending' ? (
                                  <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Approve in wallet…</>
                                ) : depositPhase === 'confirming' ? (
                                  <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Waiting for confirmation…</>
                                ) : depositPhase === 'submitting' ? (
                                  <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Verifying on-chain…</>
                                ) : (
                                  <>Deposit via {chainCfg.label}<ChevronRight className="w-4 h-4" /></>
                                )}
                              </button>
                            )}

                            {hasTronLink && (
                              <button
                                onClick={handleTronDeposit}
                                disabled={isProcessing}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait disabled:scale-100"
                                style={{
                                  background: isProcessing
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'linear-gradient(135deg, rgba(0,223,169,0.15) 0%, rgba(0,196,154,0.08) 100%)',
                                  border: '1px solid rgba(0,223,169,0.35)',
                                  color: '#00DFA9',
                                }}
                              >
                                {depositPhase === 'sending' ? (
                                  <><span className="w-4 h-4 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" /> Approve in TronLink…</>
                                ) : depositPhase === 'confirming' ? (
                                  <><span className="w-4 h-4 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" /> Waiting for confirmation…</>
                                ) : depositPhase === 'submitting' ? (
                                  <><span className="w-4 h-4 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" /> Verifying on-chain…</>
                                ) : (
                                  <>Deposit via TronLink TRC-20<ChevronRight className="w-4 h-4" /></>
                                )}
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {/* Go to full Deposit page */}
                      <div className="pt-1 border-t border-white/[0.05]">
                        <button
                          onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_deposit_method', 'wallet'); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-[#A78BFA] transition-colors hover:text-[#C4B5FD]"
                          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}
                        >
                          <ExternalLink className="w-3 h-3" /> Go to full Deposit page
                        </button>
                      </div>

                      {/* Manual fallback (collapsible) */}
                      <div>
                        <button
                          onClick={() => setShowManual(m => !m)}
                          className="flex items-center gap-1.5 text-[11px] text-[#64748B] hover:text-[#94A3B8] transition-colors w-full"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showManual ? 'rotate-180' : ''}`} />
                          Send to address manually instead
                        </button>

                        {showManual && (
                          <div className="mt-2 space-y-2">
                            <p className="text-[11px] text-[#64748B]">
                              Send USDT to one of the addresses below, then submit your TxHash via{' '}
                              <button
                                onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_deposit_method', 'manual'); }}
                                className="text-[#00DFA9] underline"
                              >Manual Deposit</button>.
                            </p>
                            {ERC20_ADDRESS && (
                              <AddressRow label="ETH / BNB / Polygon" address={ERC20_ADDRESS} network="ERC-20" color="#38BDF8" />
                            )}
                            {TRC20_ADDRESS && (
                              <AddressRow label="TRON network" address={TRC20_ADDRESS} network="TRC-20" color="#00DFA9" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

              {/* ── OPTION 3: Manual ── */}
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
                    style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.28)' }}>
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
                  style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.14)', opacity: 0.55 }}
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
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                {[
                  { icon: <Shield className="w-3.5 h-3.5" />, label: 'SSL Secure', color: '#00DFA9' },
                  { icon: <Lock className="w-3.5 h-3.5" />, label: 'Non-custodial', color: '#38BDF8' },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'On-chain verify', color: '#A78BFA' },
                  { icon: <Clock className="w-3.5 h-3.5" />, label: '24/7 Support', color: '#FACC15' },
                ].map(({ icon, label, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <span style={{ color }}>{icon}</span>
                    <span className="text-[9px] text-[#64748B] leading-tight">{label}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          defaultTab="login"
        />
      )}
    </>,
    document.body
  );
}
