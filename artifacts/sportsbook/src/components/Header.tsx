import { Link, useLocation } from 'wouter';
import { API_BASE } from '@/lib/apiBase';
import { Search, LogOut, ChevronDown, X, Globe, User, Clock, Receipt, History } from 'lucide-react';
import { ConnectWalletModal } from './ConnectWalletModal';
import { WalletPickerModal } from './WalletPickerModal';
import { NotificationBell } from './NotificationBell';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../contexts/AuthContext';
import { useBetHistory } from '../hooks/useBetHistory';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { SportName } from './SportName';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { FORMAT_LABELS, type OddsFormat } from '../lib/oddsFormat';
import { useI18n } from '../contexts/I18nContext';
import { OPEN_WALLET_PICKER_EVENT } from '../lib/depositGate';

const NPP_PENDING_KEY = 'npp_pending_deposit';

function usePendingNppDeposit() {
  const [pending, setPending] = useState<{ paymentId: string; amount: number } | null>(null);
  useEffect(() => {
    function check() {
      const raw = localStorage.getItem(NPP_PENDING_KEY);
      if (!raw) { setPending(null); return; }
      try {
        const data = JSON.parse(raw) as { paymentId: string; amount: number; expiresAt: string };
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          localStorage.removeItem(NPP_PENDING_KEY);
          setPending(null);
        } else {
          setPending({ paymentId: data.paymentId, amount: data.amount });
        }
      } catch { setPending(null); }
    }
    check();
    window.addEventListener('storage', check);
    const id = setInterval(check, 15_000);
    return () => { window.removeEventListener('storage', check); clearInterval(id); };
  }, []);
  return pending;
}

const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文', native: '中文',     flag: '🇨🇳', short: 'ZH' },
  { code: 'en',    label: 'English', native: 'EN',       flag: '🇬🇧', short: 'EN' },
];


export function Header() {
  const { balance } = useWallet();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const { logout, user } = useAuth();
  const pendingDeposit = usePendingNppDeposit();
  const [, setLocation] = useLocation();
  const { format, setFormat } = useOddsFormat();

  // After login, redirect to the page the user was trying to reach (e.g. /account)
  const prevUserId = useRef<number | null>(null);
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (prevUserId.current === null && currentId !== null) {
      const returnTo = sessionStorage.getItem('cb_return_to');
      if (returnTo && returnTo !== '/' && returnTo !== '') {
        sessionStorage.removeItem('cb_return_to');
        setLocation(returnTo);
      }
    }
    prevUserId.current = currentId;
  }, [user, setLocation]);
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [openDepositOnAuth,  setOpenDepositOnAuth]  = useState(false);
  const [showAddressMenu,    setShowAddressMenu]    = useState(false);
  const [showSearch,         setShowSearch]         = useState(false);

  const { lang: currentLang, setLang, t } = useI18n();
  const [showLang,         setShowLang]         = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const menuRef   = useRef<HTMLDivElement>(null);
  const langRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function handleSelectLanguage(code: string) {
    setLang(code);
    setShowLang(false);
    // The DeepL DOM translator is initialised at boot in main.tsx based on the
    // stored language. Switching languages reloads so the page renders cleanly
    // in the chosen language (Chinese → translated, English → original).
    window.location.reload();
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))   setShowAddressMenu(false);
      if (langRef.current && !langRef.current.contains(e.target as Node))   setShowLang(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen for external login/signup prompts (e.g. AccountLayout guard, bet-slip,
  // promo "Sign Up & Claim"). These open the same wallet picker as the header
  // Connect Wallet button — wallet connect is the only auth method.
  useEffect(() => {
    function handler() { setIsWalletPickerOpen(true); }
    window.addEventListener('openLoginModal', handler);
    return () => window.removeEventListener('openLoginModal', handler);
  }, []);

  // Listen for wallet-picker open requests (e.g. from the connect-first deposit alert)
  useEffect(() => {
    function handler() { setIsWalletPickerOpen(true); }
    window.addEventListener(OPEN_WALLET_PICKER_EVENT, handler);
    return () => window.removeEventListener(OPEN_WALLET_PICKER_EVENT, handler);
  }, []);

  // After successful sign-in: navigate to wallet deposit if user clicked Deposit while logged out
  useEffect(() => {
    if (user && openDepositOnAuth) {
      setOpenDepositOnAuth(false);
      sessionStorage.setItem('cupbett_deposit_method', 'wallet');
      setLocation('/account/wallet');
    }
  }, [user, openDepositOnAuth, setLocation]);

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

  async function handleDisconnect() { await logout(); setShowAddressMenu(false); }

  // Quick search results (filter mock sports/pages)
  const QUICK_LINKS = [
    { label: 'All Sports',      href: '/' },
    { label: 'WinSpin',         href: '/winspin' },
    { label: 'Promotions',      href: '/promotions' },
    { label: 'Predict & Win',   href: '/prediction-pools' },
    { label: 'Bet History',     href: '/account/bets' },
    // { label: 'Refer & Earn',     href: '/account/referrals' }, // hidden
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
                        <span className="text-sm text-[#F8FAFC]"><SportName name={r.label} /></span>
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
                        <span className="text-sm text-[#94A3B8]/70"><SportName name={r.label} /></span>
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
                src="https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Xing-Huang-Logo-official.webp"
                alt="Xing Huang"
                className="w-auto object-contain transition-all duration-300 group-hover:opacity-90 group-hover:scale-[1.03]"
                style={{ height: '39.6px', filter: 'drop-shadow(0 0 8px rgba(0,223,169,0.2))' }}
              />
            </Link>
          </div>

          <div className="hidden md:block h-5 w-px bg-white/[0.08] shrink-0" />

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            <NavItem href="/"                   label={t('All Sports')}    />
            <NavItem href="/promotions"         label={t('Promotions')}    />
            <NavItem href="/prediction-pools"   label={t('Predict & Win')} />
            <BetHistoryNavItem />
            <NavItem href="/worldcup"            label="🏆 World Cup"      />
            <NavItem href="/help"               label={t('Help')}          />
            {/* <NavItem href="/account/referrals"  label={t('Refer & Earn')}  /> */}{/* hidden */}
            <WinSpinNavItem />
            <LiveNavItem />
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">

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
                        <span className="text-[12px] font-medium leading-none flex-1 text-left">
                          {lang.label}
                          <span className="opacity-50 ml-1">({lang.native})</span>
                        </span>
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
            <NotificationBell />

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

            {/* Auth / Wallet */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Top Up button — logged-in users */}
                <button
                  onClick={() => {
                    sessionStorage.setItem('cupbett_wallet_tab', 'deposit');
                    sessionStorage.setItem('cupbett_deposit_method', 'wallet');
                    setLocation('/account/wallet');
                  }}
                  className="relative group flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#0B0F14] text-xs font-black tracking-tight transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
                  title={pendingDeposit ? `Pending deposit: $${pendingDeposit.amount} USDT` : undefined}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ boxShadow: '0 0 16px rgba(0,223,169,0.5)' }} />
                  <span className="relative">+ Top Up</span>
                  {pendingDeposit && (
                    <span className="relative flex items-center gap-1 pl-1 border-l border-[#0B0F14]/20">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px] font-black">1</span>
                    </span>
                  )}
                </button>

                {/* User profile button + dropdown */}
                <div className="relative hidden sm:block" ref={menuRef}>
                  <button
                    onClick={() => setShowAddressMenu(v => !v)}
                    data-testid="button-user-menu"
                    className={cn(
                      'flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-semibold transition-all duration-200',
                      showAddressMenu
                        ? 'bg-[#18212B] border-[#00DFA9]/50 text-[#F8FAFC]'
                        : 'bg-white/[0.04] border-white/[0.08] text-[#F8FAFC] hover:bg-white/[0.07] hover:border-white/[0.14]'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.8)] shrink-0" />
                    <User className="h-3.5 w-3.5 text-[#00DFA9] shrink-0" />
                    <span className="text-xs text-[#00DFA9] font-semibold max-w-[110px] truncate">
                      {user.email ?? user.displayName ?? 'Account'}
                    </span>
                    {balance > 0 && (
                      <span className="text-[10px] text-[#FACC15] font-bold bg-[#FACC15]/10 px-1.5 py-0.5 rounded-md">
                        {balance.toFixed(2)} USDT
                      </span>
                    )}
                    <ChevronDown className={cn('h-3.5 w-3.5 text-[#94A3B8]/60 transition-transform duration-200', showAddressMenu && 'rotate-180')} />
                  </button>

                  {showAddressMenu && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-[#0D1117] border border-[#253241] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden z-50">
                      <div className="px-3 py-2.5 border-b border-[#253241]">
                        <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider font-medium">Signed in as</p>
                        <p className="text-[13px] font-semibold text-[#F8FAFC] mt-0.5 truncate">{user.email ?? user.displayName ?? 'Account'}</p>
                        <p className="text-xs text-[#FACC15] font-bold mt-0.5">{balance.toFixed(2)} USDT</p>
                      </div>
                      <div className="py-1">
                        <MenuAction href="/account"              icon={<User className="h-3.5 w-3.5" />}        label="Profile"          onClick={() => setShowAddressMenu(false)} />
                        <MenuAction href="/account/wallet"       icon={<History className="h-3.5 w-3.5" />}     label="Deposit History"  onClick={() => setShowAddressMenu(false)} />
                        <MenuAction href="/account/bets"         icon={<Receipt className="h-3.5 w-3.5" />}     label="My Bets"          onClick={() => setShowAddressMenu(false)} />
                        <MenuAction icon={<LogOut className="h-3.5 w-3.5" />} label="Sign Out" onClick={handleDisconnect} danger />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Sign In / Register button */}
                <button
                  data-testid="button-wallet-picker-header"
                  onClick={() => setIsWalletPickerOpen(true)}
                  className="flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-xl border text-sm font-bold tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
                  style={{
                    borderColor: 'rgba(0,223,169,0.35)',
                    color: '#00DFA9',
                    background: 'rgba(0,223,169,0.06)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,223,169,0.6)'; e.currentTarget.style.background = 'rgba(0,223,169,0.10)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,223,169,0.35)'; e.currentTarget.style.background = 'rgba(0,223,169,0.06)'; }}
                >
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Sign In<span className="hidden sm:inline"> / Register</span></span>
                </button>
                {/* Top Up — logged-out, no action */}
                <button
                  data-testid="button-deposit-header"
                  onClick={e => e.preventDefault()}
                  className="relative group hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl text-[#0B0F14] text-sm font-black tracking-tight transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 60%, #00A882 100%)' }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'linear-gradient(135deg, #00EFB9 0%, #00DFA9 100%)', boxShadow: '0 0 24px rgba(0,223,169,0.5)' }} />
                  <span className="relative whitespace-nowrap">Top Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConnectWalletModal open={isPaymentOpen} onOpenChange={setIsPaymentOpen} />
      <WalletPickerModal open={isWalletPickerOpen} onClose={() => setIsWalletPickerOpen(false)} />
    </>
  );
}

function HeaderIconBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="relative p-1.5 sm:p-2 rounded-lg text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-all duration-150 cursor-pointer"
    >
      {children}
    </button>
  );
}

function MenuAction({ icon, label, onClick, danger, href }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; href?: string }) {
  const cls = cn(
    'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left cursor-pointer',
    danger
      ? 'text-[#EF4444] hover:bg-[#EF4444]/10'
      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.05]'
  );
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}

function BetHistoryNavItem() {
  const [location] = useLocation();
  const { openBetsCount } = useBetHistory();
  const isActive = location.startsWith('/account/bets');
  const base = "relative flex items-center gap-1.5 px-3.5 h-16 text-[13px] font-medium transition-all duration-150 select-none";
  return (
    <Link
      href="/account/bets"
      className={cn(
        base,
        isActive
          ? 'text-[#F8FAFC] font-semibold'
          : 'text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-white/[0.04] rounded-lg'
      )}
    >
      <span className="relative">
        Bet History
        {openBetsCount > 0 && (
          <span className="absolute -top-2.5 -right-3 min-w-[16px] h-4 rounded-full bg-[#38BDF8] text-white text-[8px] font-bold flex items-center justify-center px-1 tabular-nums shadow-[0_0_8px_rgba(56,189,248,0.5)]">
            {openBetsCount > 9 ? '9+' : openBetsCount}
          </span>
        )}
      </span>
      {isActive && (
        <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#00DFA9] to-transparent shadow-[0_0_10px_rgba(0,223,169,0.8)]" />
      )}
    </Link>
  );
}

function LiveNavItem() {
  const [location] = useLocation();
  const [count, setCount] = useState<number | null>(null);
  const isActive = location.startsWith('/live');

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [oddsRes, betsRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/live/events`),
          fetch(`${API_BASE}/api/betsapi/live`),
        ]);
        if (cancelled) return;

        const oddsCount = oddsRes.status === 'fulfilled' && oddsRes.value.ok
          ? ((await oddsRes.value.json()) as { count?: number }).count ?? 0
          : 0;
        const betsCount = betsRes.status === 'fulfilled' && betsRes.value.ok
          ? ((await betsRes.value.json()) as { count?: number }).count ?? 0
          : 0;

        if (!cancelled) setCount(oddsCount + betsCount);
      } catch { /* ignore */ }
    }

    void refresh();
    const id = setInterval(() => { void refresh(); }, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const base = "relative flex items-center gap-1.5 px-3.5 h-16 text-[13px] font-medium transition-all duration-150 select-none";
  return (
    <Link
      href="/live"
      className={cn(
        base,
        isActive ? 'text-[#F8FAFC] font-semibold' : 'text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-white/[0.04] rounded-lg'
      )}
    >
      <span className="relative flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
        <span className="font-semibold">LIVE</span>
        {count !== null && count > 0 && (
          <span className="text-[9px] font-bold bg-[#EF4444] text-white px-1.5 py-0.5 rounded-full leading-none tabular-nums">
            {count}
          </span>
        )}
      </span>
      {isActive && (
        <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#EF4444] to-transparent shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
      )}
    </Link>
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
