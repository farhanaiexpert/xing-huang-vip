import { useId, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useEvmWallet } from '../hooks/useEvmWallet';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import type { AuthUser } from '../contexts/AuthContext';

type WalletTag = 'full' | 'dapp';
type WalletType = 'evm' | 'tron';

interface WalletOption {
  name: string;
  icon: string;
  tag: WalletTag;
  type: WalletType;
  /** EIP-6963 rdns — lets us connect directly to an installed wallet (no AppKit popup). */
  rdns?: string;
}

/**
 * Wallet list — order, names, icons and support tags match the reference design.
 * Each wallet routes to a real sign-in flow: TronLink uses the TRON SIWE flow,
 * every other wallet uses the EVM SIWE flow (direct EIP-6963 connect when the
 * wallet is installed, AppKit QR/deep-link fallback otherwise).
 */
const WALLETS: WalletOption[] = [
  { name: 'TronLink',    icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TronLink.png',                              tag: 'full', type: 'tron' },
  { name: 'OKX',         icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/OKX.svg',                                   tag: 'full', type: 'evm', rdns: 'com.okex.wallet' },
  { name: 'Bitget',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/BitGet.svg',                                tag: 'full', type: 'evm', rdns: 'com.bitget.web3' },
  { name: 'imToken',     icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/imToken.svg',                               tag: 'dapp', type: 'evm', rdns: 'im.token' },
  { name: 'TokenPocket', icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TokenPocket.svg',                           tag: 'dapp', type: 'evm', rdns: 'pro.tokenpocket' },
  { name: 'Trust',       icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TrustWallet.svg',                           tag: 'dapp', type: 'evm', rdns: 'com.trustwallet.app' },
  { name: 'Portal',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Portal.svg',                                tag: 'dapp', type: 'evm' },
  { name: 'FoxWallet',   icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/FoxWallet.svg',                             tag: 'dapp', type: 'evm' },
  { name: 'BitPie',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/e8570352728f9524148d395e9b9f39ed_icon.png', tag: 'dapp', type: 'evm' },
  { name: 'MetaMask',    icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/MetaMask.svg',                              tag: 'dapp', type: 'evm', rdns: 'io.metamask' },
];

/** Number of wallets shown in the collapsed state before "Show more". */
const COLLAPSED_COUNT = 4;

type Step = 'choose' | 'referral' | 'signing' | 'verifying' | 'error';

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

function WalletIcon({ name, icon }: { name: string; icon: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/[0.06] text-sm font-black text-[#00DFA9]">
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <img
      src={icon}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
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
  const [expanded, setExpanded] = useState(false);
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
      setExpanded(false);
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

  // Focus trap — keep Tab cycling within the dialog
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

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
  const handleEvmConnect = useCallback(async (rdns?: string) => {
    setError('');
    setWalletType('evm');
    setStep('signing');
    try {
      let addr: string | undefined = evmWallet.address;
      if (!addr || !evmWallet.isConnected) {
        const connected = await evmWallet.connect(rdns);
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
      loginWithWallet(result.accessToken, result.refreshToken, result.user);
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
      loginWithWallet(result.accessToken, result.refreshToken, result.user);
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

  // ── Wallet row click → route to the right flow ──────────────────────────────
  function handleWalletClick(w: WalletOption) {
    if (w.type === 'tron') {
      void handleTronConnect();
    } else {
      void handleEvmConnect(w.rdns);
    }
  }

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
  const visibleWallets = expanded ? WALLETS : WALLETS.slice(0, COLLAPSED_COUNT);

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
        onKeyDown={handleKeyDown}
        className="relative flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] outline-none"
        style={{
          background: 'linear-gradient(180deg, #0E141B 0%, #0B0F14 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 90px rgba(0,0,0,0.75), 0 0 60px rgba(0,223,169,0.06)',
        }}
      >
        {/* Top shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/40 to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-center px-6 pt-6 pb-2">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-wide text-[#F8FAFC]">
            Connect your wallet
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8]/60 transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Loading state ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center px-6 py-12 gap-4">
            <Loader2 className="h-9 w-9 text-[#00DFA9] animate-spin" />
            <p className="text-[13px] text-[#94A3B8] text-center">{stepLabel(step)}</p>
          </div>
        )}

        {/* ── Choose wallet (branded list) ── */}
        {step === 'choose' && (
          <>
            <div className="flex flex-col gap-2.5 overflow-y-auto px-5 py-4 sidebar-scroll">
              {visibleWallets.map(w => (
                <button
                  key={w.name}
                  onClick={() => handleWalletClick(w)}
                  className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 text-left transition-all duration-200 hover:border-[#00DFA9]/40 hover:bg-white/[0.05] active:scale-[0.99]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                    <WalletIcon name={w.name} icon={w.icon} />
                  </span>
                  <span className="text-[15px] font-bold tracking-tight text-[#F8FAFC] group-hover:text-white">
                    {w.name}
                  </span>
                  {w.tag === 'full' ? (
                    <span className="ml-auto rounded-md border border-[#00DFA9]/30 bg-[#00DFA9]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00DFA9]">
                      Full Support
                    </span>
                  ) : (
                    <span className="ml-auto text-[11px] font-semibold text-[#94A3B8]/55">
                      DApp Browser
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Show more / less */}
            <div className="px-5 pb-3">
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] py-3 text-[13px] font-semibold text-[#94A3B8] transition-all duration-200 hover:border-[#00DFA9]/30 hover:text-[#F8FAFC]"
              >
                {expanded ? 'Show less' : `Show more (${WALLETS.length - COLLAPSED_COUNT})`}
              </button>
            </div>
            <div className="pb-5 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-[#94A3B8]/30">
              Sign in securely — no password
            </div>
          </>
        )}

        {/* ── Referral code step ── */}
        {step === 'referral' && (
          <div className="space-y-4 px-5 pb-6 pt-2">
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
          <div className="space-y-4 px-5 pb-6 pt-2">
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
    </div>,
    document.body,
  );
}
