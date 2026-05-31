import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart2, ShieldCheck, Calendar,
  CheckCircle2, Copy, Check,
} from 'lucide-react';
import type { OddsFormat } from '@/lib/oddsFormat';

const ODDS_OPTIONS: { value: OddsFormat; label: string; desc: string }[] = [
  { value: 'decimal',    label: 'Decimal',    desc: '2.50' },
  { value: 'fractional', label: 'Fractional', desc: '3/2'  },
  { value: 'american',   label: 'American',   desc: '+150' },
];

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SettingsPage() {
  const { user } = useAuth();
  const { format, setFormat } = useOddsFormat();
  const { toast } = useToast();

  const [copiedRef,  setCopiedRef]  = useState(false);

  function handleCopyRef() {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast({ title: 'Referral code copied!' });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-[16px] font-bold text-[#F8FAFC]">Account Settings</h2>

      {/* ── Account Info ── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">Member Since</p>
              <div className="flex items-center gap-1.5 text-[13px] text-[#F8FAFC]">
                <Calendar className="h-3 w-3 text-[#64748B]" />
                {fmtDate(user?.createdAt)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">KYC Status</p>
              <div className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
                user?.kycStatus === 'verified'
                  ? 'bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/25'
                  : 'bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20'
              )}>
                <ShieldCheck className="h-2.5 w-2.5" />
                {user?.kycStatus === 'verified' ? 'Verified' : 'Unverified'}
              </div>
            </div>
            {user?.referralCode && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">Referral Code</p>
                <button
                  onClick={handleCopyRef}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#00DFA9]/25 bg-[#00DFA9]/6 hover:bg-[#00DFA9]/12 transition-all cursor-pointer"
                >
                  <span className="text-[13px] font-black text-[#00DFA9] font-mono tracking-widest">{user.referralCode}</span>
                  {copiedRef ? <Check className="h-3 w-3 text-[#00DFA9]" /> : <Copy className="h-3 w-3 text-[#00DFA9]/60" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Odds format ── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0A0F16]">
          <BarChart2 className="h-3.5 w-3.5 text-[#FACC15]" />
          <p className="text-[12px] font-bold text-[#F8FAFC]">Odds Format</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2">
            {ODDS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border transition-all duration-150 cursor-pointer',
                  format === opt.value
                    ? 'bg-[#FACC15]/10 border-[#FACC15]/35 text-[#FACC15]'
                    : 'bg-[#0A0F16] border-white/[0.06] text-[#94A3B8]/50 hover:text-[#F8FAFC] hover:border-white/[0.14]'
                )}
              >
                <span className="text-[15px] font-black font-mono">{opt.desc}</span>
                <span className="text-[10px] font-semibold">{opt.label}</span>
                {format === opt.value && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#FACC15]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
