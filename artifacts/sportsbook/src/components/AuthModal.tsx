import { useState, useEffect, useRef } from 'react';
import {
  X, Wallet, AlertCircle, CheckCircle2, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppKitState } from '@reown/appkit/react';
import { useEvmWallet } from '../hooks/useEvmWallet';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import { api, setTokens } from '../lib/apiClient';
import { shortAddress } from '../lib/utils';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

type WalletStep = 'idle' | 'waiting_wallet' | 'signing' | 'verifying' | 'done';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const WALLET_OPTS = [
  { name: 'MetaMask',      short: 'MM',  color: '#E2761B', bg: 'rgba(226,118,27,0.1)',  border: 'rgba(226,118,27,0.22)' },
  { name: 'WalletConnect', short: 'WC',  color: '#3B99FC', bg: 'rgba(59,153,252,0.1)',  border: 'rgba(59,153,252,0.22)' },
  { name: 'TronLink',      short: 'TL',  color: '#00DFA9', bg: 'rgba(0,223,169,0.1)',   border: 'rgba(0,223,169,0.22)' },
  { name: 'Phantom',       short: 'PHM', color: '#9945FF', bg: 'rgba(153,69,255,0.1)',  border: 'rgba(153,69,255,0.22)' },
  { name: 'TON Wallet',    short: 'TON', color: '#0098EA', bg: 'rgba(0,152,234,0.1)',   border: 'rgba(0,152,234,0.22)' },
];

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { loginWithWallet } = useAuth();
  const evmWallet = useEvmWallet();
  const { address, isConnected } = evmWallet;
  const { open: appkitModalOpen } = useAppKitState();

  // Referral code (optional) — applied to wallet login
  const [refCode, setRefCode] = useState('');

  // Wallet flow state
  const [walletStep,    setWalletStep]    = useState<WalletStep>('idle');
  const [walletError,   setWalletError]   = useState('');
  const tronActive      = useRef(false);
  const phantomActive   = useRef(false);
  const tonWalletActive = useRef(false);
  // Set to true while waiting for connection via the Reown/WalletConnect modal.
  const wcPendingRef = useRef(false);

  // Auto-fill referral code from ?ref= URL param or sessionStorage
  useEffect(() => {
    if (open) {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref');
      if (urlRef) {
        const clean = urlRef.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
        setRefCode(clean);
        sessionStorage.setItem('cb_ref', clean);
      } else {
        const stored = sessionStorage.getItem('cb_ref');
        if (stored) setRefCode(stored);
      }
    }
  }, [open]);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setRefCode('');
      setWalletStep('idle'); setWalletError('');
      tronActive.current = false; phantomActive.current = false; tonWalletActive.current = false;
      wcPendingRef.current = false;
    }
  }, [open]);

  // When the Reown/WalletConnect modal delivers a connection, advance to signing.
  useEffect(() => {
    if (wcPendingRef.current && isConnected && address && walletStep === 'waiting_wallet') {
      wcPendingRef.current = false;
      void handleEvmSign(address);
    }
  }, [isConnected, address]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the user dismisses the Reown modal without connecting, unblock the UI.
  useEffect(() => {
    if (!appkitModalOpen && wcPendingRef.current) {
      wcPendingRef.current = false;
      setWalletStep('idle');
    }
  }, [appkitModalOpen]);

  // ── Wallet helpers ────────────────────────────────────────────────────────
  async function handleEvmSign(addr: string) {
    setWalletError('');
    setWalletStep('signing');
    try {
      const { nonce, message } = await api.get<{ nonce: string; message: string }>(
        `/auth/wallet/nonce?address=${addr.toLowerCase()}`
      );
      const signature = await evmWallet.signMessage(message);
      setWalletStep('verifying');
      const storedRef = sessionStorage.getItem('cb_ref');
      const data = await api.post<AuthResponse>('/auth/wallet/verify', {
        address: addr.toLowerCase(), signature, nonce, chainId: evmWallet.chainId,
        ...(storedRef ? { referralCode: storedRef } : {}),
      });
      setTokens(data.accessToken, data.refreshToken);
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      setWalletStep('done');
      toast.success(`Signed in as ${shortAddress(addr)}`, {
        description: 'Welcome to Xing Huang',
        duration: 4000,
        style: { background: '#0D1A26', border: '1px solid rgba(0,223,169,0.22)', color: '#F8FAFC' },
      });
      setTimeout(onClose, 1300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      const cancelled = msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('user refused');
      setWalletError(cancelled ? 'Signature cancelled. Try again.' : msg);
      setWalletStep('idle');
    }
  }

  function handleMetaMask() {
    setWalletError('');
    if (isConnected && address) { void handleEvmSign(address); }
    else {
      setWalletStep('waiting_wallet');
      evmWallet.connect().then(addr => {
        if (addr) void handleEvmSign(addr);
        else setWalletStep('idle');
      });
    }
  }

  /**
   * WalletConnect path — always opens the Reown AppKit modal (QR / deep-link).
   * Never falls back to an injected wallet even if MetaMask is installed.
   * Connection is detected reactively via the useEffect above.
   */
  function handleWalletConnect() {
    setWalletError('');
    if (isConnected && address) { void handleEvmSign(address); return; }
    setWalletStep('waiting_wallet');
    wcPendingRef.current = true;
    evmWallet.openWalletModal().catch((err: unknown) => {
      wcPendingRef.current = false;
      const msg = (err instanceof Error ? err.message : String(err)) ?? '';
      if (msg !== 'APPKIT_OPEN_FAILED') setWalletError(msg || 'Could not open wallet selector. Try again.');
      setWalletStep('idle');
    });
  }

  async function handleTronLink() {
    setWalletError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tw = (window as any).tronWeb;
    if (!tw?.defaultAddress?.base58) { setWalletError('TronLink not connected. Unlock TronLink and try again.'); return; }
    tronActive.current = true;
    const tronAddr = tw.defaultAddress.base58 as string;
    setWalletStep('signing');
    try {
      const { nonce, message } = await api.get<{ nonce: string; message: string }>(
        `/auth/wallet/nonce/tron?address=${tronAddr}`
      );
      const signature = await tw.trx.signMessageV2(message) as string;
      setWalletStep('verifying');
      const storedRef = sessionStorage.getItem('cb_ref');
      const data = await api.post<AuthResponse>('/auth/wallet/verify/tron', {
        address: tronAddr, signature, nonce,
        ...(storedRef ? { referralCode: storedRef } : {}),
      });
      setTokens(data.accessToken, data.refreshToken);
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      setWalletStep('done');
      toast.success(`Signed in`, { description: 'Welcome to Xing Huang', duration: 4000, style: { background: '#0D1A26', border: '1px solid rgba(0,223,169,0.22)', color: '#F8FAFC' } });
      setTimeout(onClose, 1300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setWalletError(msg);
      setWalletStep('idle');
    } finally { tronActive.current = false; }
  }

  async function handlePhantom() {
    setWalletError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ph = (window as any).solana;
    if (!ph?.isPhantom) { setWalletError('Phantom not found. Install from phantom.app.'); return; }
    phantomActive.current = true;
    setWalletStep('signing');
    try {
      if (!ph.isConnected) await ph.connect();
      const solAddr: string = ph.publicKey.toString();
      const { nonce, message } = await api.get<{ nonce: string; message: string }>(
        `/auth/wallet/nonce/solana?address=${encodeURIComponent(solAddr)}`
      );
      const encoded = new TextEncoder().encode(message);
      const { signature } = await ph.signMessage(encoded, 'utf8') as { signature: Uint8Array; publicKey: unknown };
      const sigHex = Array.from(signature).map((b: unknown) => (b as number).toString(16).padStart(2, '0')).join('');
      setWalletStep('verifying');
      const storedRef = sessionStorage.getItem('cb_ref');
      const data = await api.post<AuthResponse>('/auth/wallet/verify/solana', {
        address: solAddr, signature: sigHex, nonce,
        ...(storedRef ? { referralCode: storedRef } : {}),
      });
      setTokens(data.accessToken, data.refreshToken);
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      setWalletStep('done');
      toast.success('Signed in', { description: 'Welcome to Xing Huang', duration: 4000, style: { background: '#0D1A26', border: '1px solid rgba(0,223,169,0.22)', color: '#F8FAFC' } });
      setTimeout(onClose, 1300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setWalletError(msg);
      setWalletStep('idle');
    } finally { phantomActive.current = false; }
  }

  async function handleTon() {
    setWalletError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ton = (window as any).ton;
    if (!ton?.send) { setWalletError('No TON wallet found. Install Tonkeeper extension.'); return; }
    tonWalletActive.current = true;
    setWalletStep('signing');
    try {
      const accounts = await ton.send('ton_requestAccounts') as string[];
      const tonAddress = accounts?.[0];
      if (!tonAddress) throw new Error('No TON account returned');
      const { nonce, message } = await api.get<{ nonce: string; message: string }>(
        `/auth/wallet/nonce/ton?address=${encodeURIComponent(tonAddress)}`
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let verifyBody: Record<string, any>;
      try {
        const proofResult = await ton.send('ton_requestProof', {
          address: tonAddress, payload: nonce,
          domain: { lengthBytes: window.location.host.length, value: window.location.host },
          timestamp: Math.floor(Date.now() / 1000),
        }) as { signature: string; timestamp: number; domain: { lengthBytes: number; value: string }; payload: string };
        verifyBody = { address: tonAddress, nonce, proof: { signature: proofResult.signature, timestamp: proofResult.timestamp, domain: proofResult.domain, payload: proofResult.payload } };
      } catch {
        const result = await ton.send('ton_signMessage', { data: btoa(message) }) as { signature: string; publicKey: string };
        verifyBody = { address: tonAddress, signature: result.signature, nonce };
      }
      const storedRef = sessionStorage.getItem('cb_ref');
      if (storedRef) verifyBody.referralCode = storedRef;
      setWalletStep('verifying');
      const data = await api.post<AuthResponse>('/auth/wallet/verify/ton', verifyBody);
      setTokens(data.accessToken, data.refreshToken);
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      setWalletStep('done');
      toast.success('Signed in', { description: 'Welcome to Xing Huang', duration: 4000, style: { background: '#0D1A26', border: '1px solid rgba(0,223,169,0.22)', color: '#F8FAFC' } });
      setTimeout(onClose, 1300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setWalletError(msg);
      setWalletStep('idle');
    } finally { tonWalletActive.current = false; }
  }

  function handleWalletClick(name: string) {
    switch (name) {
      case 'MetaMask':      handleMetaMask();    break;
      case 'WalletConnect': handleWalletConnect(); break;
      case 'TronLink':   void handleTronLink(); break;
      case 'Phantom':    void handlePhantom();  break;
      case 'TON Wallet': void handleTon();      break;
    }
  }

  if (!open) return null;

  const isWalletWorking = walletStep === 'waiting_wallet' || walletStep === 'signing' || walletStep === 'verifying';
  const isBlocked       = isWalletWorking;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
      <style>{`
        @keyframes amFadeSlide { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes amShimmer   { 0%,100%{background-position:200% center} 50%{background-position:0% center} }
        @keyframes amCheckIn   { 0%{transform:scale(0) rotate(-15deg);opacity:0} 60%{transform:scale(1.15) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes amPulseRing { 0%{transform:scale(1);opacity:0.5} 80%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#050A12]/90 backdrop-blur-md"
        onClick={isBlocked ? undefined : onClose}
      />

      {/* Card */}
      <div
        className="relative w-full sm:max-w-[460px] rounded-t-[28px] sm:rounded-[24px] overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #0E1B2C 0%, #0B1219 45%, #080F15 100%)',
          border: '1px solid rgba(0,223,169,0.14)',
          boxShadow: '0 -8px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
          animation: 'amFadeSlide 0.38s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Shimmer top bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: 'linear-gradient(90deg, transparent 0%, #00DFA9 20%, #38BDF8 50%, #00DFA9 80%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'amShimmer 3.5s ease-in-out infinite',
        }} />

        {/* Corner glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(0,223,169,0.08) 0%,transparent 65%)' }} />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.07) 0%,transparent 65%)' }} />

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3.5 pb-0">
          <div className="w-10 h-[3px] rounded-full bg-white/15" />
        </div>

        {/* Close button */}
        {!isBlocked && (
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8]/40 hover:text-[#F8FAFC] hover:bg-white/[0.07] transition-all z-10">
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="px-6 sm:px-7 pt-6 pb-6 flex flex-col gap-5">

          {/* ── SUCCESS STATE ── */}
          {walletStep === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle,rgba(0,223,169,0.14) 0%,transparent 70%)', border: '1px solid rgba(0,223,169,0.22)', animation: 'amCheckIn 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
                <CheckCircle2 className="w-10 h-10 text-[#00DFA9]" />
              </div>
              <div className="text-center">
                <p className="text-[18px] font-black text-[#F8FAFC]">You're in!</p>
                <p className="text-[13px] text-[#94A3B8]/55 mt-1">Welcome to Xing Huang Sports Trading</p>
              </div>
            </div>
          )}

          {/* ── WALLET WORKING STATE ── */}
          {isWalletWorking && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#00DFA9 0%,#00B88A 100%)', boxShadow: '0 0 32px rgba(0,223,169,0.25)' }}>
                  <Wallet className="w-7 h-7 text-[#031A10]" />
                </div>
                {[0, 1].map(i => (
                  <div key={i} className="absolute inset-0 rounded-2xl"
                    style={{ border: '1.5px solid rgba(0,223,169,0.4)', animation: `amPulseRing 2s ease-out ${i * 0.7}s infinite` }} />
                ))}
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-[#F8FAFC]">
                  {walletStep === 'waiting_wallet' ? 'Connecting wallet…' : walletStep === 'signing' ? 'Waiting for signature…' : 'Verifying…'}
                </p>
                <p className="text-[12px] text-[#94A3B8]/50 mt-1">
                  {walletStep === 'signing' ? 'Approve the message in your wallet' : walletStep === 'verifying' ? 'Confirming identity…' : 'Select your wallet'}
                </p>
              </div>
            </div>
          )}

          {/* ── MAIN FORM ── */}
          {walletStep !== 'done' && !isWalletWorking && (
            <>
              {/* Header */}
              <div className="text-center">
                <h2 className="text-[20px] font-black text-[#F8FAFC] tracking-tight">
                  Connect your wallet
                </h2>
                <p className="text-[12px] text-[#94A3B8]/50 mt-1">
                  Sign in to Xing Huang with your wallet
                </p>
              </div>

              {/* Wallet error */}
              {walletError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle className="h-3.5 w-3.5 text-[#EF4444] shrink-0" />
                  <p className="text-[12px] text-[#EF4444]">{walletError}</p>
                </div>
              )}

              {/* Referral code (optional) */}
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/35 pointer-events-none" />
                <input
                  type="text"
                  value={refCode}
                  onChange={e => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
                    setRefCode(v);
                    if (v) sessionStorage.setItem('cb_ref', v); else sessionStorage.removeItem('cb_ref');
                  }}
                  placeholder="Referral code (optional)"
                  autoComplete="off"
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-[13px] text-[#00DFA9] font-mono tracking-widest placeholder:text-[#94A3B8]/35 placeholder:tracking-normal placeholder:font-sans outline-none transition-all duration-150"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(0,223,169,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,223,169,0.08)'; }}
                  onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* ── Wallet buttons ── */}
              <div className="grid grid-cols-5 gap-2">
                {WALLET_OPTS.map(w => (
                  <button
                    key={w.name}
                    onClick={() => handleWalletClick(w.name)}
                    title={w.name}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all duration-150 hover:scale-[1.05] active:scale-[0.97] cursor-pointer"
                    style={{ background: w.bg, border: `1px solid ${w.border}` }}
                  >
                    <span className="text-[11px] font-black tracking-tight" style={{ color: w.color }}>{w.short}</span>
                    <span className="text-[9px] text-[#94A3B8]/40 font-medium text-center leading-tight">{w.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
