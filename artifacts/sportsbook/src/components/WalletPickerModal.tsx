import { useId, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type WalletTag = 'full' | 'dapp';

interface WalletOption {
  name: string;
  icon: string;
  tag: WalletTag;
}

/** Wallet list — order, names, icons and support tags match the reference design. */
const WALLETS: WalletOption[] = [
  { name: 'TronLink',    icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TronLink.png',                                  tag: 'full' },
  { name: 'OKX',         icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/OKX.svg',                                       tag: 'full' },
  { name: 'Bitget',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/BitGet.svg',                                    tag: 'full' },
  { name: 'imToken',     icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/imToken.svg',                                   tag: 'dapp' },
  { name: 'TokenPocket', icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TokenPocket.svg',                               tag: 'dapp' },
  { name: 'Trust',       icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TrustWallet.svg',                               tag: 'dapp' },
  { name: 'Portal',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Portal.svg',                                    tag: 'dapp' },
  { name: 'FoxWallet',   icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/FoxWallet.svg',                                 tag: 'dapp' },
  { name: 'BitPie',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/e8570352728f9524148d395e9b9f39ed_icon.png',     tag: 'dapp' },
  { name: 'MetaMask',    icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/MetaMask.svg',                                  tag: 'dapp' },
];

/** Number of wallets shown in the collapsed state before "Show more". */
const COLLAPSED_COUNT = 4;

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

function WalletRow({ wallet }: { wallet: WalletOption }) {
  return (
    <a
      href="#"
      // No real wallet wiring yet — keep the anchor semantics but block the hash jump.
      onClick={e => e.preventDefault()}
      className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 transition-all duration-200 hover:border-[#00DFA9]/40 hover:bg-white/[0.05] active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        <WalletIcon name={wallet.name} icon={wallet.icon} />
      </span>
      <span className="text-[15px] font-bold tracking-tight text-[#F8FAFC] group-hover:text-white">
        {wallet.name}
      </span>
      {wallet.tag === 'full' ? (
        <span className="ml-auto rounded-md border border-[#00DFA9]/30 bg-[#00DFA9]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00DFA9]">
          Full Support
        </span>
      ) : (
        <span className="ml-auto text-[11px] font-semibold text-[#94A3B8]/55">
          DApp Browser
        </span>
      )}
    </a>
  );
}

export function WalletPickerModal({ open, onClose }: WalletPickerModalProps) {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Reset to collapsed each time the modal opens
  useEffect(() => {
    if (open) setExpanded(false);
  }, [open]);

  // Close on Escape + lock background scroll while open
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Move focus into the dialog when it opens
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // Simple focus trap — keep Tab cycling within the dialog
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  if (!open) return null;

  const visible = expanded ? WALLETS : WALLETS.slice(0, COLLAPSED_COUNT);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#05080C]/80 backdrop-blur-sm"
        onClick={onClose}
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
          <h2 id={titleId} className="text-[15px] font-semibold tracking-wide text-[#94A3B8]">
            Connect your wallet
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8]/60 transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Wallet list */}
        <div className="flex flex-col gap-2.5 overflow-y-auto px-5 py-4 sidebar-scroll">
          {visible.map(w => (
            <WalletRow key={w.name} wallet={w} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] py-3 text-[13px] font-semibold text-[#94A3B8] transition-all duration-200 hover:border-[#00DFA9]/30 hover:text-[#F8FAFC]"
          >
            {expanded ? 'Show less' : `Show more (${WALLETS.length - COLLAPSED_COUNT})`}
          </button>
        </div>
        <div className="pb-5 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-[#94A3B8]/30">
          TRON Network
        </div>
      </div>
    </div>,
    document.body,
  );
}
