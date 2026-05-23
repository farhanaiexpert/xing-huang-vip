export default function Promotions() {
  return (
    <div className="animate-float-up">
      <div className="mb-6">
        <h1 className="text-[17px] font-bold text-white tracking-tight">Promotions</h1>
        <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>Create and manage bonus campaigns and promo codes</p>
      </div>
      <div className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
        style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)" }}>
          <svg className="w-5 h-5" fill="none" stroke="#EC4899" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
        </div>
        <p className="text-white font-semibold text-sm mb-1">Promotions Engine</p>
        <p className="text-[12px]" style={{ color: "#334155" }}>Coming soon — bonus campaigns and promo code management</p>
      </div>
    </div>
  );
}
