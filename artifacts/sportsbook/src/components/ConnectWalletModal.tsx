import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Wallet } from 'lucide-react';

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const wallets = [
  {
    name: 'MetaMask',
    color: '#F6851B',
    description: 'Connect using browser extension',
  },
  {
    name: 'WalletConnect',
    color: '#3B99FC',
    description: 'Scan with your mobile wallet',
  },
  {
    name: 'Coinbase Wallet',
    color: '#0052FF',
    description: 'Connect with Coinbase Wallet',
  },
];

export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1B352D] border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center mb-2">Connect Wallet</DialogTitle>
          <p className="text-center text-muted-foreground text-sm">Choose your preferred wallet to continue</p>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          {wallets.map((wallet) => (
            <Button
              key={wallet.name}
              variant="outline"
              className="w-full justify-start h-14 bg-black/20 border-border hover:bg-black/30 hover:text-white"
              onClick={() => onOpenChange(false)}
              data-testid={`button-wallet-${wallet.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div
                className="mr-4 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: wallet.color + '22', border: `1.5px solid ${wallet.color}` }}
              >
                <Wallet className="h-4 w-4" style={{ color: wallet.color }} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">{wallet.name}</div>
                <div className="text-xs text-muted-foreground">{wallet.description}</div>
              </div>
            </Button>
          ))}
        </div>
        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-white"
            data-testid="button-cancel-wallet"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
