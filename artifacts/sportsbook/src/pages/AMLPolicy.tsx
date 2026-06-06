import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { ArrowLeft, Shield } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Our Commitment',
    body: 'Xing Huang is committed to preventing money laundering and terrorist financing. We operate in full compliance with the EU Anti-Money Laundering Directive (AMLD) and the requirements of the Malta Gaming Authority.',
  },
  {
    title: 'Know Your Customer (KYC)',
    body: 'All players must verify their identity before making withdrawals or if deposit thresholds are reached. Verification requires a government-issued photo ID, proof of address dated within 90 days, and in some cases proof of source of funds.',
  },
  {
    title: 'Transaction Monitoring',
    body: 'All transactions are monitored automatically for unusual patterns, including large single deposits, rapid cycling of funds, and structuring activity. Accounts showing suspicious behaviour may be suspended pending investigation.',
  },
  {
    title: 'Source of Funds',
    body: 'For high-volume players or large transactions we may request evidence of the source of funds (e.g. payslips, bank statements). This is a regulatory requirement and is not a reflection on any individual customer.',
  },
  {
    title: 'Suspicious Activity Reporting',
    body: 'Xing Huang has a designated Money Laundering Reporting Officer (MLRO). Suspicious transactions are reported to the Financial Intelligence Analysis Unit (FIAU) in Malta as required by law.',
  },
  {
    title: 'Record Keeping',
    body: 'We retain KYC documentation and transaction records for a minimum of 5 years in accordance with AML regulations. These records may be disclosed to regulatory or law-enforcement authorities when legally required.',
  },
];

export function AMLPolicy() {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC]">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8]/60 hover:text-[#00DFA9] transition-colors mb-8">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#FACC15]/10 border border-[#FACC15]/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-[#FACC15]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">AML Policy</h1>
            <p className="text-xs text-[#94A3B8]/50 mt-0.5">Anti-Money Laundering &amp; KYC — Last updated: 1 January 2026</p>
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
          Compliance enquiries: <span className="text-[#FACC15]/60">compliance@oddschain.io</span>
        </p>
      </main>
    </div>
  );
}
