export default function AuditLogs() {
  return (
    <div className="animate-float-up">
      <div className="mb-6">
        <h1 className="text-[17px] font-bold text-white tracking-tight">Audit Logs</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>Complete audit trail of all admin actions</p>
      </div>
      <div className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
        style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <svg className="w-5 h-5" fill="none" stroke="#3B82F6" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <p className="text-white font-semibold text-sm mb-1">Audit Trail</p>
        <p className="text-[12px]" style={{ color: "#334155" }}>Coming soon — full admin action audit logging</p>
      </div>
    </div>
  );
}
