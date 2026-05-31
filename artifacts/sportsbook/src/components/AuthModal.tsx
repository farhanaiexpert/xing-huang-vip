import { useState, useEffect, useRef } from 'react';
import {
  X, Wallet, AlertCircle, CheckCircle2, Copy, Check,
  ChevronRight, PenLine, ShieldCheck, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react';
import { useSignMessage, useChainId } from 'wagmi';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import { api, setTokens } from '../lib/apiClient';
import { shortAddress } from '../lib/utils';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  /** @deprecated — kept for caller compatibility; no longer changes layout */
  defaultTab?: 'login' | 'register';
}

type Step = 'idle' | 'waiting_wallet' | 'signing' | 'verifying' | 'done';

interface WalletVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
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

const WALLETS = [
  { name: 'MetaMask',      short: 'MM',  color: '#E2761B', bg: 'rgba(226,118,27,0.12)',  border: 'rgba(226,118,27,0.25)' },
  { name: 'WalletConnect', short: 'WC',  color: '#3B99FC', bg: 'rgba(59,153,252,0.12)',  border: 'rgba(59,153,252,0.25)' },
  { name: 'TronLink',      short: 'TL',  color: '#00DFA9', bg: 'rgba(0,223,169,0.12)',   border: 'rgba(0,223,169,0.25)' },
];

const FLOW_STEPS = [
  { label: 'Connect', Icon: Wallet     },
  { label: 'Sign',    Icon: PenLine    },
  { label: 'Access',  Icon: ShieldCheck },
];

function getFlowStep(step: Step): number {
  if (step === 'signing' || step === 'verifying') return 1;
  if (step === 'done') return 2;
  return 0;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { loginWithWallet } = useAuth();
  const { open: openAppKit }      = useAppKit();
  const { address, isConnected }  = useAppKitAccount();
  const { open: appKitModalOpen } = useAppKitState();
  const { signMessageAsync }      = useSignMessage();
  const chainId                   = useChainId();

  const [step,  setStep]  = useState<Step>('idle');
  const [error, setError] = useState('');
  const waitingForConnect = useRef(false);
  const tronActive        = useRef(false);

  const [hasTronLink, setHasTronLink] = useState(false);

  const addrShort = shortAddress(address) ?? '';
  const { copied, copy } = useCopy(address ?? '');

  useEffect(() => {
    if (!open) {
      setStep('idle');
      setError('');
      waitingForConnect.current = false;
      tronActive.current = false;
    } else {
      // Detect TronLink when modal opens
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tw = (window as any).tronWeb;
      setHasTronLink(!!(tw?.defaultAddress?.base58));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!waitingForConnect.current) return;
    if (appKitModalOpen) return;
    if (!isConnected || !address) return;
    waitingForConnect.current = false;
    void handleSign(address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appKitModalOpen, isConnected, address, open]);

  useEffect(() => {
    if (!open) return;
    if (step !== 'waiting_wallet') return;
    if (appKitModalOpen) return;
    if (isConnected && address) return;
    setStep('idle');
    waitingForConnect.current = false;
  }, [appKitModalOpen, step, isConnected, address, open]);

  async function handleSign(addr: string) {
    setError('');
    setStep('signing');
    try {
      const { nonce, message } = await api.get<{ nonce: string; message: string }>(
        `/auth/wallet/nonce?address=${addr.toLowerCase()}`
      );
      const signature = await signMessageAsync({ message });
      setStep('verifying');
      const data = await api.post<WalletVerifyResponse>('/auth/wallet/verify', {
        address: addr.toLowerCase(),
        signature,
        nonce,
        chainId,
      });
      setTokens(data.accessToken, data.refreshToken);
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      setStep('done');

      toast.success(`Signed in as ${shortAddress(addr)}`, {
        description: 'Welcome to CupBett',
        duration: 4500,
        style: {
          background: '#0D1A26',
          border: '1px solid rgba(0,223,169,0.22)',
          color: '#F8FAFC',
        },
      });

      setTimeout(onClose, 1400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      const isRejected = msg.toLowerCase().includes('reject') ||
                         msg.toLowerCase().includes('denied') ||
                         msg.toLowerCase().includes('user refused');
      setError(isRejected ? 'Signature cancelled. Tap below to try again.' : msg);
      setStep('idle');
    }
  }

  async function handleTronSign() {
    setError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tw = (window as any).tronWeb;
    if (!tw?.defaultAddress?.base58) {
      setError('TronLink is not connected. Please unlock TronLink and try again.');
      return;
    }
    tronActive.current = true;
    const tronAddr = tw.defaultAddress.base58 as string;
    setStep('signing');
    try {
      const { nonce, message } = await api.get<{ nonce: string; message: string }>(
        `/auth/wallet/nonce/tron?address=${tronAddr}`
      );
      const signature = await tw.trx.signMessageV2(message) as string;
      setStep('verifying');
      const data = await api.post<WalletVerifyResponse>('/auth/wallet/verify/tron', {
        address: tronAddr,
        signature,
        nonce,
      });
      setTokens(data.accessToken, data.refreshToken);
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      setStep('done');

      const shortTron = tronAddr.slice(0, 6) + '…' + tronAddr.slice(-4);
      toast.success(`Signed in as ${shortTron}`, {
        description: 'Welcome to CupBett',
        duration: 4500,
        style: {
          background: '#0D1A26',
          border: '1px solid rgba(0,223,169,0.22)',
          color: '#F8FAFC',
        },
      });

      setTimeout(onClose, 1400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      const isRejected = msg.toLowerCase().includes('reject') ||
                         msg.toLowerCase().includes('cancel') ||
                         msg.toLowerCase().includes('denied');
      setError(isRejected ? 'Signature cancelled. Tap below to try again.' : msg);
      setStep('idle');
    } finally {
      tronActive.current = false;
    }
  }

  function handleConnectWallet() {
    setError('');
    if (isConnected && address) {
      void handleSign(address);
    } else {
      waitingForConnect.current = true;
      setStep('waiting_wallet');
      openAppKit();
    }
  }

  if (!open) return null;

  const isWorking    = step === 'waiting_wallet' || step === 'signing' || step === 'verifying';
  const flowStepIdx  = getFlowStep(step);
  const isTronFlow   = tronActive.current;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
      {/* Keyframes */}
      <style>{`
        @keyframes amShimmer   { 0%,100%{background-position:200% center} 50%{background-position:0% center} }
        @keyframes amFadeSlide { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes amPulseRing { 0%{transform:scale(1);opacity:0.55} 80%{transform:scale(2.6);opacity:0} 100%{transform:scale(2.6);opacity:0} }
        @keyframes amWobble    { 0%,100%{transform:rotate(-5deg) scale(1)} 50%{transform:rotate(5deg) scale(1.06)} }
        @keyframes amCheckIn   { 0%{transform:scale(0) rotate(-15deg);opacity:0} 60%{transform:scale(1.18) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes amDotPulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#050A12]/90 backdrop-blur-md"
        onClick={isWorking ? undefined : onClose}
      />

      {/* Card */}
      <div
        className="relative w-full sm:max-w-[480px] rounded-t-[28px] sm:rounded-[24px] overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #0E1B2C 0%, #0B1219 45%, #080F15 100%)',
          border: '1px solid rgba(0,223,169,0.14)',
          boxShadow: '0 -8px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
          animation: 'amFadeSlide 0.42s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Corner glow blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(0,223,169,0.09) 0%,transparent 65%)' }} />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.08) 0%,transparent 65%)' }} />

        {/* Animated shimmer top bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #00DFA9 20%, #38BDF8 50%, #00DFA9 80%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'amShimmer 3.5s ease-in-out infinite',
          }} />

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3.5 pb-0">
          <div className="w-10 h-[3px] rounded-full bg-white/15" />
        </div>

        {/* Close button */}
        {!isWorking && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8]/40 hover:text-[#F8FAFC] hover:bg-white/[0.07] transition-all duration-150 z-10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* ─── HEADER ─────────────────────────────────── */}
        <div className="px-7 pt-6 pb-5 text-center">

          {/* Brand icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div
                className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg,#00DFA9 0%,#00B88A 100%)',
                  boxShadow: '0 0 0 1px rgba(0,223,169,0.35), 0 0 36px rgba(0,223,169,0.22)',
                }}
              >
                <Wallet className="w-7 h-7 text-[#031A10]" />
              </div>

              {/* Pulse rings when working */}
              {isWorking && [0,1].map(i => (
                <div key={i} className="absolute inset-0 rounded-[18px]"
                  style={{
                    border: '1.5px solid rgba(0,223,169,0.4)',
                    animation: `amPulseRing 2s ease-out ${i * 0.7}s infinite`,
                  }} />
              ))}

              {/* Success badge */}
              {step === 'done' && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg,#00DFA9,#00B88A)',
                    boxShadow: '0 0 14px rgba(0,223,169,0.6)',
                    animation: 'amCheckIn 0.45s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <Check className="w-3.5 h-3.5 text-[#031A10] font-black" strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          <h2 className="text-[20px] font-black text-[#F8FAFC] tracking-tight leading-tight">
            {step === 'done'
              ? "You're in — Welcome!"
              : step === 'signing' || step === 'verifying'
                ? 'Sign to Verify'
                : 'Connect Your Wallet'}
          </h2>
          <p className="text-[13px] text-[#94A3B8]/55 mt-1.5 leading-relaxed">
            {step === 'done'
              ? 'Welcome to CupBett Sports Trading'
              : step === 'signing'
                ? isTronFlow
                  ? 'Open TronLink and approve the signature request'
                  : 'Open your wallet app and approve the message'
                : step === 'verifying'
                  ? 'Confirming your identity…'
                  : step === 'waiting_wallet'
                    ? 'Pick your wallet from the selector'
                    : 'Your wallet is your CupBett identity'}
          </p>
        </div>

        {/* ─── STEP INDICATOR ─────────────────────────── */}
        <div className="px-7 pb-5">
          <div className="flex items-start">
            {FLOW_STEPS.map(({ label, Icon }, i) => {
              const isDone   = i < flowStepIdx;
              const isActive = i === flowStepIdx;
              return (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-400"
                      style={{
                        background: isDone || isActive
                          ? 'linear-gradient(135deg,#00DFA9 0%,#00B88A 100%)'
                          : 'rgba(255,255,255,0.04)',
                        border: isActive
                          ? '2px solid rgba(0,223,169,0.6)'
                          : isDone
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isActive ? '0 0 18px rgba(0,223,169,0.3)' : 'none',
                      }}
                    >
                      {isDone
                        ? <Check className="w-[15px] h-[15px] text-[#031A10]" strokeWidth={3} />
                        : <Icon
                            className="w-[15px] h-[15px]"
                            style={{ color: isActive ? '#031A10' : 'rgba(148,163,184,0.25)' }}
                          />
                      }
                    </div>
                    <span
                      className="text-[9px] font-bold tracking-[0.1em] uppercase"
                      style={{ color: isActive || isDone ? '#00DFA9' : 'rgba(148,163,184,0.25)' }}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="flex-1 mb-5 mx-2 h-px transition-all duration-400"
                      style={{ background: i < flowStepIdx ? '#00DFA9' : 'rgba(255,255,255,0.07)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Thin separator */}
        <div className="mx-7 h-px bg-white/[0.05]" />

        {/* ─── CONTENT AREA ───────────────────────────── */}
        <div className="px-7 py-5 flex flex-col gap-3.5">

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-3">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle,rgba(0,223,169,0.14) 0%,transparent 70%)',
                  border: '1px solid rgba(0,223,169,0.22)',
                  animation: 'amCheckIn 0.5s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <CheckCircle2 className="w-10 h-10 text-[#00DFA9]" />
              </div>

              {address && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
                  style={{ background: 'rgba(0,223,169,0.06)', border: '1px solid rgba(0,223,169,0.15)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-[#00DFA9] shrink-0"
                    style={{ boxShadow: '0 0 8px rgba(0,223,169,0.9)', animation: 'amDotPulse 1.5s ease-in-out infinite' }} />
                  <p className="text-sm font-mono text-[#00DFA9] flex-1 truncate">{addrShort}</p>
                  <Check className="w-4 h-4 text-[#00DFA9]/50 shrink-0" />
                </div>
              )}

              <p className="text-[12px] text-[#94A3B8]/40">Closing automatically…</p>
            </div>
          )}

          {/* ── IDLE: wallet already connected ── */}
          {step === 'idle' && isConnected && address && (
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: 'rgba(0,223,169,0.055)', border: '1px solid rgba(0,223,169,0.18)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#00DFA9] shrink-0"
                style={{ boxShadow: '0 0 8px rgba(0,223,169,0.9)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-[#94A3B8]/40 uppercase tracking-[0.12em] mb-0.5">Wallet ready</p>
                <p className="text-[13px] font-mono text-[#00DFA9] truncate">{addrShort}</p>
              </div>
              <button
                onClick={copy}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8]/40 hover:text-[#00DFA9] hover:bg-white/[0.05] transition-all"
                title="Copy address"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* ── WORKING STATES ── */}
          {isWorking && (
            <div className="flex flex-col items-center gap-5 py-5">

              {/* Waiting for wallet */}
              {step === 'waiting_wallet' && (
                <div className="relative flex items-center justify-center w-20 h-20">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="absolute inset-0 rounded-2xl"
                      style={{
                        border: '1.5px solid rgba(0,223,169,0.3)',
                        animation: `amPulseRing 2.2s ease-out ${i * 0.65}s infinite`,
                      }} />
                  ))}
                  <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(0,223,169,0.09)', border: '1px solid rgba(0,223,169,0.22)' }}>
                    <Wallet className="w-7 h-7 text-[#00DFA9]"
                      style={{ animation: 'amWobble 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              )}

              {/* Signing */}
              {step === 'signing' && (
                <div className="relative">
                  <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(56,189,248,0.09)', border: '1px solid rgba(56,189,248,0.22)' }}>
                    <PenLine className="w-7 h-7 text-[#38BDF8]" />
                  </div>
                  <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-[#0B1219]">
                    <Loader2 className="w-5 h-5 text-[#38BDF8] animate-spin" />
                  </div>
                </div>
              )}

              {/* Verifying */}
              {step === 'verifying' && (
                <div className="relative">
                  <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.2)' }}>
                    <ShieldCheck className="w-7 h-7 text-[#00DFA9]" />
                  </div>
                  <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-[#0B1219]">
                    <Loader2 className="w-5 h-5 text-[#00DFA9] animate-spin" />
                  </div>
                </div>
              )}

              {/* State label */}
              <div className="text-center">
                <p className="text-[14px] font-bold text-[#F8FAFC]">
                  {step === 'waiting_wallet' && 'Opening wallet selector…'}
                  {step === 'signing'        && (isTronFlow ? 'Approve in TronLink' : 'Check your wallet')}
                  {step === 'verifying'      && 'Verifying signature…'}
                </p>
                <p className="text-[12px] text-[#94A3B8]/45 mt-1">
                  {step === 'waiting_wallet' && 'ETH · BSC · Polygon · Arbitrum · Optimism · Base'}
                  {step === 'signing'        && 'Free off-chain signature — zero gas fees'}
                  {step === 'verifying'      && 'Almost there, hold tight'}
                </p>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {error && step === 'idle' && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-500/[0.07] border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-[1px]" />
              <p className="text-[12px] text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          {/* ── PRIMARY CTA: EVM wallet (MetaMask / WalletConnect / etc.) ── */}
          {step === 'idle' && (
            <button
              onClick={handleConnectWallet}
              className="relative w-full h-[54px] rounded-xl font-black text-[14px] tracking-tight flex items-center justify-between px-5 transition-all duration-200 hover:scale-[1.015] active:scale-[0.985] overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg,#00DFA9 0%,#00C49A 55%,#00A882 100%)',
                boxShadow: '0 0 40px rgba(0,223,169,0.18), 0 4px 20px rgba(0,0,0,0.4)',
                color: '#031A10',
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'linear-gradient(135deg,#12F0C4 0%,#00DFA9 55%,#00C49A 100%)' }} />
              <Wallet className="relative w-[18px] h-[18px] shrink-0" />
              <span className="relative flex-1 text-center">
                {isConnected && address ? 'Log In with Wallet' : 'Connect Wallet'}
              </span>
              <ChevronRight className="relative w-[18px] h-[18px] shrink-0 opacity-60" />
            </button>
          )}

          {/* ── WALLET CHIPS ── */}
          {step === 'idle' && !isConnected && (
            <div className="flex items-center gap-1.5 justify-center flex-wrap pt-0.5">
              {WALLETS.map(w => (
                <div
                  key={w.name}
                  title={w.name}
                  className="flex items-center gap-1 h-[26px] px-2.5 rounded-lg text-[10px] font-bold tracking-wide cursor-default select-none"
                  style={{ background: w.bg, color: w.color, border: `1px solid ${w.border}` }}
                >
                  {w.short}
                </div>
              ))}
              <span className="text-[10px] text-[#64748B]/70">ETH · BSC · Polygon · Arbitrum · Optimism · Base · TRC-20</span>
            </div>
          )}

          {/* ── TRONLINK BUTTON ── */}
          {step === 'idle' && hasTronLink && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-[10px] text-[#64748B]/60 uppercase tracking-wider font-bold">or</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>

              <button
                onClick={handleTronSign}
                className="relative w-full h-[54px] rounded-xl font-black text-[14px] tracking-tight flex items-center justify-between px-5 transition-all duration-200 hover:scale-[1.015] active:scale-[0.985] overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,223,169,0.14) 0%, rgba(0,196,154,0.07) 100%)',
                  border: '1.5px solid rgba(0,223,169,0.45)',
                  color: '#00DFA9',
                  boxShadow: '0 0 24px rgba(0,223,169,0.08)',
                }}
              >
                <Wallet className="relative w-[18px] h-[18px] shrink-0" />
                <span className="relative flex-1 text-center">Connect with TronLink (TRC-20)</span>
                <ChevronRight className="relative w-[18px] h-[18px] shrink-0 opacity-60" />
              </button>

              <p className="text-[10px] text-[#64748B]/60 text-center -mt-1.5">
                TRON network · T… address · TRC-20 USDT
              </p>
            </>
          )}

          {/* ── INFO PILL ── */}
          {step === 'idle' && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(0,223,169,0.1)' }}>
                <ShieldCheck className="w-3 h-3 text-[#00DFA9]" />
              </div>
              <p className="text-[11px] text-[#94A3B8]/55 leading-relaxed">
                New here? Your account is created instantly the first time your wallet signs in.
              </p>
            </div>
          )}
        </div>

        {/* iOS safe-area spacer */}
        <div className="sm:hidden" style={{ height: 'env(safe-area-inset-bottom, 12px)' }} />
      </div>
    </div>
  );
}
