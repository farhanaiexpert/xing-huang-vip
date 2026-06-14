import { X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuideSection {
  title: string;
  icon?: React.ReactNode;
  items: (string | { text: string; note?: string })[];
}

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent?: string;
  sections: GuideSection[];
}

export function GuideModal({ open, onClose, title, subtitle, accent = "#38BDF8", sections }: GuideModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0D1117] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1a`, color: accent }}>
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/8 transition-all shrink-0 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {sections.map((section, si) => (
            <div key={si}>
              <div className="flex items-center gap-2 mb-2.5">
                {section.icon && (
                  <span className="text-[#64748B]">{section.icon}</span>
                )}
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{section.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item, ii) => {
                  const text = typeof item === "string" ? item : item.text;
                  const note = typeof item === "string" ? undefined : item.note;
                  return (
                    <li key={ii} className="flex gap-2.5">
                      <span className={cn("w-1 h-1 rounded-full mt-[7px] shrink-0")} style={{ backgroundColor: accent }} />
                      <span className="text-[13px] text-[#94A3B8] leading-relaxed">
                        {text}
                        {note && <span className="text-[#475569] ml-1 text-[11px]">({note})</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/8 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-[#64748B] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

interface GuideButtonProps {
  onClick: () => void;
  accent?: string;
  label?: string;
}

export function GuideButton({ onClick, accent = "#38BDF8", label = "How it works" }: GuideButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-white/5"
      style={{ color: accent, borderColor: `${accent}30` }}
    >
      <BookOpen className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
