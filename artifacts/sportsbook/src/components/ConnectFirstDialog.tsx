import { useEffect, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { CONNECT_FIRST_EVENT, openWalletPicker } from '../lib/depositGate';

/**
 * Global "connect your wallet first" alert.
 * Rendered once in App. Opens on the 'cb:connect-first' event (fired by any
 * Deposit CTA when the user is not logged in). Its Connect Wallet button opens
 * the same WalletPickerModal used by the header Connect Wallet button.
 */
export function ConnectFirstDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler() { setOpen(true); }
    window.addEventListener(CONNECT_FIRST_EVENT, handler);
    return () => window.removeEventListener(CONNECT_FIRST_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(3,6,10,0.78)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[#00DFA9]/20 p-6 text-center"
        style={{ background: 'linear-gradient(135deg,#0D1A26 0%,#0B0F14 100%)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)', boxShadow: '0 0 24px rgba(0,223,169,0.2)' }}
        >
          <Wallet className="w-6 h-6 text-[#00DFA9]" />
        </div>

        <h2 className="text-[18px] font-black text-[#F8FAFC] mb-2">Connect your wallet first</h2>
        <p className="text-[13px] text-[#94A3B8] mb-6 leading-relaxed">
          Please connect your wallet first to make a deposit.
        </p>

        <button
          data-testid="button-connect-first"
          onClick={() => { setOpen(false); openWalletPicker(); }}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-black text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)', boxShadow: '0 0 28px rgba(0,223,169,0.35)' }}
        >
          <Wallet className="w-4 h-4" /> Connect Wallet
        </button>
        <button
          onClick={() => setOpen(false)}
          className="mt-2.5 w-full px-6 py-2.5 rounded-xl text-[13px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] border border-white/[0.07] hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
