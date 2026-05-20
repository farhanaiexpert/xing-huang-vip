import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, TrendingUp, MousePointerClick, Receipt, Layers,
  Wallet, ChevronDown, ChevronUp, BookOpen, Zap, Shield,
  DollarSign, BarChart2, CheckCircle2,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────
// HOW IT WORKS SECTIONS
// ────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'odds',
    icon: <TrendingUp className="h-5 w-5" />,
    iconBg: 'bg-[#38BDF8]/10 text-[#38BDF8]',
    title: 'How Odds Work',
    summary: 'Odds represent the probability of an outcome and determine your potential return.',
    content: [
      { heading: 'What are odds?', text: 'Odds are numbers that tell you how much profit you can make relative to your stake. For example, odds of 2.00 mean you double your money if you win — stake $10, return $20.' },
      { heading: 'Decimal odds (default)', text: 'CupBett shows decimal odds by default. Your total return (stake + profit) = Stake × Odds. So $10 at 3.50 returns $35 total, a profit of $25.' },
      { heading: 'Fractional odds', text: 'Common in the UK. 5/2 means for every $2 you stake, you win $5 profit. To convert: (numerator ÷ denominator) + 1 = decimal equivalent.' },
      { heading: 'American odds', text: 'Common in the US. Positive (+150) shows profit on a $100 stake. Negative (−200) shows how much you need to stake to win $100. Use the DEC / FRAC / US toggle in the header to switch formats.' },
      { heading: 'Odds movement', text: 'Odds can shorten (get smaller) or drift (get bigger) as events approach or money comes in. Live odds update in real time during a match.' },
    ],
  },
  {
    id: 'selecting',
    icon: <MousePointerClick className="h-5 w-5" />,
    iconBg: 'bg-[#00DFA9]/10 text-[#00DFA9]',
    title: 'Selecting Odds',
    summary: 'Click any odds button to add a selection to your Bet Slip.',
    content: [
      { heading: 'Click to add', text: 'Tap or click any yellow odds button to add that selection to your Bet Slip on the right. The button turns green to confirm it\'s been added.' },
      { heading: 'Click again to remove', text: 'Changed your mind? Click the same green button again to remove the selection from your slip.' },
      { heading: 'Match rows vs Event page', text: 'The home page shows the top 1, 2, or 3 outcomes per match. Click anywhere on the match row (not the odds buttons) to open the full Event page with 80+ markets.' },
      { heading: 'Market depth on the Event page', text: 'The full event page includes Asian Handicap, Both Teams to Score, Correct Score grid, First Goalscorer, Over/Under lines, and many more specialist markets.' },
      { heading: 'Suspended markets', text: 'A lock icon means that market is temporarily suspended — usually during key live moments. Wait a moment and the odds will return.' },
    ],
  },
  {
    id: 'betslip',
    icon: <Receipt className="h-5 w-5" />,
    iconBg: 'bg-[#FACC15]/10 text-[#FACC15]',
    title: 'Using the Bet Slip',
    summary: 'The Bet Slip on the right side of the screen is where you review and place your bets.',
    content: [
      { heading: 'Adding selections', text: 'Every time you click an odds button, that selection appears in your Bet Slip with the selection name, match, and current odds.' },
      { heading: 'Single vs Accumulator', text: 'Use the toggle at the top of the Bet Slip to switch between Single bets (each selection bet individually) and Accumulator bets (all selections combined into one bet).' },
      { heading: 'Entering a stake', text: 'Type your stake amount in the input field, or use the quick preset buttons ($5, $10, $25, $50). Your Potential Returns update instantly.' },
      { heading: 'Removing selections', text: 'Click the × icon on any selection card to remove it. Click the trash icon at the top to clear the entire slip at once.' },
      { heading: 'Mobile bet slip', text: 'On smaller screens, the Bet Slip is hidden. Tap the floating green button at the bottom right (it shows your selection count) to open it as a drawer.' },
    ],
  },
  {
    id: 'acca',
    icon: <Layers className="h-5 w-5" />,
    iconBg: 'bg-[#A78BFA]/10 text-[#A78BFA]',
    title: 'Accumulator Bets',
    summary: 'An accumulator (acca) combines multiple selections into one bet with multiplied odds.',
    content: [
      { heading: 'How accas work', text: 'All your selections are multiplied together to create a combined odds figure. Stake $10 on a 4-fold acca at combined odds of 12.00 and you\'ll return $120 if all four selections win.' },
      { heading: 'All legs must win', text: 'For an accumulator to pay out, every single selection must win. If even one loses, the entire bet loses. Higher risk, but much greater reward.' },
      { heading: 'Building an acca', text: 'Switch the Bet Slip to Accumulator mode, then add as many selections as you like from any sport or market. The combined odds and potential return update in real time.' },
      { heading: 'Acca Boost', text: 'Some featured accumulators on the home page have an Acca Boost label. These offer enhanced odds on pre-selected combinations as a promotional offer.' },
      { heading: 'Minimum legs', text: 'An accumulator requires at least 2 selections. With only one selection in Acca mode, the slip treats it as a single bet.' },
    ],
  },
  {
    id: 'wallet',
    icon: <Wallet className="h-5 w-5" />,
    iconBg: 'bg-[#EF4444]/10 text-[#EF4444]',
    title: 'Connecting a Wallet',
    summary: 'You need to connect a Web3 wallet before placing any bets.',
    content: [
      { heading: 'Why a wallet?', text: 'CupBett is a decentralised sportsbook. Your wallet is your identity and your funds. There are no accounts or passwords — just your wallet address.' },
      { heading: 'How to connect', text: 'Click the green "Connect Wallet" button in the top right of the header. Choose MetaMask, Coinbase Wallet, WalletConnect, or any other supported provider.' },
      { heading: 'What happens after connection', text: 'Your shortened wallet address appears in the header confirming you\'re connected. The Bet Slip will now allow you to place bets and your Bet History will be linked to your address.' },
      { heading: 'Browsing without a wallet', text: 'You can browse all matches, view odds, and build up a Bet Slip without connecting. Only placing a bet requires connection.' },
      { heading: 'Disconnecting', text: 'Click your wallet address in the header and select "Disconnect" from the dropdown menu. This only disconnects the session — it doesn\'t affect your wallet or funds.' },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// FAQ
// ────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Are the odds updated in real time?', a: 'Yes. Live match odds update continuously. On the home page and event pages, odds buttons will flash green (drifting) or red (shortening) when they move.' },
  { q: 'Can I change my stake after adding it?', a: 'Yes. Just clear the stake field and type a new amount. The potential return recalculates instantly.' },
  { q: 'What does "Suspended" mean on a market?', a: 'A suspended market is temporarily locked for betting — usually because a goal, break of serve, or other key event is being verified. The market will reopen shortly with updated odds.' },
  { q: 'How do I switch between Decimal, Fractional and American odds?', a: 'Use the DEC / FRAC / US toggle in the top header. Your preference is saved and all odds across the entire platform update instantly.' },
  { q: 'What sports are available?', a: 'Football (soccer), tennis, basketball (NBA), cricket, esports (CS2, LoL), horse racing, IPL, Formula 1, boxing, MMA, golf, darts, and more are available or coming soon.' },
  { q: 'Can I place a bet from the Event page?', a: 'Yes. Click any odds button on the full event page to add it to your Bet Slip. All markets work the same way regardless of which page you\'re on.' },
];

// ────────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────────
export function Help() {
  const [openSection, setOpenSection] = useState<string | null>('odds');
  const [openFaq,     setOpenFaq]     = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white animate-in fade-in duration-200 pb-14 xl:pb-0">
      <Header />

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC] leading-none">Help & Rules</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">How CupBett works</p>
          </div>
        </div>

        {/* ── Quick links ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setOpenSection(prev => prev === s.id ? null : s.id)}
              className={cn(
                'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-150',
                openSection === s.id
                  ? 'bg-[#18212B] border-[#253241] shadow-sm'
                  : 'bg-[#121821] border-[#253241] hover:bg-[#18212B] hover:border-[#2E3D50]'
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', s.iconBg)}>
                {s.icon}
              </div>
              <span className="text-[12px] font-semibold text-[#F8FAFC] leading-tight">{s.title}</span>
            </button>
          ))}
        </div>

        {/* ── Sections ─────────────────────────────────────────────── */}
        <div className="space-y-3 mb-10">
          {SECTIONS.map(section => (
            <div key={section.id} className="rounded-xl border border-[#253241] bg-[#121821] overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => setOpenSection(prev => prev === section.id ? null : section.id)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#18212B] transition-colors group"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', section.iconBg)}>
                  {section.icon}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-bold text-[#F8FAFC]">{section.title}</p>
                  <p className="text-[11px] text-[#94A3B8]/70 leading-snug mt-0.5 line-clamp-1">{section.summary}</p>
                </div>
                <ChevronDown className={cn(
                  'h-4 w-4 text-[#94A3B8]/50 shrink-0 transition-transform duration-200',
                  openSection === section.id && 'rotate-180'
                )} />
              </button>

              {/* Section body */}
              {openSection === section.id && (
                <div className="px-4 pb-4 border-t border-[#253241]/60 animate-in fade-in duration-150">
                  <div className="space-y-3 pt-4">
                    {section.content.map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[#253241] flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#94A3B8]">{i + 1}</span>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-[#F8FAFC] mb-0.5">{item.heading}</p>
                          <p className="text-[12px] text-[#94A3B8] leading-relaxed">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Key facts banner ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: <Zap className="h-4 w-4" />, label: 'Instant odds', sub: 'Format switcher in header', color: 'text-[#FACC15]', bg: 'bg-[#FACC15]/5 border-[#FACC15]/15' },
            { icon: <Shield className="h-4 w-4" />, label: 'Non-custodial', sub: 'Your keys, your funds', color: 'text-[#00DFA9]', bg: 'bg-[#00DFA9]/5 border-[#00DFA9]/15' },
            { icon: <BarChart2 className="h-4 w-4" />, label: '80+ markets', sub: 'Per match on event page', color: 'text-[#38BDF8]', bg: 'bg-[#38BDF8]/5 border-[#38BDF8]/15' },
          ].map((f, i) => (
            <div key={i} className={cn('rounded-xl border p-3 text-center', f.bg)}>
              <div className={cn('mx-auto w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-white/5', f.color)}>
                {f.icon}
              </div>
              <p className={cn('text-xs font-bold', f.color)}>{f.label}</p>
              <p className="text-[10px] text-[#94A3B8]/60 mt-0.5 leading-snug">{f.sub}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-4">
            <BookOpen className="h-4 w-4 text-[#94A3B8]/50" />
            <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#253241] bg-[#121821] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(prev => prev === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#18212B] transition-colors group"
                >
                  <span className="text-[13px] font-medium text-[#F8FAFC]">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp   className="h-4 w-4 text-[#94A3B8]/50 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-[#94A3B8]/50 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 border-t border-[#253241]/60 animate-in fade-in duration-150">
                    <p className="text-[12px] text-[#94A3B8] leading-relaxed pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#00DFA9]/20 bg-[#00DFA9]/5 p-5 text-center">
          <CheckCircle2 className="h-7 w-7 text-[#00DFA9] mx-auto mb-2" />
          <p className="text-sm font-bold text-[#F8FAFC] mb-1">Ready to start betting?</p>
          <p className="text-xs text-[#94A3B8] mb-4">Browse matches, select your odds, and place your first bet.</p>
          <Link href="/">
            <button className="h-10 px-6 rounded-xl font-bold text-sm bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_20px_rgba(0,223,169,0.4)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200">
              Browse Matches
            </button>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-[#94A3B8]/30">
            CupBett · All odds subject to change · 18+
          </p>
        </div>
      </div>
    </div>
  );
}

export default Help;
