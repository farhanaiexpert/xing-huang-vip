import { useState, useEffect, useRef } from 'react';
import { X, Wallet, Loader2, AlertCircle, CheckCircle2, Copy, Check, ChevronRight } from 'lucide-react';
import { useAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react';
import { useSignMessage } from 'wagmi';
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

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { loginWithWallet } = useAuth();
  const { open: openAppKit }              = useAppKit();
  const { address, isConnected }          = useAppKitAccount();
  const { open: appKitModalOpen }         = useAppKitState();
  const { signMessageAsync }              = useSignMessage();

  const [step,  setStep]  = useState<Step>('idle');
  const [error, setError] = useState('');

  // Track whether user explicitly triggered wallet connection from this modal
  const waitingForConnect = useRef(false);

  const addrShort = shortAddress(address) ?? '';
  const { copied, copy } = useCopy(address ?? '');

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStep('idle');
      setError('');
      waitingForConnect.current = false;
    }
  }, [open]);

  // When AppKit modal closes and wallet just connected → auto-sign
  useEffect(() => {
    if (!open) return;
    if (!waitingForConnect.current) return;
    if (appKitModalOpen) return;                 // still open
    if (!isConnected || !address) return;        // not connected
    waitingForConnect.current = false;
    void handleSign(address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appKitModalOpen, isConnected, address, open]);

  async function handleSign(addr: string) {
    setError('');
    setStep('signing');
    try {
      // 1. Fetch nonce
      const { nonce, message } = await api.get<{ nonce: string; message: string }>(
        `/auth/wallet/nonce?address=${addr.toLowerCase()}`
      );

      // 2. Sign message in wallet
      const signature = await signMessageAsync({ message });

      // 3. Verify on server
      setStep('verifying');
      const data = await api.post<WalletVerifyResponse>('/auth/wallet/verify', {
        address: addr.toLowerCase(),
        signature,
        nonce,
      });

      // 4. Store session
      setTokens(data.accessToken, data.refreshToken);
      loginWithWallet(data.accessToken, data.refreshToken, data.user);

      setStep('done');
      setTimeout(onClose, 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      // User rejected signature → friendly message
      const isRejected = msg.toLowerCase().includes('reject') ||
                         msg.toLowerCase().includes('denied') ||
                         msg.toLowerCase().includes('user refused');
      setError(isRejected ? 'Signature request was cancelled. Click below to try again.' : msg);
      setStep('idle');
    }
  }

  function handleConnectWallet() {
    setError('');
    if (isConnected && address) {
      // Wallet already connected — go straight to signing
      void handleSign(address);
    } else {
      waitingForConnect.current = true;
      setStep('waiting_wallet');
      openAppKit();
    }
  }

  // If AppKit modal was dismissed without connecting
  useEffect(() => {
    if (!open) return;
    if (step !== 'waiting_wallet') return;
    if (appKitModalOpen) return;
    if (isConnected && address) return; // connected — effect above handles it
    // AppKit closed without connecting
    setStep('idle');
    waitingForConnect.current = false;
  }, [appKitModalOpen, step, isConnected, address, open]);

  if (!open) return null;

  const isWorking = step === 'waiting_wallet' || step === 'signing' || step === 'verifying';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B0F14]/85 backdrop-blur-sm"
        onClick={isWorking ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#253241] shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0D1520 0%, #0B1219 100%)' }}
      >
        {/* Teal shimmer top bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #00DFA9 50%, transparent 100%)' }} />

        {/* Close */}
        {!isWorking && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8]/40 hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-all z-10"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Logo + headline */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-[#253241]/60">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{
              background: 'linear-gradient(135deg,#00DFA9,#00A882)',
              boxShadow: '0 0 24px rgba(0,223,169,0.3)',
            }}
          >
            <Wallet className="w-6 h-6 text-[#0B0F14]" />
          </div>
          <h2 className="text-lg font-black text-[#F8FAFC] tracking-tight">
            {step === 'done' ? 'Signed in!' : 'Connect your wallet'}
          </h2>
          <p className="text-xs text-[#94A3B8]/50 mt-1">
            {step === 'done'
              ? 'Welcome to CupBett'
              : 'Sign in securely — no password needed'}
          </p>
        </div>

        <div className="p-8 pt-6 flex flex-col gap-4">

          {/* ── Done state ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.35)' }}
              >
                <CheckCircle2 className="w-7 h-7 text-[#00DFA9]" />
              </div>
              <p className="text-sm text-[#94A3B8]">You're in!</p>
            </div>
          )}

          {/* ── Connected wallet indicator (idle, when wallet is already connected) ── */}
          {step === 'idle' && isConnected && address && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(0,223,169,0.06)', border: '1px solid rgba(0,223,169,0.20)' }}
            >
              <span className="w-2 h-2 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.8)] shrink-0" />
              <p className="flex-1 text-xs font-mono text-[#00DFA9] truncate">{addrShort}</p>
              <button
                onClick={copy}
                className="shrink-0 p-1 rounded-md text-[#94A3B8]/50 hover:text-[#00DFA9] transition-colors"
                title="Copy full address"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* ── Working states ── */}
          {(step === 'waiting_wallet' || step === 'signing' || step === 'verifying') && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 text-[#00DFA9] animate-spin" />
              <p className="text-sm text-[#94A3B8] text-center">
                {step === 'waiting_wallet' && 'Opening wallet selector…'}
                {step === 'signing'        && 'Check your wallet — sign the message to continue'}
                {step === 'verifying'      && 'Verifying signature…'}
              </p>
              {step === 'signing' && (
                <p className="text-xs text-[#64748B] text-center">
                  This is a free off-chain signature — no gas fees
                </p>
              )}
            </div>
          )}

          {/* ── Error ── */}
          {error && step === 'idle' && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          {/* ── Primary CTA ── */}
          {(step === 'idle') && (
            <button
              onClick={handleConnectWallet}
              className="w-full h-12 rounded-xl text-[#0B0F14] text-sm font-black tracking-tight flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg,#00DFA9 0%,#00C49A 60%,#00A882 100%)',
                boxShadow: '0 0 24px rgba(0,223,169,0.25)',
              }}
            >
              <Wallet className="w-4 h-4 shrink-0" />
              {isConnected && address
                ? 'Sign to Log In'
                : 'Connect Wallet'}
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </button>
          )}

          {/* ── Wallet options note ── */}
          {step === 'idle' && !isConnected && (
            <p className="text-center text-[11px] text-[#64748B]">
              MetaMask · WalletConnect · Coinbase · Trust · 300+ wallets
            </p>
          )}

          {/* ── First-time info ── */}
          {step === 'idle' && (
            <div
              className="flex items-start gap-2.5 px-3 py-3 rounded-xl text-[11px] text-[#94A3B8]/70 leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[#00DFA9] shrink-0 font-bold mt-px">ℹ</span>
              <span>
                First time? Connecting your wallet creates your account instantly —
                no registration, email, or password needed.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
