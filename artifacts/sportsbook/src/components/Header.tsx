import { Link, useLocation } from 'wouter';
import { Search, Wallet, BarChart2, Bell, LogOut, Copy, ChevronDown } from 'lucide-react';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useWallet } from '../hooks/useWallet';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { FORMAT_LABELS, type OddsFormat } from '../lib/oddsFormat';

export function Header() {
  const { isConnected, shortAddress, walletName, disconnect } = useWallet();
  const { format, setFormat } = useOddsFormat();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [showAddressMenu, setShowAddressMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAddressMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleCopy() {
    if (shortAddress) {
      navigator.clipboard.writeText(shortAddress).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDisconnect() {
    disconnect();
    setShowAddressMenu(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        <div
          className="flex h-14 items-center px-4 md:px-6 gap-4 border-b border-[#253241]/70 backdrop-blur-xl"
          style={{
            background: 'linear-gradient(110deg, #06101E 0%, #0D1117 45%, #071812 100%)',
            boxShadow: '0 1px 0 rgba(0,223,169,0.06), 0 4px 24px rgba(0,0,0,0.55)',
          }}
        >

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#00DFA9]/20 to-[#00DFA9]/5 border border-[#00DFA9]/30 group-hover:border-[#00DFA9]/60 group-hover:shadow-[0_0_16px_rgba(0,223,169,0.25)] transition-all duration-300">
                <BarChart2 className="h-4 w-4 text-[#00DFA9]" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-[15px] font-bold tracking-tight text-[#F8FAFC]">OddsChain</span>
                <span className="text-[10px] text-[#94A3B8]/70 font-medium tracking-wider mt-0.5">Sports Trading</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:block h-5 w-px bg-[#253241] shrink-0" />

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            <NavItem href="/"             label="All Sports"  />
            <NavItem href="/promotions"  label="Promotions"  />
            <NavItem href="/bet-history" label="Bet History" />
            <NavItem href="/help"        label="Help"        />
            <NavItem href="/"            label="In-Play" disabled soon />
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-1">
            <HeaderIconBtn aria-label="Search"><Search className="h-4 w-4" /></HeaderIconBtn>

            <div className="relative">
              <HeaderIconBtn aria-label="Notifications"><Bell className="h-4 w-4" /></HeaderIconBtn>
              <span className="pointer-events-none absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.9)]" />
            </div>

            <div className="h-5 w-px bg-[#253241] mx-1.5" />

            {/* Odds format switcher */}
            <div className="flex items-center rounded-lg bg-[#0B0F14] border border-[#253241] p-0.5 gap-0.5">
              {(Object.keys(FORMAT_LABELS) as OddsFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    'px-2.5 h-7 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150',
                    format === f
                      ? 'bg-[#18212B] text-[#00DFA9] shadow-sm'
                      : 'text-[#94A3B8]/50 hover:text-[#94A3B8]'
                  )}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-[#253241] mx-1.5" />

            {isConnected && shortAddress ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowAddressMenu(v => !v)}
                  data-testid="button-wallet-address"
                  className={cn(
                    'flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-semibold transition-all duration-200',
                    showAddressMenu
                      ? 'bg-[#18212B] border-[#00DFA9]/40 text-[#F8FAFC]'
                      : 'bg-[#121821] border-[#253241] text-[#F8FAFC] hover:bg-[#18212B] hover:border-[#2E3D50]'
                  )}
                >
                  {/* Connected dot */}
                  <span className="w-2 h-2 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.8)] shrink-0" />
                  <span className="font-mono text-xs text-[#00DFA9]">{shortAddress}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-[#94A3B8] transition-transform', showAddressMenu && 'rotate-180')} />
                </button>

                {showAddressMenu && (
                  <div className="absolute right-0 top-[calc(100%+6px)] w-52 bg-[#121821] border border-[#253241] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                    <div className="px-3 py-2.5 border-b border-[#253241]">
                      <p className="text-[10px] text-[#94A3B8]/60 uppercase tracking-wider font-medium">Connected via</p>
                      <p className="text-sm font-semibold text-[#F8FAFC] mt-0.5">{walletName}</p>
                    </div>
                    <div className="py-1">
                      <MenuAction icon={<Copy className="h-3.5 w-3.5" />} label={copied ? 'Copied!' : 'Copy Address'} onClick={handleCopy} />
                      <MenuAction icon={<LogOut className="h-3.5 w-3.5" />} label="Disconnect" onClick={handleDisconnect} danger />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                data-testid="button-connect-wallet-header"
                onClick={() => setIsWalletOpen(true)}
                className="group flex items-center gap-2 h-9 px-4 rounded-lg bg-[#00DFA9] text-[#0B0F14] text-sm font-semibold tracking-tight transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,223,169,0.45),0_0_40px_rgba(0,223,169,0.15)] hover:scale-[1.03] active:scale-[0.97]"
              >
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </>
  );
}

function HeaderIconBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all duration-150">
      {children}
    </button>
  );
}

function MenuAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
        danger
          ? 'text-[#EF4444] hover:bg-[#EF4444]/10'
          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/50'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function NavItem({ href, label, disabled, soon }: { href: string; label: string; active?: boolean; disabled?: boolean; soon?: boolean }) {
  const [location] = useLocation();
  const isActive = href === '/' ? location === '/' : location.startsWith(href);
  const base = "relative flex items-center gap-1.5 px-3 h-14 text-sm font-medium transition-all duration-150 select-none";
  if (disabled) return (
    <span className={`${base} text-[#94A3B8]/50 cursor-not-allowed`}>
      {label}
      {soon && <span className="text-[9px] font-semibold uppercase tracking-wider bg-[#253241] text-[#94A3B8] px-1.5 py-0.5 rounded">Soon</span>}
    </span>
  );
  if (isActive) return (
    <Link href={href} className={`${base} text-[#F8FAFC] font-semibold`}>
      {label}
      <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.7)]" />
    </Link>
  );
  return (
    <Link href={href} className={`${base} text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/30 rounded-md`}>
      {label}
    </Link>
  );
}
