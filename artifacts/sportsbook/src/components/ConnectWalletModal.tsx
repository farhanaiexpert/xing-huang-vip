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
      <img src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/meta.svg" alt="MetaMask" className="w-7 h-7 object-contain" />
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
      <img src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/4850.sp3ow1.192x192.webp" alt="Phantom" className="w-7 h-7 object-contain rounded-lg" />
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
