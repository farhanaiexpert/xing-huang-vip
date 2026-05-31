import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import {
  X, QrCode, Zap, CreditCard, Wallet, ArrowRight, Lock,
  Shield, Clock, CheckCircle2,
  Copy, Check, ChevronRight, ExternalLink, AlertCircle, ChevronDown,
  RefreshCw, ArrowLeft, Sparkles,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useEvmWallet } from '../hooks/useEvmWallet';
import { useAutoDeposit } from '../hooks/useAutoDeposit';
import { useWallet } from '../hooks/useWallet';
import { api } from '../lib/apiClient';

type ModalView = 'methods' | 'npp-form' | 'npp-invoice' | 'npp-success' | 'npp-failed' | 'plisio-form' | 'plisio-invoice' | 'plisio-success' | 'plisio-failed' | 'phantom-form' | 'ton-form';

interface NppPayment {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  priceCurrency: string;
  expiresAt: string | null;
}

interface PlisioInvoice {
  invoiceId: string;
  walletHash: string;
  pendingAmount: string;
  currency: string;
  amount: number;
  expiresAt: string | null;
}

const ERC20_ADDRESS = (import.meta.env.VITE_PLATFORM_ERC20_ADDRESS as string) || '';
const TRC20_ADDRESS = (import.meta.env.VITE_PLATFORM_TRC20_ADDRESS as string) || '';
const SOL_ADDRESS   = (import.meta.env.VITE_PLATFORM_SOL_ADDRESS   as string) || '';
const TON_ADDR      = (import.meta.env.VITE_PLATFORM_TON_ADDRESS   as string) || '';

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

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function NppAddressCopy({ address }: { address: string }) {
  const { copied, copy } = useCopy(address);
  return (
    <div
      className="rounded-xl p-3.5"
      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(56,189,248,0.20)' }}
    >
      <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Send to this address</p>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[12px] font-mono text-[#F8FAFC] break-all leading-relaxed">{address}</p>
        <button
          onClick={copy}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
          style={copied
            ? { background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.3)' }
            : { background: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.20)' }
          }
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

const NPP_PENDING_KEY    = 'npp_pending_deposit';
const PLISIO_PENDING_KEY = 'plisio_pending_deposit';

export function ConnectWalletModal({ open, onOpenChange, isOpen, onClose }: ConnectWalletModalProps) {
  const isVisible = open ?? isOpen ?? false;
  const [authOpen, setAuthOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const evmWallet = useEvmWallet();
  const { address, isConnected } = evmWallet;
  const { refreshBalance } = useWallet();

  const [connecting, setConnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const {
    depositAmount, setDepositAmount,
    depositPhase, depositError, depositResult,
    isProcessing, hasTronLink, hasPhantom, hasTon, chainCfg,
    handleEvmDeposit: runEvmDeposit, handleTronDeposit: runTronDeposit,
    resetDeposit, clearError,
  } = useAutoDeposit();

  function handleEvmDeposit() { if (!user) { setAuthOpen(true); return; } runEvmDeposit(); }
  function handleTronDeposit() { if (!user) { setAuthOpen(true); return; } runTronDeposit(); }

  const reownStep: 'idle' | 'connecting' | 'connected' = isConnected && address
    ? 'connected'
    : connecting
      ? 'connecting'
      : 'idle';

  function close() {
    onOpenChange?.(false);
    onClose?.();
  }

  async function handleConnectWallet() {
    if (!user) { setAuthOpen(true); return; }
    close();
    setConnecting(true);
    await evmWallet.connect();
    setConnecting(false);
  }

  function handleDisconnect() {
    evmWallet.disconnect();
    resetDeposit();
  }

  useEffect(() => {
    if (!isConnected) resetDeposit();
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── NowPayments inline flow ──────────────────────────────────────────────────
  const [view, setView] = useState<ModalView>('methods');
  const [nppAmount, setNppAmount] = useState('');
  const [nppCurrency, setNppCurrency] = useState<string>('usdttrc20');
  const [nppPayment, setNppPayment] = useState<NppPayment | null>(null);
  const [nppTimeLeft, setNppTimeLeft] = useState(0);
  const [nppCreating, setNppCreating] = useState(false);
  const [nppError, setNppError] = useState('');

  function resetNpp() {
    setView('methods');
    setNppAmount('');
    setNppCurrency('usdttrc20');
    setNppPayment(null);
    setNppTimeLeft(0);
    setNppCreating(false);
    setNppError('');
  }

  function handleNppClick() {
    if (!user) { setAuthOpen(true); return; }
    setNppError('');
    setView('npp-form');
  }

  // ── Plisio inline flow ───────────────────────────────────────────────────────
  const [plisioAmount, setPlisioAmount] = useState('');
  const [plisioCurrency, setPlisioCurrency] = useState<'USDTTRC20' | 'USDTERC20' | 'BTC' | 'ETH' | 'LTC' | 'BNB' | 'XRP'>('USDTTRC20');
  const [plisioInvoice, setPlisioInvoice] = useState<PlisioInvoice | null>(null);
  const [plisioTimeLeft, setPlisioTimeLeft] = useState(0);
  const [plisioCreating, setPlisioCreating] = useState(false);
  const [plisioError, setPlisioError] = useState('');

  function resetPlisio() {
    setView('methods');
    setPlisioAmount('');
    setPlisioCurrency('USDTTRC20' as const);
    setPlisioInvoice(null);
    setPlisioTimeLeft(0);
    setPlisioCreating(false);
    setPlisioError('');
  }

  function handlePlisioClick() {
    if (!user) { setAuthOpen(true); return; }
    setPlisioError('');
    setView('plisio-form');
  }

  // ── Phantom (Solana USDT SPL) one-click send ─────────────────────────────────
  const [phantomAmount,     setPhantomAmount]     = useState('');
  const [phantomTxHash,     setPhantomTxHash]     = useState('');
  const [phantomPhase,      setPhantomPhase]      = useState<'idle'|'connecting'|'approving'|'confirming'|'submitting'>('idle');
  const [phantomError,      setPhantomError]      = useState('');
  const [phantomSubmitting, setPhantomSubmitting] = useState(false);
  const [phantomVerified,   setPhantomVerified]   = useState<boolean | null>(null);

  function resetPhantom() {
    setView('methods');
    setPhantomAmount('');
    setPhantomTxHash('');
    setPhantomPhase('idle');
    setPhantomError('');
    setPhantomSubmitting(false);
    setPhantomVerified(null);
  }

  async function handlePhantomSend() {
    const amount = parseFloat(phantomAmount);
    if (!phantomAmount || isNaN(amount) || amount < 1) {
      setPhantomError('Minimum deposit is 1 USDT');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solana = (window as any).solana;
    if (!solana?.isPhantom) {
      setPhantomError('Phantom wallet not detected. Please install Phantom from phantom.app and try again.');
      return;
    }
    setPhantomSubmitting(true);
    setPhantomPhase('connecting');
    setPhantomError('');
    try {
      await solana.connect();
      const userPubKeyStr: string = solana.publicKey.toString();

      const { Connection, PublicKey, Transaction } = await import('@solana/web3.js');
      const { createTransferInstruction, getAssociatedTokenAddress } = await import('@solana/spl-token');

      const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
      const USDT_MINT  = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'; // USDT SPL mainnet

      const connection  = new Connection(SOLANA_RPC, 'confirmed');
      const userPubKey  = new PublicKey(userPubKeyStr);
      const platPubKey  = new PublicKey(SOL_ADDRESS!);
      const mintPubKey  = new PublicKey(USDT_MINT);

      const fromATA = await getAssociatedTokenAddress(mintPubKey, userPubKey);
      const toATA   = await getAssociatedTokenAddress(mintPubKey, platPubKey);

      const tx = new Transaction();
      tx.add(createTransferInstruction(fromATA, toATA, userPubKey, BigInt(Math.round(amount * 1_000_000))));

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = userPubKey;

      setPhantomPhase('approving');
      const { signature } = await solana.signAndSendTransaction(tx);

      setPhantomPhase('confirming');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

      setPhantomPhase('submitting');
      const result = await api.post<{ autoVerified: boolean }>('/wallet/deposit', {
        txHash: signature, amount, network: 'SOLANA',
      });
      await refreshBalance();
      setPhantomTxHash(signature);
      setPhantomVerified(result.autoVerified);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPhantomError(/reject|cancel|denied/i.test(msg) ? 'Transaction cancelled.' : msg.slice(0, 120));
    } finally {
      setPhantomSubmitting(false);
      setPhantomPhase('idle');
    }
  }

  // ── TON USDT Jetton one-click send ───────────────────────────────────────────
  const [tonAmount,     setTonAmount]     = useState('');
  const [tonTxHash,     setTonTxHash]     = useState('');
  const [tonPhase,      setTonPhase]      = useState<'idle'|'connecting'|'fetching'|'approving'|'confirming'|'submitting'>('idle');
  const [tonError,      setTonError]      = useState('');
  const [tonSubmitting, setTonSubmitting] = useState(false);
  const [tonVerified,   setTonVerified]   = useState<boolean | null>(null);

  function resetTon() {
    setView('methods');
    setTonAmount('');
    setTonTxHash('');
    setTonPhase('idle');
    setTonError('');
    setTonSubmitting(false);
    setTonVerified(null);
  }

  async function handleTonSend() {
    const amount = parseFloat(tonAmount);
    if (!tonAmount || isNaN(amount) || amount < 1) {
      setTonError('Minimum deposit is 1 USDT');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ton = (window as any).ton;
    if (!ton?.send) {
      setTonError('No TON wallet found. Install Tonkeeper browser extension and try again.');
      return;
    }
    setTonSubmitting(true);
    setTonPhase('connecting');
    setTonError('');
    try {
      const accounts = await ton.send('ton_requestAccounts') as string[];
      const userAddress = accounts?.[0];
      if (!userAddress) throw new Error('No TON account available — please unlock your wallet');

      // Fetch user's USDT Jetton wallet address (Jetton = USDT on TON)
      const USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
      setTonPhase('fetching');
      const jr = await fetch(
        `https://tonapi.io/v2/accounts/${encodeURIComponent(userAddress)}/jettons/${encodeURIComponent(USDT_MASTER)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!jr.ok) throw new Error('USDT Jetton wallet not found. Ensure you hold USDT on TON network.');
      const jd = await jr.json() as { jetton_wallet_address?: { address: string } };
      const jettonWallet = jd.jetton_wallet_address?.address;
      if (!jettonWallet) throw new Error('Could not resolve your USDT Jetton wallet address');

      // Build Jetton transfer body cell
      const { beginCell, Address, toNano } = await import('@ton/core');
      const body = beginCell()
        .storeUint(0x0f8a7ea5, 32)                           // Jetton transfer op
        .storeUint(0n, 64)                                    // query_id
        .storeCoins(BigInt(Math.round(amount * 1_000_000)))   // amount (6 decimals)
        .storeAddress(Address.parse(TON_ADDR!))               // destination (platform)
        .storeAddress(Address.parse(userAddress))             // response_destination
        .storeBit(false)                                      // no custom_payload
        .storeCoins(1n)                                       // forward_ton_amount (min)
        .storeBit(false)                                      // no forward_payload
        .endCell();

      const bocBytes  = body.toBoc();
      let bocBase64 = '';
      for (let i = 0; i < bocBytes.length; i++) bocBase64 += String.fromCharCode(bocBytes[i]);
      bocBase64 = btoa(bocBase64);

      setTonPhase('approving');
      const txResult = await ton.send('ton_sendTransaction', {
        to:       jettonWallet,
        value:    toNano('0.1').toString(),   // 0.1 TON for gas
        dataType: 'boc',
        data:     bocBase64,
      }) as { boc?: string } | string;

      const bocStr = (typeof txResult === 'object' && txResult?.boc) ? txResult.boc
                   : typeof txResult === 'string' ? txResult : '';

      // Compute external message hash for TONapi transaction lookup
      setTonPhase('confirming');
      let txHash = bocStr;
      if (bocStr) {
        try {
          const { Cell } = await import('@ton/core');
          const bocData = Uint8Array.from(atob(bocStr), c => c.charCodeAt(0));
          const cells = Cell.fromBoc(Buffer.from(bocData));
          txHash = Buffer.from(cells[0].hash()).toString('hex');
        } catch { /* use raw BOC string as fallback identifier */ }
      }

      setTonPhase('submitting');
      const result = await api.post<{ autoVerified: boolean }>('/wallet/deposit', {
        txHash, amount, network: 'TON',
      });
      await refreshBalance();
      setTonTxHash(txHash);
      setTonVerified(result.autoVerified);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTonError(msg.slice(0, 120));
    } finally {
      setTonSubmitting(false);
      setTonPhase('idle');
    }
  }

  async function createPlisioPayment() {
    const amount = parseFloat(plisioAmount);
    if (!plisioAmount || isNaN(amount) || amount < 10) {
      setPlisioError('Minimum deposit is 10 USDT');
      return;
    }
    setPlisioCreating(true);
    setPlisioError('');
    try {
      const result = await api.post<PlisioInvoice & { status: string }>(
        '/wallet/deposit/plisio/create',
        { amount, currency: plisioCurrency }
      );
      setPlisioInvoice(result);
      const timeLeft = result.expiresAt
        ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
        : 20 * 60;
      setPlisioTimeLeft(timeLeft);
      setView('plisio-invoice');
      localStorage.setItem(PLISIO_PENDING_KEY, JSON.stringify({
        invoiceId: result.invoiceId,
        amount,
        currency: plisioCurrency,
        expiresAt: result.expiresAt ?? new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      }));
      window.dispatchEvent(new Event('storage'));
    } catch (err: unknown) {
      setPlisioError(err instanceof Error ? err.message : 'Failed to create invoice. Please try again.');
    } finally {
      setPlisioCreating(false);
    }
  }

  async function createNppPayment() {
    const amount = parseFloat(nppAmount);
    if (!nppAmount || isNaN(amount) || amount < 10) {
      setNppError('Minimum deposit is 10 USDT');
      return;
    }
    setNppCreating(true);
    setNppError('');
    try {
      const result = await api.post<NppPayment & { status: string; expiresAt: string | null }>(
        '/wallet/deposit/nowpayments/create',
        { amount, currency: nppCurrency }
      );
      setNppPayment(result);
      const timeLeft = result.expiresAt
        ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
        : 20 * 60;
      setNppTimeLeft(timeLeft);
      setView('npp-invoice');
      localStorage.setItem(NPP_PENDING_KEY, JSON.stringify({
        paymentId: result.paymentId,
        amount,
        currency: nppCurrency,
        expiresAt: result.expiresAt ?? new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      }));
      window.dispatchEvent(new Event('storage'));
    } catch (err: unknown) {
      setNppError(err instanceof Error ? err.message : 'Failed to create payment. Please try again.');
    } finally {
      setNppCreating(false);
    }
  }

  useEffect(() => {
    if (view !== 'npp-invoice' || nppTimeLeft <= 0) return;
    const id = setInterval(() => {
      setNppTimeLeft(prev => {
        if (prev <= 1) {
          setView('npp-failed');
          localStorage.removeItem(NPP_PENDING_KEY);
          window.dispatchEvent(new Event('storage'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view !== 'npp-invoice' || !nppPayment) return;
    const id = setInterval(async () => {
      try {
        const r = await api.get<{ status: string; credited: boolean }>(
          `/wallet/deposit/nowpayments/${nppPayment.paymentId}/status`
        );
        if (r.credited || r.status === 'finished' || r.status === 'confirmed') {
          setView('npp-success');
          localStorage.removeItem(NPP_PENDING_KEY);
          window.dispatchEvent(new Event('storage'));
          await refreshBalance();
        } else if (r.status === 'failed' || r.status === 'refunded' || r.status === 'rejected') {
          setView('npp-failed');
          localStorage.removeItem(NPP_PENDING_KEY);
          window.dispatchEvent(new Event('storage'));
        }
      } catch { /* silent — poll again next tick */ }
    }, 15_000);
    return () => clearInterval(id);
  }, [view, nppPayment]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Plisio countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'plisio-invoice' || plisioTimeLeft <= 0) return;
    const id = setInterval(() => {
      setPlisioTimeLeft(prev => {
        if (prev <= 1) {
          setView('plisio-failed');
          localStorage.removeItem(PLISIO_PENDING_KEY);
          window.dispatchEvent(new Event('storage'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Plisio poll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'plisio-invoice' || !plisioInvoice) return;
    const id = setInterval(async () => {
      try {
        const r = await api.get<{ status: string; credited: boolean }>(
          `/wallet/deposit/plisio/${plisioInvoice.invoiceId}/status`
        );
        if (r.credited || r.status === 'completed') {
          setView('plisio-success');
          localStorage.removeItem(PLISIO_PENDING_KEY);
          window.dispatchEvent(new Event('storage'));
          await refreshBalance();
        } else if (r.status === 'cancelled' || r.status === 'error' || r.status === 'expired' || r.status === 'rejected') {
          setView('plisio-failed');
          localStorage.removeItem(PLISIO_PENDING_KEY);
          window.dispatchEvent(new Event('storage'));
        }
      } catch { /* silent — poll again next tick */ }
    }, 15_000);
    return () => clearInterval(id);
  }, [view, plisioInvoice]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isVisible) {
      setView('methods');
    }
  }, [isVisible]);

  if (!isVisible && !authOpen) return null;

  const NPP_META: Record<string, { label: string; color: string }> = {
    usdttrc20:   { label: 'TRC-20 (Tron)',    color: '#00DFA9' },
    usdterc20:   { label: 'ERC-20 (ETH)',     color: '#627EEA' },
    usdtbsc:     { label: 'BEP-20 (BSC)',     color: '#F0B90B' },
    usdtpolygon: { label: 'Polygon',          color: '#8247E5' },
    usdtsol:     { label: 'Solana SPL',       color: '#9945FF' },
    usdtarbi:    { label: 'Arbitrum',         color: '#28A0F0' },
    usdtton:     { label: 'TON',              color: '#0098EA' },
    usdtbase:    { label: 'Base',             color: '#0052FF' },
    xrp:         { label: 'XRP',             color: '#346AA9' },
    btc:         { label: 'Bitcoin',          color: '#F7931A' },
    eth:         { label: 'Ethereum',         color: '#627EEA' },
    bnbbsc:      { label: 'BNB',             color: '#F0B90B' },
    ltc:         { label: 'Litecoin',         color: '#A5A9B4' },
  };
  const { label: networkLabel, color: networkColor } = NPP_META[nppCurrency] ?? { label: nppCurrency.toUpperCase(), color: '#38BDF8' };
  const timerPercent = nppPayment
    ? (nppTimeLeft / (nppPayment.expiresAt
        ? Math.max(1, Math.floor((new Date(nppPayment.expiresAt).getTime() - Date.now() + nppTimeLeft * 1000) / 1000))
        : 20 * 60)) * 100
    : 100;

  const headerConfig: Record<ModalView, { title: string; subtitle: string; showBack: boolean; onBack?: () => void }> = {
    'methods':        { title: 'Add Funds',          subtitle: 'Choose how you want to deposit USDT',           showBack: false },
    'npp-form':       { title: 'Crypto Deposit',     subtitle: 'Generate a unique payment address',             showBack: true  },
    'npp-invoice':    { title: 'Awaiting Payment',   subtitle: 'Send exactly the amount shown below',           showBack: false },
    'npp-success':    { title: 'Deposit Confirmed',  subtitle: 'Balance updated successfully',                  showBack: false },
    'npp-failed':     { title: 'Payment Expired',    subtitle: 'This invoice is no longer valid',               showBack: true  },
    'plisio-form':    { title: 'Pay via Plisio',     subtitle: 'Generate a unique Plisio address',              showBack: true  },
    'plisio-invoice': { title: 'Awaiting Payment',   subtitle: 'Send exactly the amount shown below',           showBack: false },
    'plisio-success': { title: 'Deposit Confirmed',  subtitle: 'Balance updated successfully',                  showBack: false },
    'plisio-failed':  { title: 'Invoice Expired',    subtitle: 'This invoice is no longer valid',               showBack: true  },
    'phantom-form':   { title: 'Phantom Deposit',    subtitle: 'Send Solana USDT directly from Phantom',        showBack: true, onBack: resetPhantom },
    'ton-form':       { title: 'TON Deposit',        subtitle: 'Send USDT Jetton directly from Tonkeeper',      showBack: true, onBack: resetTon     },
  };
  const hdr = headerConfig[view];

  return createPortal(
    <>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={(view === 'npp-invoice' || view === 'plisio-invoice') ? undefined : close} />

          <div
            className="relative w-full max-w-[460px] rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)]"
            style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, #00DFA9 0%, #38BDF8 50%, #A78BFA 100%)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                {hdr.showBack && (
                  <button
                    onClick={hdr.onBack ?? (view.startsWith('plisio') ? resetPlisio : resetNpp)}
                    className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.07] transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-[17px] font-black text-[#F8FAFC] tracking-tight">{hdr.title}</h2>
                  <p className="text-[12px] text-[#64748B] mt-0.5">{hdr.subtitle}</p>
                </div>
              </div>
              {view !== 'npp-invoice' && view !== 'plisio-invoice' && (
                <button
                  onClick={close}
                  className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.07] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="px-4 py-4 space-y-3 max-h-[80vh] overflow-y-auto">

              {/* ══════════ PHANTOM (SOLANA) FORM VIEW ══════════ */}
              {view === 'phantom-form' && (
                <div className="space-y-4">
                  {phantomVerified !== null ? (
                    <div className="space-y-4 py-2">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,223,169,0.12)', border: '2px solid rgba(0,223,169,0.35)', boxShadow: '0 0 32px rgba(0,223,169,0.15)' }}>
                          <CheckCircle2 className="w-8 h-8 text-[#00DFA9]" />
                        </div>
                        <div>
                          <p className="text-[20px] font-black text-[#00DFA9]">
                            {phantomVerified ? 'Deposit Verified!' : 'Deposit Submitted!'}
                          </p>
                          <p className="text-[13px] text-[#64748B] mt-1">
                            {phantomVerified ? 'Your balance has been credited instantly.' : 'Under review — usually credited within 5–30 min.'}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl p-2.5 text-[10px] font-mono text-[#64748B] break-all"
                        style={{ background: 'rgba(0,0,0,0.2)' }}>
                        TxHash: {phantomTxHash}
                      </div>
                      <button onClick={close}
                        className="w-full py-3 rounded-xl text-[14px] font-black text-[#0B0F14] transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.25)' }}>
                        Done ✓
                      </button>
                      <button onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_wallet_tab', 'history'); }}
                        className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#9945FF] border border-[#9945FF]/20 hover:bg-[#9945FF]/10 transition-all">
                        View Transaction History →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl p-4 flex items-center gap-3"
                        style={{ background: 'rgba(153,69,255,0.06)', border: '1px solid rgba(153,69,255,0.20)' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(153,69,255,0.15)', border: '1px solid rgba(153,69,255,0.30)' }}>
                          <Wallet className="w-4 h-4 text-[#9945FF]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#F8FAFC]">Phantom · Solana USDT SPL</p>
                          <p className="text-[11px] text-[#64748B]">Enter amount and click Send — Phantom signs and broadcasts automatically</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#64748B] mb-1.5 uppercase tracking-wider">Amount (USDT)</label>
                        <div className="relative">
                          <input type="number" min="1" step="1" value={phantomAmount}
                            onChange={e => { setPhantomAmount(e.target.value); setPhantomError(''); }}
                            disabled={phantomSubmitting}
                            className="w-full rounded-xl px-4 py-3.5 text-[16px] font-bold text-[#F8FAFC] pr-16 outline-none disabled:opacity-60"
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(153,69,255,0.25)' }}
                            placeholder="50" autoFocus
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#9945FF]">USDT</span>
                        </div>
                        <p className="text-[10px] text-[#64748B] mt-1">Minimum: 1 USDT · SPL token (Solana network)</p>
                      </div>

                      {phantomError && (
                        <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-red-400">{phantomError}</p>
                        </div>
                      )}

                      <button onClick={handlePhantomSend} disabled={phantomSubmitting || !SOL_ADDRESS || !phantomAmount}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-black text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait"
                        style={{ background: 'linear-gradient(135deg, #9945FF 0%, #7B2FBE 100%)', boxShadow: '0 0 20px rgba(153,69,255,0.25)' }}>
                        {phantomSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {phantomPhase === 'connecting'  && 'Connecting…'}
                            {phantomPhase === 'approving'   && 'Approve in Phantom…'}
                            {phantomPhase === 'confirming'  && 'Confirming on Solana…'}
                            {phantomPhase === 'submitting'  && 'Crediting balance…'}
                            {phantomPhase === 'idle'        && 'Processing…'}
                          </>
                        ) : (
                          <><Zap className="w-4 h-4" /> Send via Phantom</>
                        )}
                      </button>

                      <div className="flex items-center gap-2 p-3 rounded-xl text-[11px]"
                        style={{ background: 'rgba(0,223,169,0.04)', border: '1px solid rgba(0,223,169,0.12)' }}>
                        <Zap className="w-3.5 h-3.5 text-[#00DFA9] shrink-0" />
                        <p className="text-[#64748B]"><span className="text-[#00DFA9] font-semibold">One-click</span> — Phantom signs and sends; balance credited after on-chain confirmation</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══════════ TON FORM VIEW ══════════ */}
              {view === 'ton-form' && (
                <div className="space-y-4">
                  {tonVerified !== null ? (
                    <div className="space-y-4 py-2">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,223,169,0.12)', border: '2px solid rgba(0,223,169,0.35)', boxShadow: '0 0 32px rgba(0,223,169,0.15)' }}>
                          <CheckCircle2 className="w-8 h-8 text-[#00DFA9]" />
                        </div>
                        <div>
                          <p className="text-[20px] font-black text-[#00DFA9]">
                            {tonVerified ? 'Deposit Verified!' : 'Deposit Submitted!'}
                          </p>
                          <p className="text-[13px] text-[#64748B] mt-1">
                            {tonVerified ? 'Your balance has been credited instantly.' : 'Under review — usually credited within 5–30 min.'}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl p-2.5 text-[10px] font-mono text-[#64748B] break-all"
                        style={{ background: 'rgba(0,0,0,0.2)' }}>
                        TxHash: {tonTxHash}
                      </div>
                      <button onClick={close}
                        className="w-full py-3 rounded-xl text-[14px] font-black text-[#0B0F14] transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.25)' }}>
                        Done ✓
                      </button>
                      <button onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_wallet_tab', 'history'); }}
                        className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#0098EA] border border-[#0098EA]/20 hover:bg-[#0098EA]/10 transition-all">
                        View Transaction History →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl p-4 flex items-center gap-3"
                        style={{ background: 'rgba(0,152,234,0.06)', border: '1px solid rgba(0,152,234,0.20)' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(0,152,234,0.15)', border: '1px solid rgba(0,152,234,0.30)' }}>
                          <Wallet className="w-4 h-4 text-[#0098EA]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#F8FAFC]">TON Wallet · USDT Jetton</p>
                          <p className="text-[11px] text-[#64748B]">Enter amount and click Send — Tonkeeper signs and broadcasts automatically</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#64748B] mb-1.5 uppercase tracking-wider">Amount (USDT)</label>
                        <div className="relative">
                          <input type="number" min="1" step="1" value={tonAmount}
                            onChange={e => { setTonAmount(e.target.value); setTonError(''); }}
                            disabled={tonSubmitting}
                            className="w-full rounded-xl px-4 py-3.5 text-[16px] font-bold text-[#F8FAFC] pr-16 outline-none disabled:opacity-60"
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,152,234,0.25)' }}
                            placeholder="50" autoFocus
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#0098EA]">USDT</span>
                        </div>
                        <p className="text-[10px] text-[#64748B] mt-1">Minimum: 1 USDT · TON network (Jetton)</p>
                      </div>

                      {tonError && (
                        <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-red-400">{tonError}</p>
                        </div>
                      )}

                      <button onClick={handleTonSend} disabled={tonSubmitting || !TON_ADDR || !tonAmount}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-black text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait"
                        style={{ background: 'linear-gradient(135deg, #0098EA 0%, #0077C2 100%)', boxShadow: '0 0 20px rgba(0,152,234,0.25)' }}>
                        {tonSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {tonPhase === 'connecting'  && 'Connecting…'}
                            {tonPhase === 'fetching'    && 'Fetching Jetton wallet…'}
                            {tonPhase === 'approving'   && 'Approve in Tonkeeper…'}
                            {tonPhase === 'confirming'  && 'Confirming on TON…'}
                            {tonPhase === 'submitting'  && 'Crediting balance…'}
                            {tonPhase === 'idle'        && 'Processing…'}
                          </>
                        ) : (
                          <><Zap className="w-4 h-4" /> Send via TON Wallet</>
                        )}
                      </button>

                      <div className="flex items-center gap-2 p-3 rounded-xl text-[11px]"
                        style={{ background: 'rgba(0,223,169,0.04)', border: '1px solid rgba(0,223,169,0.12)' }}>
                        <Zap className="w-3.5 h-3.5 text-[#00DFA9] shrink-0" />
                        <p className="text-[#64748B]"><span className="text-[#00DFA9] font-semibold">One-click</span> — Tonkeeper signs and sends USDT Jetton; balance credited after confirmation</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══════════ NPP FORM VIEW ══════════ */}
              {view === 'npp-form' && (
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)' }}>
                      <Zap className="w-4.5 h-4.5 text-[#38BDF8]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#F8FAFC]">NOWPayments</p>
                      <p className="text-[11px] text-[#64748B]">A unique address will be generated for you — balance credited automatically</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1.5 uppercase tracking-wider">
                      Amount (USDT)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        step="1"
                        value={nppAmount}
                        onChange={e => { setNppAmount(e.target.value); setNppError(''); }}
                        disabled={nppCreating}
                        className="w-full rounded-xl px-4 py-3.5 text-[16px] font-bold text-[#F8FAFC] pr-16 outline-none disabled:opacity-60"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.25)' }}
                        placeholder="50"
                        autoFocus
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#38BDF8]">USDT</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1">Minimum: 10 USDT</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1.5 uppercase tracking-wider">
                      Network
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { val: 'usdttrc20',   label: 'TRC-20',   sub: 'Tron·Best',  color: '#00DFA9' },
                        { val: 'usdterc20',   label: 'ERC-20',   sub: 'Ethereum',   color: '#627EEA' },
                        { val: 'usdtbsc',     label: 'BEP-20',   sub: 'BSC',        color: '#F0B90B' },
                        { val: 'usdtpolygon', label: 'Polygon',  sub: 'MATIC',      color: '#8247E5' },
                        { val: 'usdtarbi',    label: 'Arbitrum', sub: 'ARB One',    color: '#28A0F0' },
                        { val: 'usdtsol',     label: 'Solana',   sub: 'SPL',        color: '#9945FF' },
                        { val: 'usdtton',     label: 'TON',      sub: 'TON',        color: '#0098EA' },
                        { val: 'usdtbase',    label: 'Base',     sub: 'Base',       color: '#0052FF' },
                        { val: 'btc',         label: 'Bitcoin',  sub: 'BTC',        color: '#F7931A' },
                        { val: 'eth',         label: 'ETH',      sub: 'Native',     color: '#627EEA' },
                        { val: 'bnbbsc',      label: 'BNB',      sub: 'BSC',        color: '#F0B90B' },
                        { val: 'xrp',         label: 'XRP',      sub: 'Ripple',     color: '#346AA9' },
                        { val: 'ltc',         label: 'LTC',      sub: 'Litecoin',   color: '#A5A9B4' },
                      ] as { val: string; label: string; sub: string; color: string }[]).map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => setNppCurrency(opt.val)}
                          disabled={nppCreating}
                          className="relative rounded-xl p-3 text-left transition-all"
                          style={nppCurrency === opt.val
                            ? { background: `${opt.color}1A`, border: `2px solid ${opt.color}60` }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                          }
                        >
                          {nppCurrency === opt.val && (
                            <span className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                              style={{ background: opt.color }}>
                              <Check className="w-2 h-2 text-[#0B0F14]" />
                            </span>
                          )}
                          <p className="text-[13px] font-bold text-[#F8FAFC]">{opt.label}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: opt.color }}>{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {nppError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-400">{nppError}</p>
                    </div>
                  )}

                  <button
                    onClick={createNppPayment}
                    disabled={nppCreating}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-black text-[#0B0F14] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait"
                    style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)', boxShadow: '0 0 20px rgba(56,189,248,0.25)' }}
                  >
                    {nppCreating
                      ? <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Creating Invoice…</>
                      : <>Generate Invoice <ChevronRight className="w-4 h-4" /></>
                    }
                  </button>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { icon: <Shield className="w-3 h-3" />, label: 'Secure', color: '#38BDF8' },
                      { icon: <Zap className="w-3 h-3" />, label: 'Auto-credit', color: '#00DFA9' },
                      { icon: <Clock className="w-3 h-3" />, label: '~20 min window', color: '#FACC15' },
                    ].map(({ icon, label, color }) => (
                      <div key={label} className="flex flex-col items-center gap-1 text-center p-2 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ color }}>{icon}</span>
                        <span className="text-[9px] text-[#64748B]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ NPP INVOICE VIEW ══════════ */}
              {view === 'npp-invoice' && nppPayment && (
                <div className="space-y-3">
                  {/* Amount to send */}
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}
                  >
                    <p className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mb-1">Send exactly</p>
                    <p className="text-[28px] font-black text-[#F8FAFC] leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {nppPayment.payAmount.toFixed(6)}
                    </p>
                    <p className="text-[14px] font-bold mt-1" style={{ color: networkColor }}>
                      {nppPayment.payCurrency.toUpperCase().replace('USDT', 'USDT ')} · {networkLabel}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1">≈ ${nppPayment.priceAmount.toFixed(2)} USD</p>
                  </div>

                  {/* Address */}
                  <NppAddressCopy address={nppPayment.payAddress} />

                  {/* Timer */}
                  <div
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}
                  >
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(250,204,21,0.15)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#FACC15" strokeWidth="3"
                          strokeDasharray={`${(timerPercent / 100) * 94.2} 94.2`}
                          strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s linear' }} />
                      </svg>
                      <Clock className="w-3.5 h-3.5 text-[#FACC15] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-black text-[#FACC15]">{formatCountdown(nppTimeLeft)}</p>
                      <p className="text-[10px] text-[#64748B]">Invoice expires — send before it runs out</p>
                    </div>
                  </div>

                  {/* Polling indicator */}
                  <div
                    className="flex items-center gap-2.5 rounded-xl p-3"
                    style={{ background: 'rgba(0,223,169,0.05)', border: '1px solid rgba(0,223,169,0.15)' }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#00DFA9] animate-spin shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-[#00DFA9]">Watching for your payment…</p>
                      <p className="text-[10px] text-[#64748B]">Checking every 15 seconds · Balance credited automatically on confirmation</p>
                    </div>
                  </div>

                  {/* Warning */}
                  <div
                    className="flex items-start gap-2 rounded-xl p-3"
                    style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.12)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-[#FACC15] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#FACC15] leading-relaxed">
                      Send <strong>exactly</strong> the amount shown. Sending less or more may delay or prevent credit.
                    </p>
                  </div>

                  {/* Close note */}
                  <p className="text-[10px] text-[#64748B] text-center">
                    You can close this window — your deposit is tracked automatically.
                  </p>
                  <button
                    onClick={close}
                    className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#64748B] hover:text-[#94A3B8] transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Close (payment tracked in background)
                  </button>
                </div>
              )}

              {/* ══════════ NPP SUCCESS VIEW ══════════ */}
              {view === 'npp-success' && (
                <div className="space-y-4 py-2">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,223,169,0.12)', border: '2px solid rgba(0,223,169,0.35)', boxShadow: '0 0 32px rgba(0,223,169,0.15)' }}>
                      <CheckCircle2 className="w-8 h-8 text-[#00DFA9]" />
                    </div>
                    <div>
                      <p className="text-[20px] font-black text-[#00DFA9]">Deposit Confirmed!</p>
                      <p className="text-[13px] text-[#64748B] mt-1">
                        {nppPayment ? `$${nppPayment.priceAmount.toFixed(2)} USDT` : 'Your deposit'} has been credited to your account
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={close}
                    className="w-full py-3 rounded-xl text-[14px] font-black text-[#0B0F14] transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.25)' }}
                  >
                    Done ✓
                  </button>
                  <button
                    onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_wallet_tab', 'history'); }}
                    className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#38BDF8] border border-[#38BDF8]/20 hover:bg-[#38BDF8]/10 transition-all"
                  >
                    View Transaction History →
                  </button>
                </div>
              )}

              {/* ══════════ NPP FAILED VIEW ══════════ */}
              {view === 'npp-failed' && (
                <div className="space-y-4 py-2">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.10)', border: '2px solid rgba(239,68,68,0.25)' }}>
                      <Clock className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-red-400">Invoice Expired</p>
                      <p className="text-[13px] text-[#64748B] mt-1">
                        This payment invoice has expired. Please generate a new one to deposit.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setView('npp-form'); setNppPayment(null); setNppTimeLeft(0); }}
                    className="w-full py-3 rounded-xl text-[14px] font-black text-[#0B0F14] transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)' }}
                  >
                    Try Again →
                  </button>
                  <button
                    onClick={close}
                    className="w-full py-2 rounded-xl text-[12px] font-bold text-[#64748B] hover:text-[#94A3B8] transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* ══════════ PLISIO FORM VIEW ══════════ */}
              {view === 'plisio-form' && (
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.20)' }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.30)' }}>
                      <CreditCard className="w-4.5 h-4.5 text-[#A855F7]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#F8FAFC]">Plisio</p>
                      <p className="text-[11px] text-[#64748B]">A unique address will be generated — balance credited automatically</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1.5 uppercase tracking-wider">
                      Amount (USDT)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        step="1"
                        value={plisioAmount}
                        onChange={e => { setPlisioAmount(e.target.value); setPlisioError(''); }}
                        disabled={plisioCreating}
                        className="w-full rounded-xl px-4 py-3.5 text-[16px] font-bold text-[#F8FAFC] pr-16 outline-none disabled:opacity-60"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.30)' }}
                        placeholder="50"
                        autoFocus
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#A855F7]">USDT</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1">Minimum: 10 USDT</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] mb-1.5 uppercase tracking-wider">
                      Network
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { val: 'USDTTRC20' as const, label: 'TRC-20',  sub: 'Tron·Best', color: '#00DFA9' },
                        { val: 'USDTERC20' as const, label: 'ERC-20',  sub: 'Ethereum',  color: '#627EEA' },
                        { val: 'BTC'       as const, label: 'Bitcoin', sub: 'BTC',       color: '#F7931A' },
                        { val: 'ETH'       as const, label: 'ETH',     sub: 'Native',    color: '#627EEA' },
                        { val: 'LTC'       as const, label: 'LTC',     sub: 'Litecoin',  color: '#A5A9B4' },
                        { val: 'BNB'       as const, label: 'BNB',     sub: 'BSC',       color: '#F0B90B' },
                        { val: 'XRP'       as const, label: 'XRP',     sub: 'Ripple',    color: '#346AA9' },
                      ]).map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => setPlisioCurrency(opt.val)}
                          disabled={plisioCreating}
                          className="relative rounded-xl p-2.5 text-left transition-all"
                          style={plisioCurrency === opt.val
                            ? { background: `${opt.color}1A`, border: `2px solid ${opt.color}60` }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                          }
                        >
                          {plisioCurrency === opt.val && (
                            <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full flex items-center justify-center"
                              style={{ background: opt.color }}>
                              <Check className="w-1.5 h-1.5 text-[#0B0F14]" />
                            </span>
                          )}
                          <p className="text-[12px] font-bold text-[#F8FAFC]">{opt.label}</p>
                          <p className="text-[9px] mt-0.5" style={{ color: opt.color }}>{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {plisioError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-400">{plisioError}</p>
                    </div>
                  )}

                  <button
                    onClick={createPlisioPayment}
                    disabled={plisioCreating}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-black text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)', boxShadow: '0 0 20px rgba(168,85,247,0.30)' }}
                  >
                    {plisioCreating
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Invoice…</>
                      : <>Generate Invoice <ChevronRight className="w-4 h-4" /></>
                    }
                  </button>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { icon: <Shield className="w-3 h-3" />, label: 'Secure', color: '#A855F7' },
                      { icon: <Zap className="w-3 h-3" />, label: 'Auto-credit', color: '#00DFA9' },
                      { icon: <Clock className="w-3 h-3" />, label: '~20 min window', color: '#FACC15' },
                    ].map(({ icon, label, color }) => (
                      <div key={label} className="flex flex-col items-center gap-1 text-center p-2 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ color }}>{icon}</span>
                        <span className="text-[9px] text-[#64748B]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════ PLISIO INVOICE VIEW ══════════ */}
              {view === 'plisio-invoice' && plisioInvoice && (() => {
                const plisioNetworkLabel = plisioCurrency === 'USDTTRC20' ? 'TRC-20 (Tron)' : 'ERC-20 (Ethereum)';
                const plisioNetworkColor = plisioCurrency === 'USDTTRC20' ? '#00DFA9' : '#627EEA';
                const plisioTimerPct = (plisioTimeLeft / (plisioInvoice.expiresAt
                  ? Math.max(1, Math.floor((new Date(plisioInvoice.expiresAt).getTime() - Date.now() + plisioTimeLeft * 1000) / 1000))
                  : 20 * 60)) * 100;
                return (
                  <div className="space-y-3">
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.20)' }}
                    >
                      <p className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mb-1">Send exactly</p>
                      <p className="text-[28px] font-black text-[#F8FAFC] leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {parseFloat(plisioInvoice.pendingAmount).toFixed(6)}
                      </p>
                      <p className="text-[14px] font-bold mt-1" style={{ color: plisioNetworkColor }}>
                        {plisioInvoice.currency.replace('USDT', 'USDT ')} · {plisioNetworkLabel}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1">≈ ${plisioInvoice.amount.toFixed ? plisioInvoice.amount.toFixed(2) : plisioInvoice.amount} USD</p>
                    </div>

                    <NppAddressCopy address={plisioInvoice.walletHash} />

                    <div
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}
                    >
                      <div className="relative w-10 h-10 shrink-0">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(250,204,21,0.15)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#FACC15" strokeWidth="3"
                            strokeDasharray={`${(plisioTimerPct / 100) * 94.2} 94.2`}
                            strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s linear' }} />
                        </svg>
                        <Clock className="w-3.5 h-3.5 text-[#FACC15] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-black text-[#FACC15]">{formatCountdown(plisioTimeLeft)}</p>
                        <p className="text-[10px] text-[#64748B]">Invoice expires — send before it runs out</p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2.5 rounded-xl p-3"
                      style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#A855F7] animate-spin shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-[#A855F7]">Watching for your payment…</p>
                        <p className="text-[10px] text-[#64748B]">Checking every 15 seconds · Balance credited automatically on confirmation</p>
                      </div>
                    </div>

                    <div
                      className="flex items-start gap-2 rounded-xl p-3"
                      style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.12)' }}
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-[#FACC15] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#FACC15] leading-relaxed">
                        Send <strong>exactly</strong> the amount shown. Sending less or more may delay or prevent credit.
                      </p>
                    </div>

                    <p className="text-[10px] text-[#64748B] text-center">
                      You can close this window — your deposit is tracked automatically.
                    </p>
                    <button
                      onClick={close}
                      className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#64748B] hover:text-[#94A3B8] transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Close (payment tracked in background)
                    </button>
                  </div>
                );
              })()}

              {/* ══════════ PLISIO SUCCESS VIEW ══════════ */}
              {view === 'plisio-success' && (
                <div className="space-y-4 py-2">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,223,169,0.12)', border: '2px solid rgba(0,223,169,0.35)', boxShadow: '0 0 32px rgba(0,223,169,0.15)' }}>
                      <CheckCircle2 className="w-8 h-8 text-[#00DFA9]" />
                    </div>
                    <div>
                      <p className="text-[20px] font-black text-[#00DFA9]">Deposit Confirmed!</p>
                      <p className="text-[13px] text-[#64748B] mt-1">
                        {plisioInvoice ? `$${plisioInvoice.amount} USDT` : 'Your deposit'} has been credited to your account
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={close}
                    className="w-full py-3 rounded-xl text-[14px] font-black text-[#0B0F14] transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.25)' }}
                  >
                    Done ✓
                  </button>
                  <button
                    onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_wallet_tab', 'history'); }}
                    className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#A855F7] border border-[#A855F7]/20 hover:bg-[#A855F7]/10 transition-all"
                  >
                    View Transaction History →
                  </button>
                </div>
              )}

              {/* ══════════ PLISIO FAILED VIEW ══════════ */}
              {view === 'plisio-failed' && (
                <div className="space-y-4 py-2">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.10)', border: '2px solid rgba(239,68,68,0.25)' }}>
                      <Clock className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-red-400">Invoice Expired</p>
                      <p className="text-[13px] text-[#64748B] mt-1">
                        This Plisio invoice has expired. Please generate a new one to deposit.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setView('plisio-form'); setPlisioInvoice(null); setPlisioTimeLeft(0); }}
                    className="w-full py-3 rounded-xl text-[14px] font-black text-white transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)' }}
                  >
                    Try Again →
                  </button>
                  <button
                    onClick={close}
                    className="w-full py-2 rounded-xl text-[12px] font-bold text-[#64748B] hover:text-[#94A3B8] transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* ══════════ METHODS VIEW ══════════ */}
              {view === 'methods' && (
                <>
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
                    /* Wallet Connected: Auto-Deposit UI */
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,223,169,0.08) 0%, rgba(0,196,154,0.03) 100%)',
                        border: '1px solid rgba(0,223,169,0.30)',
                        boxShadow: '0 0 24px rgba(0,223,169,0.06)',
                      }}
                    >
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
                                onClick={() => { if (!isProcessing) void evmWallet.connect(); }}
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

                          {!chainCfg && !hasTronLink && (
                            <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                              style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.20)' }}>
                              <AlertCircle className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" />
                              <p className="text-[#FACC15]">
                                Your wallet is on an unsupported network. Switch to <strong>ETH, BSC, Polygon, Arbitrum, Optimism,</strong> or <strong>Base</strong> to deposit USDT.
                              </p>
                            </div>
                          )}

                          {depositPhase === 'error' && depositError && (
                            <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <p className="text-red-400 flex-1">{depositError}</p>
                            </div>
                          )}

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

                          <div className="pt-1 border-t border-white/[0.05]">
                            <button
                              onClick={() => { close(); navigate('/account/wallet'); sessionStorage.setItem('cupbett_deposit_method', 'wallet'); }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-[#A78BFA] transition-colors hover:text-[#C4B5FD]"
                              style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}
                            >
                              <ExternalLink className="w-3 h-3" /> Go to full Deposit page
                            </button>
                          </div>

                          <div>
                            <button
                              onClick={() => setShowManual(m => !m)}
                              className="flex items-center gap-1.5 text-[11px] text-[#64748B] hover:text-[#94A3B8] transition-colors w-full"
                            >
                              <QrCode className="w-3 h-3" />
                              Manual USDT address
                              <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showManual ? 'rotate-180' : ''}`} />
                            </button>
                            {showManual && (
                              <div className="mt-2 space-y-2">
                                {TRC20_ADDRESS && (
                                  <AddressRow label="USDT" address={TRC20_ADDRESS} network="TRC-20" color="#00DFA9" />
                                )}
                                {ERC20_ADDRESS && (
                                  <AddressRow label="USDT" address={ERC20_ADDRESS} network="ERC-20 / BEP-20 / Polygon / Arbitrum / Optimism" color="#627EEA" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TRONLINK STANDALONE: shown when TronLink detected but EVM wallet not connected ── */}
                  {hasTronLink && reownStep !== 'connected' && (
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,223,169,0.08) 0%, rgba(0,196,154,0.03) 100%)',
                        border: '1px solid rgba(0,223,169,0.30)',
                        boxShadow: '0 0 24px rgba(0,223,169,0.06)',
                      }}
                    >
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
                          <button
                            onClick={close}
                            className="w-full py-2 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all"
                            style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.30)' }}>
                              <Wallet className="w-4 h-4 text-[#00DFA9]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[13px] font-black text-[#F8FAFC]">TronLink Detected</p>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                                  style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.30)' }}>
                                  TRC-20
                                </span>
                              </div>
                              <p className="text-[10px] text-[#64748B]">Deposit USDT directly from your TRON wallet</p>
                            </div>
                          </div>

                          {depositPhase === 'error' && depositError && (
                            <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <p className="text-red-400 flex-1">{depositError}</p>
                            </div>
                          )}

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
                                onChange={e => { setDepositAmount(e.target.value); clearError(); }}
                                disabled={isProcessing}
                                className="w-full rounded-xl px-4 py-3 text-[15px] font-bold text-[#F8FAFC] pr-16 outline-none disabled:opacity-60"
                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,223,169,0.25)' }}
                                placeholder="50"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#00DFA9]">USDT</span>
                            </div>
                            <p className="text-[10px] text-[#64748B] mt-1">Minimum: 10 USDT · TRC-20 only</p>
                          </div>

                          <button
                            onClick={handleTronDeposit}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait disabled:scale-100"
                            style={{
                              background: isProcessing
                                ? 'rgba(0,223,169,0.15)'
                                : 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)',
                              color: isProcessing ? '#00DFA9' : '#0B0F14',
                              boxShadow: isProcessing ? 'none' : '0 0 20px rgba(0,223,169,0.30)',
                            }}
                          >
                            {depositPhase === 'sending' ? (
                              <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Approve in TronLink…</>
                            ) : depositPhase === 'confirming' ? (
                              <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Waiting for confirmation…</>
                            ) : depositPhase === 'submitting' ? (
                              <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Verifying on-chain…</>
                            ) : (
                              <>Deposit via TronLink TRC-20 <ChevronRight className="w-4 h-4" /></>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── PHANTOM (Solana USDT SPL) ── */}
                  <button
                    onClick={() => { if (!user) { setAuthOpen(true); return; } setView('phantom-form'); }}
                    className="w-full text-left rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(153,69,255,0.11) 0%, rgba(123,47,190,0.05) 100%)',
                      border: '1px solid rgba(153,69,255,0.28)',
                      boxShadow: '0 0 20px rgba(153,69,255,0.05)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(153,69,255,0.22) 0%, rgba(123,47,190,0.10) 100%)',
                          border: '1px solid rgba(153,69,255,0.38)',
                          boxShadow: '0 0 12px rgba(153,69,255,0.15)',
                        }}>
                        <Wallet className="w-5 h-5 text-[#9945FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[15px] font-black text-[#F8FAFC]">Phantom Wallet</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: 'rgba(153,69,255,0.15)', color: '#9945FF', border: '1px solid rgba(153,69,255,0.30)' }}>
                            Solana
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                            style={{ background: 'rgba(0,223,169,0.12)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.25)' }}>
                            <Zap className="w-2 h-2" />Auto
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(153,69,255,0.80)' }}>USDT SPL · Solana network</p>
                        <p className="text-[12px] text-[#94A3B8] leading-relaxed">
                          Send USDT on Solana and paste the TxHash — auto-verified and credited instantly.
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0 mt-1 group-hover:text-[#9945FF] transition-colors" />
                    </div>
                  </button>

                  {/* ── TON USDT (Jetton) ── */}
                  <button
                    onClick={() => { if (!user) { setAuthOpen(true); return; } setView('ton-form'); }}
                    className="w-full text-left rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,152,234,0.11) 0%, rgba(0,120,185,0.05) 100%)',
                      border: '1px solid rgba(0,152,234,0.28)',
                      boxShadow: '0 0 20px rgba(0,152,234,0.05)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0,152,234,0.22) 0%, rgba(0,120,185,0.10) 100%)',
                          border: '1px solid rgba(0,152,234,0.38)',
                          boxShadow: '0 0 12px rgba(0,152,234,0.15)',
                        }}>
                        <Wallet className="w-5 h-5 text-[#0098EA]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[15px] font-black text-[#F8FAFC]">TON Wallet</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: 'rgba(0,152,234,0.15)', color: '#0098EA', border: '1px solid rgba(0,152,234,0.30)' }}>
                            TON
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                            style={{ background: 'rgba(0,223,169,0.12)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.25)' }}>
                            <Zap className="w-2 h-2" />Auto
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(0,152,234,0.80)' }}>USDT Jetton · TON network</p>
                        <p className="text-[12px] text-[#94A3B8] leading-relaxed">
                          Send USDT on TON and paste the TxHash — auto-verified and credited instantly.
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0 mt-1 group-hover:text-[#0098EA] transition-colors" />
                    </div>
                  </button>

                  {/* ── OPTION 2: NowPayments ── */}
                  <button
                    onClick={handleNppClick}
                    className="w-full text-left rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(56,189,248,0.11) 0%, rgba(14,165,233,0.05) 100%)',
                      border: '1px solid rgba(56,189,248,0.28)',
                      boxShadow: '0 0 20px rgba(56,189,248,0.05)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(56,189,248,0.22) 0%, rgba(14,165,233,0.10) 100%)',
                          border: '1px solid rgba(56,189,248,0.38)',
                          boxShadow: '0 0 12px rgba(56,189,248,0.15)',
                        }}>
                        <Zap className="w-5 h-5 text-[#38BDF8]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[15px] font-black text-[#F8FAFC]">Crypto Deposit</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.30)' }}>
                            NOWPayments
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                            style={{ background: 'rgba(250,204,21,0.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.25)' }}>
                            <Sparkles className="w-2 h-2" />Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-[#38BDF8]/80 font-semibold mb-1.5">USDT TRC-20 · ERC-20 · 100+ coins</p>
                        <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">
                          Get a unique deposit address. Balance credited automatically on confirmation — no TxHash needed.
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
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Min 10 USDT</span>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all w-fit group-hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)', boxShadow: '0 0 16px rgba(56,189,248,0.35)' }}>
                          {user ? 'Deposit with Crypto' : 'Sign In to Deposit'}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* ── OPTION 3: Plisio ── */}
                  <button
                    onClick={handlePlisioClick}
                    className="w-full text-left rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(124,58,237,0.05) 100%)',
                      border: '1px solid rgba(168,85,247,0.25)',
                      boxShadow: '0 0 18px rgba(168,85,247,0.05)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(124,58,237,0.10) 100%)',
                          border: '1px solid rgba(168,85,247,0.38)',
                          boxShadow: '0 0 12px rgba(168,85,247,0.15)',
                        }}>
                        <CreditCard className="w-5 h-5 text-[#A855F7]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[15px] font-black text-[#F8FAFC]">Crypto Deposit</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.30)' }}>
                            Plisio
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A855F7]/80 font-semibold mb-1.5">USDT TRC-20 · ERC-20</p>
                        <p className="text-[12px] text-[#94A3B8] leading-relaxed mb-3">
                          Pay via Plisio gateway. Get a unique deposit address — balance auto-credited on confirmation.
                        </p>

                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#A855F7]">
                            <CreditCard className="w-3 h-3" /> Unique address
                          </span>
                          <span className="w-px h-3 bg-white/[0.1]" />
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8]">
                            <CheckCircle2 className="w-3 h-3" /> Auto-credited
                          </span>
                          <span className="w-px h-3 bg-white/[0.1]" />
                          <span className="text-[11px] font-semibold text-[#94A3B8]">Min 10 USDT</span>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-black text-white transition-all w-fit group-hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)', boxShadow: '0 0 16px rgba(168,85,247,0.35)' }}>
                          {user ? 'Deposit via Plisio' : 'Sign In to Deposit'}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* ── OPTION 4: Manual ── */}
                  <button
                    onClick={() => { close(); if (user) { navigate('/account/wallet'); sessionStorage.setItem('cupbett_deposit_method', 'manual'); } else { setAuthOpen(true); } }}
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

                  {/* Trust bar */}
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
                </>
              )}
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
