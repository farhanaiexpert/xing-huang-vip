import { useState } from 'react';
import { X, User, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { shortAddress, addressInitials } from '../lib/utils';

export function ProfileSetupModal() {
  const { user, isNewUser, clearNewUser, updateUser } = useAuth();
  const [name, setName]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  if (!isNewUser || !user) return null;

  const addrShort = shortAddress(user.walletAddress) ?? '??';
  const initials  = name.trim().length >= 1
    ? name.trim()[0].toUpperCase()
    : addressInitials(addrShort);

  const trimmed = name.trim();
  const isValid = trimmed.length >= 3 && trimmed.length <= 20 && /^[a-zA-Z0-9_]+$/.test(trimmed);

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.patch('/auth/update-profile', { username: trimmed });
      updateUser({ username: trimmed });
      clearNewUser();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg.toLowerCase().includes('taken') ? 'That username is already taken — try another.' : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4">
      <style>{`
        @keyframes pmFadeIn { from{transform:translateY(24px) scale(0.96);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        @keyframes pmSparkle { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
      `}</style>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#050A12]/90 backdrop-blur-md" onClick={clearNewUser} />

      {/* Card */}
      <div
        className="relative w-full sm:max-w-[420px] rounded-t-[28px] sm:rounded-[24px] overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #0E1B2C 0%, #0B1219 50%, #080F15 100%)',
          border: '1px solid rgba(0,223,169,0.14)',
          boxShadow: '0 -8px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
          animation: 'pmFadeIn 0.42s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Glow blob */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(0,223,169,0.09) 0%,transparent 65%)' }} />

        {/* Top shimmer bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #00DFA9 35%, #38BDF8 65%, transparent 100%)' }} />

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3.5">
          <div className="w-10 h-[3px] rounded-full bg-white/15" />
        </div>

        {/* Close */}
        <button
          onClick={clearNewUser}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8]/40 hover:text-[#F8FAFC] hover:bg-white/[0.07] transition-all z-10"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-7 pt-7 pb-7 flex flex-col gap-5">

          {/* Header */}
          <div className="text-center">
            {/* Avatar preview */}
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-[#031A10] transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg,#00DFA9 0%,#00A882 100%)',
                  boxShadow: '0 0 32px rgba(0,223,169,0.25)',
                }}
              >
                {initials}
              </div>
            </div>

            {/* "New account" badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
              style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
              <Sparkles className="w-3 h-3 text-[#FACC15]" style={{ animation: 'pmSparkle 2s ease-in-out infinite' }} />
              <span className="text-[11px] font-semibold text-[#FACC15]">New account</span>
            </div>

            <h2 className="text-[20px] font-black text-[#F8FAFC] tracking-tight">Set your display name</h2>
            <p className="text-[13px] text-[#94A3B8]/55 mt-1.5 leading-relaxed">
              Pick a username — others see this instead of your wallet address
            </p>
          </div>

          {/* Wallet pill */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#00DFA9] shrink-0"
              style={{ boxShadow: '0 0 6px rgba(0,223,169,0.8)' }} />
            <span className="text-[12px] font-mono text-[#94A3B8]/60 truncate flex-1">{addrShort}</span>
            <span className="text-[9px] font-bold text-[#94A3B8]/30 uppercase tracking-wider">Your wallet</span>
          </div>

          {/* Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-[#94A3B8]/50 uppercase tracking-[0.1em]">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]/30 pointer-events-none" />
              <input
                type="text"
                value={name}
                autoFocus
                onChange={e => { setName(e.target.value); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter' && isValid && !saving) void handleSave(); }}
                placeholder="e.g. CryptoKing, trader99"
                maxLength={20}
                spellCheck={false}
                autoComplete="off"
                className="w-full h-12 pl-10 pr-10 rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/25 outline-none transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: error
                    ? '1px solid rgba(239,68,68,0.4)'
                    : isValid
                      ? '1px solid rgba(0,223,169,0.35)'
                      : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isValid ? '0 0 0 3px rgba(0,223,169,0.07)' : 'none',
                }}
              />
              {isValid && (
                <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00DFA9]" />
              )}
            </div>
            <p className="text-[10px] text-[#64748B] pl-1">
              3–20 characters · letters, numbers and underscores only
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/[0.07] border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-[12px] text-red-400 leading-relaxed">{error}</p>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => void handleSave()}
              disabled={!isValid || saving}
              className="w-full h-[52px] rounded-xl font-black text-[14px] tracking-tight transition-all duration-200 hover:scale-[1.015] active:scale-[0.985] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: isValid
                  ? 'linear-gradient(135deg,#00DFA9 0%,#00C49A 55%,#00A882 100%)'
                  : 'rgba(0,223,169,0.1)',
                color: isValid ? '#031A10' : 'rgba(0,223,169,0.4)',
                boxShadow: isValid ? '0 0 32px rgba(0,223,169,0.15), 0 4px 16px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {saving ? 'Saving…' : 'Save & Continue →'}
            </button>
            <button
              onClick={clearNewUser}
              className="text-[12px] text-[#94A3B8]/35 hover:text-[#94A3B8]/60 transition-colors text-center py-1"
            >
              Skip for now
            </button>
          </div>
        </div>

        {/* iOS safe area */}
        <div className="sm:hidden" style={{ height: 'env(safe-area-inset-bottom, 8px)' }} />
      </div>
    </div>
  );
}
