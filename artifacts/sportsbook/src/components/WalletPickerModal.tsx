import { useId, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useEvmWallet } from '../hooks/useEvmWallet';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import type { AuthUser } from '../contexts/AuthContext';

type Step = 'choose' | 'referral' | 'signing' | 'verifying' | 'error';
type WalletType = 'evm' | 'tron';

interface NonceFetchResult { nonce: string; message: string }
interface VerifyResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser?: boolean;
}

interface WalletPickerModalProps {
  open: boolean;
  onClose: () => void;
}

function EVM_ICON() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="#627EEA" strokeWidth="1.5" />
      <path d="M10 3.5V8.2L13.75 10L10 3.5Z" fill="#627EEA" fillOpacity="0.6" />
      <path d="M10 3.5L6.25 10L10 8.2V3.5Z" fill="#627EEA" />
      <path d="M10 12.5V16.5L13.75 10.8L10 12.5Z" fill="#627EEA" fillOpacity="0.6" />
      <path d="M10 16.5V12.5L6.25 10.8L10 16.5Z" fill="#627EEA" />
      <path d="M10 11.6L13.75 10L10 8.2V11.6Z" fill="#627EEA" fillOpacity="0.2" />
      <path d="M6.25 10L10 11.6V8.2L6.25 10Z" fill="#627EEA" fillOpacity="0.6" />
    </svg>
  );
}

function TRON_ICON() {
  return (
    <img
      src="https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TronLink.png"
      alt="TronLink"
      className="w-5 h-5 object-contain rounded"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function stepLabel(step: Step): string {
  if (step === 'signing') return 'Sign the message in your wallet…';
  if (step === 'verifying') return 'Verifying signature…';
  return '';
}

export function WalletPickerModal({ open, onClose }: WalletPickerModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const evmWallet = useEvmWallet();
  const { loginWithWallet } = useAuth();

  // Pre-fill referral code from sessionStorage (set by affiliate links)
  useEffect(() => {
    if (open) {
      const stored = sessionStorage.getItem('cb_ref');
      if (stored) setReferralCode(stored);
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('choose');
      setWalletType(null);
      setError('');
      setPendingAddress(null);
    }
  }, [open]);

  // Close on Escape + lock background scroll
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  function handleClose() {
    onClose();
  }

  // ── Wallet-check helper ─────────────────────────────────────────────────────
  const checkWalletExists = useCallback(async (addr: string): Promise<boolean> => {
    try {
      const { exists } = await api.get<{ exists: boolean }>(`/auth/wallet-check?address=${encodeURIComponent(addr)}`);
      return exists;
    } catch {
      return false; // fail-open: treat as new user so referral step shows
    }
  }, []);

  // ── EVM auth flow ──────────────────────────────────────────────────────────
  const handleEvmConnect = useCallback(async () => {
    setError('');
    setWalletType('evm');
    setStep('signing');
    try {
      let addr: string | undefined = evmWallet.address;
      if (!addr || !evmWallet.isConnected) {
        const connected = await evmWallet.connect();
        if (!connected) {
          setError('Wallet connection was cancelled or timed out. Please try again.');
          setStep('error');
          return;
        }
        addr = connected;
      }
      if (!addr) {
        setError('Could not retrieve wallet address. Please try again.');
        setStep('error');
        return;
      }
      const normalised = addr.toLowerCase();
      setPendingAddress(normalised);
      const exists = await checkWalletExists(normalised);
      if (exists) {
        // Returning user — skip referral, go straight to signing
        void handleEvmSignFor(normalised, '');
      } else {
        setStep('referral');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Connection cancelled.' || /cancel/i.test(msg)) {
        setStep('choose');
      } else if (msg === 'APPKIT_OPEN_FAILED') {
        setError('Could not open wallet selector. Please open this page in Chrome or Safari, or use your wallet\'s built-in browser.');
        setStep('error');
      } else {
        setError(msg || 'Could not connect wallet. Please try again.');
        setStep('error');
      }
    }
  }, [evmWallet, checkWalletExists]); // eslint-disable-line react-hooks/exhaustive-deps

  // addr + ref are explicit params so returning users (no referral step) can call directly
  const handleEvmSignFor = useCallback(async (addr: string, ref: string) => {
    setStep('signing');
    setError('');
    try {
      const { nonce, message } = await api.get<NonceFetchResult>(`/auth/wallet/nonce?address=${encodeURIComponent(addr)}`);
      const signature = await evmWallet.signMessage(message);
      setStep('verifying');
      const result = await api.post<VerifyResult>('/auth/wallet/verify', {
        address: addr,
        signature,
        nonce,
        chainId: evmWallet.chainId,
        referralCode: ref.trim() || undefined,
      });
      loginWithWallet(result.accessToken, result.refreshToken, result.user, result.isNewUser ?? false);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/reject|cancel|denied|user denied/i.test(msg)) {
        setError('Signature rejected. You need to sign the message to log in.');
      } else if (/expired|nonce/i.test(msg)) {
        setError('Session expired. Please try connecting again.');
      } else {
        setError(msg || 'Sign-in failed. Please try again.');
      }
      setStep('error');
    }
  }, [evmWallet, loginWithWallet]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTronSignFor = useCallback(async (addr: string, ref: string) => {
    setStep('signing');
    setError('');
    try {
      const { nonce, message } = await api.get<NonceFetchResult>(`/auth/wallet/nonce/tron?address=${encodeURIComponent(addr)}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tronWeb = (window as any).tronWeb;
      if (!tronWeb?.trx?.signMessageV2) {
        throw new Error('TronLink is not available. Please ensure TronLink is unlocked.');
      }
      const signature: string = await tronWeb.trx.signMessageV2(message);
      setStep('verifying');
      const result = await api.post<VerifyResult>('/auth/wallet/verify/tron', {
        address: addr,
        signature,
        nonce,
        referralCode: ref.trim() || undefined,
      });
      loginWithWallet(result.accessToken, result.refreshToken, result.user, result.isNewUser ?? false);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/reject|cancel|denied|user rejected/i.test(msg)) {
        setError('Signature rejected. You need to sign the message to log in.');
      } else {
        setError(msg || 'Sign-in failed. Please try again.');
      }
      setStep('error');
    }
  }, [loginWithWallet]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tron auth flow ─────────────────────────────────────────────────────────
  const handleTronConnect = useCallback(async () => {
    setError('');
    setWalletType('tron');
    setStep('signing');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tronLink = (window as any).tronLink;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tronWeb = (window as any).tronWeb;

    if (!tronLink && !tronWeb) {
      setError('TronLink is not installed. Please install TronLink from tronlink.org and refresh the page.');
      setStep('error');
      return;
    }
    try {
      if (tronLink?.request) {
        await tronLink.request({ method: 'tron_requestAccounts' });
      }
      // Give TronLink a moment to set defaultAddress
      await new Promise(r => setTimeout(r, 300));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tw = (window as any).tronWeb;
      const addr: string | undefined = tw?.defaultAddress?.base58;
      if (!addr) {
        setError('TronLink is locked or has no account. Please unlock TronLink and try again.');
        setStep('error');
        return;
      }
      setPendingAddress(addr);
      const exists = await checkWalletExists(addr);
      if (exists) {
        // Returning user — skip referral, go straight to signing
        void handleTronSignFor(addr, '');
      } else {
        setStep('referral');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/reject|cancel|denied/i.test(msg)) {
        setStep('choose');
      } else {
        setError(msg || 'Could not connect TronLink. Please try again.');
        setStep('error');
      }
    }
  }, [checkWalletExists, handleTronSignFor]);

  // ── Referral step: continue to sign ───────────────────────────────────────
  function handleContinueToSign() {
    if (!pendingAddress) return;
    if (walletType === 'evm') {
      void handleEvmSignFor(pendingAddress, referralCode);
    } else if (walletType === 'tron') {
      void handleTronSignFor(pendingAddress, referralCode);
    }
  }

  if (!open) return null;

  const isLoading = step === 'signing' || step === 'verifying';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#05080C]/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-[400px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] outline-none"
        style={{
          background: 'linear-gradient(180deg, #0E141B 0%, #0B0F14 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 90px rgba(0,0,0,0.75), 0 0 60px rgba(0,223,169,0.06)',
        }}
      >
        {/* Top shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/40 to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-center px-6 pt-6 pb-4">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-wide text-[#F8FAFC]">
            Connect to Xing Huang
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8]/60 transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">

          {/* ── Loading state ── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="h-9 w-9 text-[#00DFA9] animate-spin" />
              <p className="text-[13px] text-[#94A3B8] text-center">{stepLabel(step)}</p>
            </div>
          )}

          {/* ── Choose wallet type ── */}
          {step === 'choose' && (
            <>
              <p className="text-[12px] text-[#64748B] text-center pb-1">
                Choose your wallet type to sign in
              </p>

              {/* EVM wallets */}
              <button
                onClick={() => void handleEvmConnect()}
                className="group w-full flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-4 transition-all duration-200 hover:border-[#00DFA9]/40 hover:bg-white/[0.05] active:scale-[0.99] text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#627EEA]/10 border border-[#627EEA]/20">
                  <EVM_ICON />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#F8FAFC] group-hover:text-white">EVM Wallets</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">MetaMask, WalletConnect, Coinbase & 300+ more</p>
                </div>
                <span className="shrink-0 rounded-md border border-[#00DFA9]/30 bg-[#00DFA9]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00DFA9]">
                  Full Support
                </span>
              </button>

              {/* Tron wallet */}
              <button
                onClick={() => void handleTronConnect()}
                className="group w-full flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-4 transition-all duration-200 hover:border-[#F05023]/40 hover:bg-white/[0.05] active:scale-[0.99] text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F05023]/10 border border-[#F05023]/20">
                  <TRON_ICON />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#F8FAFC] group-hover:text-white">TronLink</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">TRX / USDT TRC-20 — TRON Network</p>
                </div>
                <span className="shrink-0 rounded-md border border-[#00DFA9]/30 bg-[#00DFA9]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00DFA9]">
                  Full Support
                </span>
              </button>

              <p className="text-[11px] text-[#64748B]/60 text-center pt-2">
                Connecting a wallet signs you in — no password needed
              </p>
            </>
          )}

          {/* ── Referral code step ── */}
          {step === 'referral' && (
            <div className="space-y-4 py-2">
              <div
                className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                style={{ background: 'rgba(0,223,169,0.06)', border: '1px solid rgba(0,223,169,0.18)' }}
              >
                <CheckCircle2 className="h-4 w-4 text-[#00DFA9] shrink-0" />
                <p className="text-[12px] text-[#00DFA9] font-semibold">
                  Wallet connected:{' '}
                  <span className="font-mono font-normal text-[#94A3B8]">
                    {pendingAddress ? pendingAddress.slice(0, 8) + '…' + pendingAddress.slice(-6) : ''}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#64748B] mb-2">
                  Referral Code <span className="normal-case font-normal text-[#64748B]/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IHFFXMRP"
                  maxLength={16}
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-[13px] font-mono text-[#F8FAFC] placeholder:text-[#64748B]/50 outline-none focus:border-[#00DFA9]/40 focus:bg-white/[0.06] transition-all"
                />
              </div>

              <button
                onClick={handleContinueToSign}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #00DFA9, #00B589)', color: '#0B0F14' }}
              >
                Continue to Sign
                <ChevronRight className="h-4 w-4" />
              </button>

              <p className="text-[11px] text-[#64748B]/60 text-center">
                You'll be asked to sign a message in your wallet — no gas fees
              </p>
            </div>
          )}

          {/* ── Error state ── */}
          {step === 'error' && (
            <div className="space-y-4 py-2">
              <div
                className="flex items-start gap-3 rounded-xl px-4 py-3.5"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-400 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={() => { setStep('choose'); setError(''); setPendingAddress(null); setWalletType(null); }}
                className="w-full rounded-2xl border border-white/[0.10] bg-white/[0.03] py-3 text-[13px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/[0.18] transition-all"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body,
  );
}
