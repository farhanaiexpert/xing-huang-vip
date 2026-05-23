export default function Withdrawals() {
  return (
    <div className="animate-float-up">
      <div className="mb-6">
        <h1 className="text-[17px] font-bold text-white tracking-tight">Withdrawals</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>Review and process pending withdrawal requests</p>
      </div>
      <div className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
        style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <svg className="w-5 h-5" fill="none" stroke="#F59E0B" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
        </div>
        <p className="text-white font-semibold text-sm mb-1">Withdrawal Management</p>
        <p className="text-[12px]" style={{ color: "#334155" }}>Coming in Phase 3 — withdrawal approval workflow</p>
      </div>
    </div>
  );
}
