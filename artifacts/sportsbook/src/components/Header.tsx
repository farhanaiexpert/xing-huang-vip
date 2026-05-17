import { Link } from 'wouter';
import { Search, Wallet, Link as LinkIcon, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useState } from 'react';

export function Header() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1B352D] bg-[#13644B]">
      <div className="flex h-12 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 mr-4 md:mr-8">
          <Menu className="h-6 w-6 lg:hidden text-white" />
          <Link href="/" className="flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-white" />
            <span className="text-xl font-bold tracking-tight text-white hidden sm:inline-block">OddsChain</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium h-full">
          <Link href="/" className="text-white font-semibold flex items-center h-full border-b-2 border-[#00DFA9] pt-[2px]">
            All Sports
          </Link>
          <span className="text-white/50 cursor-not-allowed flex items-center h-full pt-[2px]">
            In-Play
          </span>
          <span className="text-white/50 cursor-not-allowed flex items-center h-full pt-[2px]">
            My Bets
          </span>
        </nav>

        <div className="ml-auto flex items-center space-x-2 md:space-x-4">
          <Button variant="ghost" size="icon" className="text-white hover:text-white/80">
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          
          <Button 
            className="bg-[#1B352D] hover:bg-[#1B352D]/80 text-white border-0 h-8 px-3" 
            onClick={() => setIsWalletOpen(true)}
            data-testid="button-connect-wallet-header"
          >
            <Wallet className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </Button>
        </div>
      </div>
      
      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </header>
  );
}