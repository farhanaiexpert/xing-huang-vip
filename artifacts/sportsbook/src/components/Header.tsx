import { Link } from 'wouter';
import { Search, Wallet, BarChart2, Menu, Bell } from 'lucide-react';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useState } from 'react';

export function Header() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full">
        <div className="
          flex h-14 items-center px-4 md:px-6 gap-4
          bg-[#0D1117]/95
          border-b border-[#253241]/80
          backdrop-blur-xl
          shadow-[0_1px_12px_rgba(0,0,0,0.5)]
        ">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button className="lg:hidden p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/50 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="
                w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                bg-gradient-to-br from-[#00DFA9]/20 to-[#00DFA9]/5
                border border-[#00DFA9]/30
                group-hover:border-[#00DFA9]/60
                group-hover:shadow-[0_0_16px_rgba(0,223,169,0.25)]
                transition-all duration-300
              ">
                <BarChart2 className="h-4 w-4 text-[#00DFA9]" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-[15px] font-bold tracking-tight text-[#F8FAFC]">OddsChain</span>
                <span className="text-[10px] text-[#94A3B8]/70 font-medium tracking-wider mt-0.5">Sports Trading</span>
              </div>
            </Link>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-5 w-px bg-[#253241] shrink-0" />

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            <NavItem href="/" label="All Sports" active />
            <NavItem href="/" label="In-Play" disabled soon />
            <NavItem href="/" label="My Bets" disabled soon />
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <HeaderIconBtn data-testid="button-search" aria-label="Search">
              <Search className="h-4 w-4" />
            </HeaderIconBtn>

            <div className="relative">
              <HeaderIconBtn data-testid="button-notifications" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </HeaderIconBtn>
              <span className="pointer-events-none absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.9)]" />
            </div>

            <div className="h-5 w-px bg-[#253241] mx-2" />

            <button
              data-testid="button-connect-wallet-header"
              onClick={() => setIsWalletOpen(true)}
              className="
                group flex items-center gap-2
                h-9 px-4 rounded-lg
                bg-[#00DFA9] text-[#0B0F14]
                text-sm font-semibold tracking-tight
                transition-all duration-200
                hover:shadow-[0_0_20px_rgba(0,223,169,0.45),0_0_40px_rgba(0,223,169,0.15)]
                hover:scale-[1.03]
                active:scale-[0.97]
              "
            >
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </button>
          </div>
        </div>
      </header>
      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </>
  );
}

function HeaderIconBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="
        p-2 rounded-lg text-[#94A3B8]
        hover:text-[#F8FAFC] hover:bg-[#253241]/60
        transition-all duration-150
      "
    >
      {children}
    </button>
  );
}

function NavItem({
  href,
  label,
  active,
  disabled,
  soon,
}: {
  href: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  soon?: boolean;
}) {
  const base = "relative flex items-center gap-1.5 px-3 h-14 text-sm font-medium transition-all duration-150 select-none";

  if (disabled) {
    return (
      <span className={`${base} text-[#94A3B8]/50 cursor-not-allowed`}>
        {label}
        {soon && (
          <span className="text-[9px] font-semibold uppercase tracking-wider bg-[#253241] text-[#94A3B8] px-1.5 py-0.5 rounded">
            Soon
          </span>
        )}
      </span>
    );
  }

  if (active) {
    return (
      <Link href={href} className={`${base} text-[#F8FAFC] font-semibold`}>
        {label}
        <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.7)]" />
      </Link>
    );
  }

  return (
    <Link href={href} className={`${base} text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/30 rounded-md`}>
      {label}
    </Link>
  );
}
