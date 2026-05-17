import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useWallet } from '../hooks/useWallet';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WALLETS = [
  {
    name: 'MetaMask',
    icon: '🦊',
    color: '#F6851B',
    description: 'Connect using browser extension',
  },
  {
    name: 'WalletConnect',
    icon: '🔗',
    color: '#3B99FC',
    description: 'Scan with your mobile wallet',
  },
  {
    name: 'Coinbase Wallet',
    icon: '💙',
    color: '#0052FF',
    description: 'Connect with Coinbase Wallet',
  },
  {
    name: 'Phantom',
    icon: '👻',
    color: '#AB9FF2',
    description: 'Solana & multi-chain wallet',
  },
];

export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  const { connect, isConnecting, walletName, isConnected } = useWallet();

  async function handleSelect(name: string) {
    await connect(name);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={val => { if (!isConnecting) onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden bg-[#0D1117] border border-[#253241] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        <DialogTitle className="sr-only">Connect Wallet</DialogTitle>

        {/* Top accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-transparent" />

        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-bold text-[#F8FAFC]">Connect Wallet</DialogTitle>
          <p className="text-sm text-[#94A3B8] mt-1">
            Choose your preferred wallet to browse and place bets
          </p>
        </DialogHeader>

        {/* Wallet list */}
        <div className="px-4 pb-2 space-y-2">
          {WALLETS.map(wallet => {
            const isThisConnecting = isConnecting && walletName === wallet.name;
            return (
              <button
                key={wallet.name}
                onClick={() => handleSelect(wallet.name)}
                disabled={isConnecting}
                data-testid={`button-wallet-${wallet.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200',
                  isThisConnecting
                    ? 'bg-[#00DFA9]/5 border-[#00DFA9]/40 shadow-[0_0_20px_rgba(0,223,169,0.1)]'
                    : isConnecting
                    ? 'bg-[#121821] border-[#253241] opacity-40 cursor-not-allowed'
                    : 'bg-[#121821] border-[#253241] hover:bg-[#18212B] hover:border-[#2E3D50] cursor-pointer group'
                )}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `${wallet.color}18`,
                    border: `1.5px solid ${wallet.color}40`,
                  }}
                >
                  {isThisConnecting
                    ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: wallet.color }} />
                    : <span>{wallet.icon}</span>
                  }
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#F8FAFC]">{wallet.name}</div>
                  <div className="text-xs text-[#94A3B8]">
                    {isThisConnecting ? 'Connecting…' : wallet.description}
                  </div>
                </div>

                {/* Chevron / spinner */}
                {isThisConnecting ? (
                  <div
                    className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                    style={{ borderColor: `${wallet.color}60`, borderTopColor: wallet.color }}
                  />
                ) : (
                  <svg
                    className="h-4 w-4 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/70 transition-colors shrink-0"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 mt-2 border-t border-[#253241] flex items-center justify-between">
          <p className="text-[11px] text-[#94A3B8]/50">
            Mock connection — no real wallet required
          </p>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
            data-testid="button-cancel-wallet"
            className="text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
