import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Gamble Responsibly',
    body: 'Betting should be enjoyable entertainment — never a way to make money or solve financial problems. Set a budget before you play and stick to it. Only wager what you can afford to lose.',
  },
  {
    title: 'Warning Signs',
    body: 'Gambling may be becoming a problem if you: bet more than you intended, chase losses, borrow money to gamble, hide your gambling from others, or feel anxious and irritable when not betting. Take these signs seriously.',
  },
  {
    title: 'Deposit Limits',
    body: 'You can set daily, weekly, or monthly deposit limits in your account settings. Limits take effect immediately when reduced; increases require a 24-hour cooling-off period. We encourage all players to set a limit.',
  },
  {
    title: 'Self-Exclusion',
    body: 'If you need a break, you can self-exclude for 1 week, 1 month, 6 months, 1 year, or permanently via your account settings. During exclusion you will not be able to log in or place bets, and we will close any open bets.',
  },
  {
    title: 'Reality Check',
    body: 'Enable session time reminders in your settings to receive alerts every 30, 60, or 120 minutes showing how long you have been playing and your net result for that session.',
  },
  {
    title: 'Get Help',
    body: 'If you or someone you know needs support, contact one of these free services:\n• BeGambleAware — begambleaware.org\n• GamCare — gamcare.org.uk (+44 808 8020 133)\n• Gambling Therapy — gamblingtherapy.org\n• GamStop (UK self-exclusion) — gamstop.co.uk',
  },
];

export function ResponsibleGambling() {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC]">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8]/60 hover:text-[#00DFA9] transition-colors mb-8">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Responsible Gambling</h1>
            <p className="text-xs text-[#94A3B8]/50 mt-0.5">Your wellbeing is our priority — 18+ only</p>
          </div>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-xl bg-[#121821] border border-[#253241] px-5 py-4">
              <h2 className="text-sm font-bold text-[#F8FAFC] mb-2">{s.title}</h2>
              <p className="text-[13px] text-[#94A3B8]/70 leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/20 px-5 py-4 text-center">
          <p className="text-xs font-semibold text-[#22C55E]/80 mb-1">Need immediate help?</p>
          <p className="text-[11px] text-[#94A3B8]/50">Call GamCare free: <span className="text-[#22C55E]/70">+44 808 8020 133</span></p>
        </div>
      </main>
    </div>
  );
}
