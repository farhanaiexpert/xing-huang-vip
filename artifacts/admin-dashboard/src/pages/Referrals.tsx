export default function Referrals() {
  return (
    <div className="animate-float-up">
      <div className="mb-6">
        <h1 className="text-[17px] font-bold text-white tracking-tight">Referrals</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>Track 3-level referral chains and link performance</p>
      </div>
      <div className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
        style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <svg className="w-5 h-5" fill="none" stroke="#8B5CF6" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
        </div>
        <p className="text-white font-semibold text-sm mb-1">Referral Tracking</p>
        <p className="text-[12px]" style={{ color: "#334155" }}>Coming in Phase 3 — 3-level referral commission tracking</p>
      </div>
    </div>
  );
}
