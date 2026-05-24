import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(n: string | number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "—";
  return num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function statusBg(status: string): string {
  switch (status.toLowerCase()) {
    case "open":       return "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20";
    case "won":
    case "completed":
    case "paid":
    case "active":
    case "approved":
    case "verified":   return "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20";
    case "lost":
    case "rejected":   return "bg-red-500/10 text-red-400 border-red-500/20";
    case "void":
    case "settled":
    case "closed":     return "bg-white/5 text-[#94A3B8] border-white/10";
    case "pending":    return "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20";
    default:           return "bg-white/5 text-[#94A3B8] border-white/10";
  }
}
