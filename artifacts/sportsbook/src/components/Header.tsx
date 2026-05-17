import { Link } from 'wouter';
import { Search, Wallet, Link as LinkIcon, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useState } from 'react';
import { Input } from './ui/input';

export function Header() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 mr-4 md:mr-8">
          <Menu className="h-6 w-6 lg:hidden" />
          <Link href="/" className="flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight text-white hidden sm:inline-block">OddsChain</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-primary font-semibold">
            All Sports
          </Link>
          <span className="text-muted-foreground cursor-not-allowed">
            In-Play
          </span>
          <Link href="/offers" className="text-foreground/80 hover:text-foreground">
            Offers
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-2 md:space-x-4">
          <div className="relative flex items-center">
            {isSearchOpen ? (
              <div className="relative animate-in fade-in slide-in-from-right-5 w-48 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search events..."
                  className="pl-8 h-9 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
                  autoFocus
                  onBlur={() => setIsSearchOpen(false)}
                />
              </div>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="text-muted-foreground hover:text-foreground">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
            )}
          </div>
          
          <Button 
            className="bg-[#13644B] hover:bg-[#13644B]/90 text-white border-0" 
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
