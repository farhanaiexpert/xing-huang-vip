import { Link } from 'wouter';
import { Trophy, Target, ExternalLink, ArrowRight } from 'lucide-react';

export function PoolsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">Prediction Pools</h2>
        <Link href="/prediction-pools">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#00DFA9] border border-[#00DFA9]/25 bg-[#00DFA9]/6 hover:bg-[#00DFA9]/12 transition-all cursor-pointer">
            <Trophy className="h-3 w-3" />
            View All Pools
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </Link>
      </div>

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00DFA9]/20 p-6"
        style={{ background: 'linear-gradient(135deg, #071A12 0%, #0A1A10 50%, #0B0F14 100%)' }}>
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.15) 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-[#00DFA9]" />
            </div>
            <div>
              <h3 className="text-[18px] font-black text-[#F8FAFC]">Predict & Win</h3>
              <p className="text-[12px] text-[#64748B]">Community prediction pools with real USDT prizes</p>
            </div>
          </div>
          <p className="text-[13px] text-[#94A3B8]/70 leading-relaxed mb-5">
            Pick the winning outcomes across football, basketball, tennis and more.
            Join pools, compete with the community and share prize pots.
          </p>
          <Link href="/prediction-pools">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.25)' }}>
              <Target className="h-4 w-4" />
              Browse Open Pools
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Feature tiles */}
      {[
        { label: 'Free Entry',     desc: 'No cost to join any prediction pool',             color: '#00DFA9', emoji: '🆓' },
        { label: 'USDT Prizes',    desc: 'Real prize pools paid in USDT',                   color: '#FACC15', emoji: '💰' },
        { label: 'All Sports',     desc: 'Football, basketball, tennis, and more',           color: '#38BDF8', emoji: '⚽' },
        { label: 'Leaderboard',    desc: 'Compete with thousands of other players',         color: '#A78BFA', emoji: '🏆' },
      ].map(f => (
        <div key={f.label} className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0E1520]"
          style={{ borderLeftColor: f.color, borderLeftWidth: '2px' }}>
          <span className="text-2xl">{f.emoji}</span>
          <div>
            <p className="text-[13px] font-bold text-[#F8FAFC]">{f.label}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
