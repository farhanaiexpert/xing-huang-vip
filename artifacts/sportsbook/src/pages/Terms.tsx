import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { ArrowLeft, FileText } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Agreement to Terms',
    body: 'By accessing or using OddsChain you agree to be bound by these Terms & Conditions. If you do not agree, you must not use this platform. We reserve the right to update these terms at any time; continued use after changes constitutes acceptance.',
  },
  {
    title: 'Eligibility',
    body: 'You must be at least 18 years of age (or the legal gambling age in your jurisdiction, whichever is higher) to use OddsChain. By registering you confirm that you meet this requirement and that gambling is legal where you reside.',
  },
  {
    title: 'Account Responsibility',
    body: 'You are responsible for maintaining the confidentiality of your login credentials. All activity under your account is your responsibility. Notify us immediately if you suspect unauthorised access. We do not permit multiple accounts per person.',
  },
  {
    title: 'Betting Rules',
    body: 'All bets are final once confirmed. OddsChain reserves the right to void bets placed on incorrect odds, suspended markets, or events affected by integrity concerns. Winnings are credited to your account balance after settlement.',
  },
  {
    title: 'Intellectual Property',
    body: 'All content on this platform — including logos, data, design, and software — is owned by OddsChain Ltd and may not be reproduced or distributed without written permission.',
  },
  {
    title: 'Limitation of Liability',
    body: 'OddsChain is not liable for losses arising from system outages, data errors, or events beyond our reasonable control. Our total liability to you in any circumstance shall not exceed the value of funds held in your account.',
  },
  {
    title: 'Governing Law',
    body: 'These terms are governed by the laws of Malta. Any disputes shall be subject to the exclusive jurisdiction of the Maltese courts. OddsChain is licensed by the Malta Gaming Authority (MGA/B2C/123/2021).',
  },
];

export function Terms() {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC]">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8]/60 hover:text-[#00DFA9] transition-colors mb-8">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center">
            <FileText className="h-4 w-4 text-[#00DFA9]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Terms &amp; Conditions</h1>
            <p className="text-xs text-[#94A3B8]/50 mt-0.5">Last updated: 1 January 2026</p>
          </div>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-xl bg-[#121821] border border-[#253241] px-5 py-4">
              <h2 className="text-sm font-bold text-[#F8FAFC] mb-2">{s.title}</h2>
              <p className="text-[13px] text-[#94A3B8]/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[10px] text-[#94A3B8]/30 text-center">
          Questions? Contact <span className="text-[#00DFA9]/60">legal@oddschain.io</span>
        </p>
      </main>
    </div>
  );
}
