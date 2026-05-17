import { Link } from 'wouter';
import { Search, Wallet, TrendingUp, Menu, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useState } from 'react';

export function Header() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-gradient-to-b from-[#121821] to-[#0f1620] border-b border-[#253241] backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex h-full items-center px-4 md:px-6">
        <div className="flex items-center gap-2 mr-4 md:mr-8">
          <Menu className="h-6 w-6 lg:hidden text-[#94A3B8]" />
          <Link href="/" className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#00DFA9] animate-pulse" />
            <div className="flex flex-col hidden sm:flex">
              <span className="text-xl font-bold tracking-tight text-white leading-none">OddsChain</span>
              <span className="text-[10px] text-[#94A3B8] leading-none">Sports Trading</span>
            </div>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 text-sm h-full">
          <Link href="/" className="text-[#F8FAFC] font-semibold flex items-center h-full border-b-2 border-[#00DFA9] transition-colors relative">
            All Sports
          </Link>
          <span className="text-[#94A3B8] cursor-not-allowed flex items-center h-full hover:text-[#F8FAFC] transition-colors">
            In-Play
            <span className="text-[9px] bg-[#253241] text-[#94A3B8] px-1 py-0.5 rounded-sm ml-1 uppercase">SOON</span>
          </span>
          <span className="text-[#94A3B8] cursor-not-allowed flex items-center h-full hover:text-[#F8FAFC] transition-colors">
            My Bets
            <span className="text-[9px] bg-[#253241] text-[#94A3B8] px-1 py-0.5 rounded-sm ml-1 uppercase">SOON</span>
          </span>
        </nav>

        <div className="ml-auto flex items-center space-x-2 md:space-x-4">
          <Button variant="ghost" size="icon" className="size-8 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-transparent">
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          
          <Button variant="ghost" size="icon" className="size-8 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-transparent">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          <div className="w-[1px] h-6 bg-[#253241] mx-1"></div>
          
          <Button 
            className="bg-[#00DFA9] hover:bg-[#00DFA9]/90 text-[#0B0F14] font-semibold border-0 h-9 py-1.5 px-4 rounded-lg text-sm transition-all hover:shadow-[0_0_20px_rgba(0,223,169,0.4)] hover:scale-[1.02]" 
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
