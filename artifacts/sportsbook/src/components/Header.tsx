import { Link, useLocation } from 'wouter';
import { Search, Wallet, BarChart2, Bell, LogOut, Copy, ChevronDown, X, Globe } from 'lucide-react';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useWallet } from '../hooks/useWallet';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { FORMAT_LABELS, type OddsFormat } from '../lib/oddsFormat';

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧', short: 'EN' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸', short: 'ES' },
  { code: 'ru', label: 'Russian',    flag: '🇷🇺', short: 'RU' },
  { code: 'de', label: 'German',     flag: '🇩🇪', short: 'DE' },
  { code: 'fr', label: 'French',     flag: '🇫🇷', short: 'FR' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳', short: 'VI' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷', short: 'KO' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵', short: 'JP' },
  { code: 'hi', label: 'Hindi',      flag: '🇮🇳', short: 'HI' },
];

function triggerTranslate(langCode: string) {
  if (langCode === 'en') {
    // Restore original language
    const restore = document.querySelector<HTMLAnchorElement>('.goog-te-banner-frame') ??
      document.querySelector<HTMLAnchorElement>('a.VIpgJd-ZVi9od-ORHb-OEVmcd');
    const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
    if (select) { select.value = langCode; select.dispatchEvent(new Event('change')); }
    // Also try the cookie method for resetting
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'googtrans=; path=/; domain=' + location.hostname + '; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.reload();
    return;
  }
  const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (select) {
    select.value = langCode;
    select.dispatchEvent(new Event('change'));
  } else {
    // Widget not ready yet — set cookie and reload so Google picks it up
    document.cookie = `googtrans=/en/${langCode}; path=/`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${location.hostname}`;
    window.location.reload();
  }
}


export function Header() {
  const { isConnected, shortAddress, walletName, disconnect } = useWallet();
  const { format, setFormat } = useOddsFormat();
  const [isWalletOpen,     setIsWalletOpen]     = useState(false);
  const [showAddressMenu,  setShowAddressMenu]  = useState(false);
  const [showSearch,       setShowSearch]       = useState(false);
  const [showNotifs,       setShowNotifs]       = useState(false);
  const [showLang,         setShowLang]         = useState(false);
  const [currentLang,      setCurrentLang]      = useState('en');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [copied,           setCopied]           = useState(false);
  const menuRef   = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);
  const langRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function handleSelectLanguage(code: string) {
    setCurrentLang(code);
    setShowLang(false);
    triggerTranslate(code);
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current   && !menuRef.current.contains(e.target as Node))   setShowAddressMenu(false);
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (langRef.current   && !langRef.current.contains(e.target as Node))   setShowLang(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  // Close search on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function handleCopy() {
    if (shortAddress) {
      navigator.clipboard.writeText(shortAddress).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDisconnect() { disconnect(); setShowAddressMenu(false); }

  function handleOpenNotifs() {
    setShowNotifs(v => !v);
  }

  // Quick search results (filter mock sports/pages)
  const QUICK_LINKS = [
    { label: 'All Sports',      href: '/' },
    { label: 'WinSpin',         href: '/winspin' },
    { label: 'Promotions',      href: '/promotions' },
    { label: 'Predict & Win',   href: '/prediction-pools' },
    { label: 'Bet History',     href: '/bet-history' },
    { label: 'Help & Rules',    href: '/help' },
    { label: 'Soccer',          href: '/' },
    { label: 'Tennis',          href: '/' },
    { label: 'Basketball',      href: '/' },
    { label: 'Esports',         href: '/' },
    { label: 'Horse Racing',    href: '/' },
    { label: 'Formula 1',       href: '/' },
    { label: 'Boxing',          href: '/' },
    { label: 'Premier League',  href: '/' },
    { label: 'La Liga',         href: '/' },
    { label: 'NBA',             href: '/' },
  ];
  const searchResults = searchQuery.trim().length > 0
    ? QUICK_LINKS.filter(l => l.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <>
      {/* Search overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-[60] flex flex-col" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#0B0F14]/80 backdrop-blur-sm" />
          {/* Search panel */}
          <div
            className="relative mx-auto w-full max-w-2xl mt-[72px] px-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-[#121821] border border-[#253241] shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#253241]">
                <Search className="h-4 w-4 text-[#94A3B8]/50 shrink-0" />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search sports, leagues, teams…"
                  className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/40 outline-none"
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Results / quick links */}
              <div className="py-2 max-h-72 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    <p className="px-4 py-1 text-[10px] font-semibold text-[#94A3B8]/40 uppercase tracking-widest">Results</p>
                    {searchResults.map(r => (
                      <Link
                        key={r.label}
                        href={r.href}
                        onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#253241]/40 transition-colors"
                      >
                        <Search className="h-3.5 w-3.5 text-[#94A3B8]/40" />
                        <span className="text-sm text-[#F8FAFC]">{r.label}</span>
                      </Link>
                    ))}
                  </>
                ) : searchQuery.trim().length === 0 ? (
                  <>
                    <p className="px-4 py-1 text-[10px] font-semibold text-[#94A3B8]/40 uppercase tracking-widest">Quick Links</p>
                    {QUICK_LINKS.slice(0, 6).map(r => (
                      <Link
                        key={r.label}
                        href={r.href}
                        onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#253241]/40 transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]/30 -rotate-90" />
                        <span className="text-sm text-[#94A3B8]/70">{r.label}</span>
                      </Link>
                    ))}
                  </>
                ) : (
                  <p className="px-4 py-6 text-sm text-[#94A3B8]/40 text-center">No results for "{searchQuery}"</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 w-full">
        {/* Premium gradient bar */}
        <div
          className="flex h-16 items-center px-4 md:px-6 gap-4 border-b border-white/[0.06] backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(120deg, #04101F 0%, #0C1219 35%, #0D1117 60%, #081610 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(0,223,169,0.08), 0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Subtle top-edge shimmer */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/20 to-transparent" />

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center group">
              <img
                src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/cupbetlogo-1.webp"
                alt="CupBett"
                className="h-9 w-auto object-contain transition-all duration-300 group-hover:opacity-90 group-hover:scale-[1.03]"
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,223,169,0.2))' }}
              />
            </Link>
          </div>

          <div className="hidden md:block h-5 w-px bg-white/[0.08] shrink-0" />

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            <NavItem href="/"                   label="All Sports"        />
            <NavItem href="/promotions"         label="Promotions"        />
            <NavItem href="/prediction-pools"   label="Predict & Win"     />
            <NavItem href="/bet-history"        label="Bet History"       />
            <NavItem href="/help"               label="Help"              />
            <WinSpinNavItem />
            <NavItem href="/"                   label="In-Play" disabled soon />
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-1">

            {/* Language picker */}
            <div className="relative" ref={langRef}>
              <HeaderIconBtn aria-label="Language" onClick={() => setShowLang(v => !v)}>
                <Globe className="h-4 w-4" style={{ color: '#00D9A6' }} />
              </HeaderIconBtn>

              {showLang && (
                <div translate="no" className="absolute right-0 top-[calc(100%+8px)] w-48 bg-[#0D1117] border border-[#253241] rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.75)] overflow-hidden z-50">
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#253241]">
                    <Globe className="h-3.5 w-3.5 text-[#00DFA9]" />
                    <p className="text-[11px] font-bold text-[#F8FAFC]/70 uppercase tracking-widest">Language</p>
                  </div>
                  <div className="py-1">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang.code)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors',
                          currentLang === lang.code
                            ? 'bg-[#00DFA9]/8 text-[#00DFA9]'
                            : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/50'
                        )}
                      >
                        <span className="text-[10px] font-bold tracking-wider opacity-50 shrink-0 w-6">{lang.short}</span>
                        <span className="text-[12px] font-medium leading-none flex-1 text-left">{lang.label}</span>
                        {currentLang === lang.code && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <HeaderIconBtn aria-label="Search" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </HeaderIconBtn>

            {/* Notifications */}
            <div className="relative" ref={notifsRef}>
              <HeaderIconBtn aria-label="Notifications" onClick={handleOpenNotifs}>
                <Bell className="h-4 w-4" />
              </HeaderIconBtn>

              {/* Notifications dropdown */}
              {showNotifs && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-[#0D1117] border border-[#253241] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7)] overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#253241]">
                    <p className="text-sm font-bold text-[#F8FAFC]">Notifications</p>
                  </div>
                  <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#253241]/50 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-[#94A3B8]/40" />
                    </div>
                    <p className="text-sm text-[#94A3B8]/50 text-center">No notifications yet</p>
                    <p className="text-[11px] text-[#94A3B8]/30 text-center leading-snug">Bet settlements, odds alerts and<br />promotions will appear here</p>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block h-5 w-px bg-white/[0.07] mx-1.5" />

            {/* Odds format — hidden on mobile, shown from md up */}
            <div className="hidden md:flex items-center rounded-lg bg-black/30 border border-white/[0.07] p-0.5 gap-0.5">
              {(Object.keys(FORMAT_LABELS) as OddsFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    'px-2.5 h-7 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150',
                    format === f
                      ? 'bg-[#18212B] text-[#00DFA9] shadow-sm'
                      : 'text-[#94A3B8]/40 hover:text-[#94A3B8]'
                  )}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>

            <div className="hidden md:block h-5 w-px bg-white/[0.07] mx-1.5" />

            {/* Wallet */}
            {isConnected && shortAddress ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowAddressMenu(v => !v)}
                  data-testid="button-wallet-address"
                  className={cn(
                    'flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-semibold transition-all duration-200',
                    showAddressMenu
                      ? 'bg-[#18212B] border-[#00DFA9]/50 text-[#F8FAFC]'
                      : 'bg-white/[0.04] border-white/[0.08] text-[#F8FAFC] hover:bg-white/[0.07] hover:border-white/[0.14]'
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.8)] shrink-0" />
                  <span className="font-mono text-xs text-[#00DFA9]">{shortAddress}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-[#94A3B8]/60 transition-transform duration-200', showAddressMenu && 'rotate-180')} />
                </button>

                {showAddressMenu && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-[#0D1117] border border-[#253241] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden z-50">
                    <div className="px-3 py-2.5 border-b border-[#253241]">
                      <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider font-medium">Connected via</p>
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
                className="relative group flex items-center gap-2 h-9 px-4 rounded-xl text-[#0B0F14] text-sm font-black tracking-tight transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 60%, #00A882 100%)' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'linear-gradient(135deg, #00EFB9 0%, #00DFA9 100%)', boxShadow: '0 0 24px rgba(0,223,169,0.5)' }} />
                <Wallet className="relative h-3.5 w-3.5 shrink-0" />
                <span className="relative hidden sm:inline whitespace-nowrap">Connect Wallet</span>
                <span className="relative sm:hidden">Connect</span>
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
    <button
      {...props}
      className="relative p-2 rounded-lg text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-all duration-150"
    >
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
          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.05]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function WinSpinNavItem() {
  const [location] = useLocation();
  const isActive = location.startsWith('/winspin');
  return (
    <Link
      href="/winspin"
      className="relative flex items-center gap-1.5 px-3 h-16 text-[13px] font-semibold transition-all duration-150 select-none group"
    >
      <img
        src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/wheel-spin.webp"
        alt="WinSpin"
        className="w-5 h-5 object-contain shrink-0 transition-transform duration-300 group-hover:rotate-45"
        style={{ filter: isActive ? 'drop-shadow(0 0 4px rgba(0,223,169,0.8))' : 'none' }}
      />
      <span
        className="font-black tracking-tight"
        style={
          isActive
            ? { background: 'linear-gradient(90deg,#00DFA9,#38BDF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
            : { color: 'rgba(248,250,252,0.55)' }
        }
      >
        WinSpin
      </span>
      {isActive && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#00DFA9] to-transparent shadow-[0_0_10px_rgba(0,223,169,0.8)]" />
      )}
    </Link>
  );
}

function NavItem({ href, label, disabled, soon }: { href: string; label: string; active?: boolean; disabled?: boolean; soon?: boolean }) {
  const [location] = useLocation();
  const isActive = href === '/' ? location === '/' : location.startsWith(href);
  const base = "relative flex items-center gap-1.5 px-3.5 h-16 text-[13px] font-medium transition-all duration-150 select-none";

  if (disabled) return (
    <span className={`${base} text-[#94A3B8]/35 cursor-not-allowed`}>
      {label}
      {soon && <span className="text-[8px] font-bold uppercase tracking-wider bg-white/[0.06] text-[#94A3B8]/50 px-1.5 py-0.5 rounded-md">Soon</span>}
    </span>
  );

  if (isActive) return (
    <Link href={href} className={`${base} text-[#F8FAFC] font-semibold`}>
      {label}
      <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#00DFA9] to-transparent shadow-[0_0_10px_rgba(0,223,169,0.8)]" />
    </Link>
  );

  return (
    <Link href={href} className={`${base} text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-white/[0.04] rounded-lg`}>
      {label}
    </Link>
  );
}
