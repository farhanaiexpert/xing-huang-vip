import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { useWallet } from '../hooks/useWallet';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WALLETS = [
  {
    name: 'MetaMask',
    color: '#F6851B',
    description: 'Browser extension',
    popular: true,
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <path d="M35.9 4L22.3 13.7l2.5-5.9L35.9 4z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.1 4l13.5 9.8-2.4-5.9L4.1 4z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M30.9 27.8l-3.6 5.5 7.7 2.1 2.2-7.5-6.3-.1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.8 27.9l2.2 7.5 7.7-2.1-3.6-5.5-6.3.1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.3 18.2l-2.1 3.2 7.5.3-.3-8.1-5.1 4.6z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M27.7 18.2l-5.2-4.7-.3 8.2 7.5-.3-2-3.2z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.7 33.3l4.5-2.2-3.9-3-.6 5.2z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22.8 31.1l4.5 2.2-.6-5.2-3.9 3z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    name: 'WalletConnect',
    color: '#3B99FC',
    description: 'Scan with mobile',
    popular: false,
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <circle cx="20" cy="20" r="20" fill="#3B99FC" fillOpacity=".15"/>
        <path d="M11.3 16.2c4.8-4.7 12.6-4.7 17.4 0l.6.6c.2.2.2.6 0 .8l-2 2c-.1.1-.3.1-.4 0l-.8-.8c-3.3-3.3-8.7-3.3-12 0l-.9.9c-.1.1-.3.1-.4 0l-2-2c-.2-.2-.2-.6 0-.8l1.5-1.7zm21.5 4l1.8 1.8c.2.2.2.6 0 .8L27 30.4c-.2.2-.6.2-.8 0l-4.5-4.5c-.1-.1-.2-.1-.2 0l-4.5 4.5c-.2.2-.6.2-.8 0l-7.6-7.6c-.2-.2-.2-.6 0-.8l1.8-1.8c.2-.2.6-.2.8 0l4.5 4.5c.1.1.2.1.2 0l4.5-4.5c.2-.2.6-.2.8 0l4.5 4.5c.1.1.2.1.2 0l4.5-4.5c.2-.2.6-.2.8 0z" fill="#3B99FC"/>
      </svg>
    ),
  },
  {
    name: 'Coinbase Wallet',
    color: '#0052FF',
    description: 'Coinbase Wallet app',
    popular: false,
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="10" fill="#0052FF" fillOpacity=".15"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M20 7C12.8 7 7 12.8 7 20s5.8 13 13 13 13-5.8 13-13S27.2 7 20 7zm-4 9.5h8c.3 0 .5.2.5.5v6c0 .3-.2.5-.5.5h-8c-.3 0-.5-.2-.5-.5v-6c0-.3.2-.5.5-.5z" fill="#0052FF"/>
      </svg>
    ),
  },
  {
    name: 'Phantom',
    color: '#AB9FF2',
    description: 'Solana & multi-chain',
    popular: false,
    logo: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="12" fill="#AB9FF2" fillOpacity=".15"/>
        <path d="M30 15c0-4.4-4.5-8-10-8S10 10.6 10 15c0 3.6 2.6 6.7 6.4 7.8-.3 1.1-.8 2.1-1.4 3 2.5-.3 4.8-1.5 6.5-3.3.5 0 1.1.1 1.6.1 2.7 0 5.2-.8 7-2.2V21c0 3-2.5 5.5-5.6 5.5H23c-.5 0-1 .4-1 .9s.4.9 1 .9h1.5c4.2 0 7.5-3.3 7.5-7.3H30V15z" fill="#AB9FF2"/>
      </svg>
    ),
  },
];

export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  const { connect, isConnecting, walletName } = useWallet();

  async function handleSelect(name: string) {
    await connect(name);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={val => { if (!isConnecting) onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-[#0D1117] border border-[#253241] shadow-[0_32px_100px_rgba(0,0,0,0.8)]">
        <DialogTitle className="sr-only">Connect Wallet</DialogTitle>

        {/* Top gradient bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#AB9FF2]" />

        {/* Header */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-[#00DFA9]" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#F8FAFC] leading-tight">Connect your wallet</h2>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">Choose a wallet to start placing bets</p>
            </div>
          </div>
        </div>

        {/* Wallet grid */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {WALLETS.map(wallet => {
            const isThisConnecting = isConnecting && walletName === wallet.name;
            return (
              <button
                key={wallet.name}
                onClick={() => handleSelect(wallet.name)}
                disabled={isConnecting}
                data-testid={`button-wallet-${wallet.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border text-center transition-all duration-200',
                  isThisConnecting
                    ? 'bg-[#00DFA9]/5 border-[#00DFA9]/40 shadow-[0_0_24px_rgba(0,223,169,0.12)]'
                    : isConnecting
                    ? 'bg-[#121821] border-[#253241] opacity-35 cursor-not-allowed'
                    : 'bg-[#121821] border-[#253241] hover:bg-[#18212B] hover:border-[#2E3D50] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] cursor-pointer group'
                )}
              >
                {/* Popular badge */}
                {wallet.popular && !isConnecting && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider bg-[#00DFA9] text-[#0B0F14] px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}

                {/* Logo area */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{
                    backgroundColor: `${wallet.color}14`,
                    border: `1.5px solid ${wallet.color}30`,
                  }}
                >
                  {isThisConnecting
                    ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: wallet.color }} />
                    : wallet.logo
                  }
                </div>

                {/* Name + description */}
                <div className="min-w-0 w-full">
                  <div className="text-[13px] font-semibold text-[#F8FAFC] truncate">{wallet.name}</div>
                  <div className="text-[11px] text-[#94A3B8]/70 truncate mt-0.5">
                    {isThisConnecting ? 'Connecting…' : wallet.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#253241] flex items-center justify-between gap-4 bg-[#0A0E13]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]/50">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00DFA9]/60 shrink-0" />
            <span>Non-custodial &amp; encrypted</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
            data-testid="button-cancel-wallet"
            className="text-[12px] font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors disabled:opacity-40 shrink-0"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
