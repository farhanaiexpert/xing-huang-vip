export default function Commission() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground">Commission Settings</h1>
        <p className="text-xs text-[#4A5568] mt-0.5">Referral commission configuration</p>
      </div>
      <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-1">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">Referral System Coming Soon</p>
        <p className="text-xs text-[#4A5568] max-w-xs">
          The 3-level referral commission system is being built. Commission settings will appear here once it is live.
        </p>
      </div>
    </div>
  );
}
