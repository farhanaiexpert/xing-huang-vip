/**
 * TeamBadge — displays a team/club logo image with graceful fallback.
 *
 * Fallback priority:
 *   1. ESPN CDN logo (via getTeamLogo)
 *   2. Sport icon (emoji) — used for esports, tennis, horse racing, cricket etc.
 *   3. Styled initials badge — last resort for team sports with no logo
 *
 * Sizes:
 *   xs  — 20px  used in compact rows
 *   sm  — 28px  used in match list rows
 *   md  — 40px  default
 *   lg  — 64px  used in match detail hero
 */
import { useState } from 'react';
import { cn } from '../lib/utils';
import { getTeamLogo } from '../lib/teamLogos';

interface TeamBadgeProps {
  name: string;
  sportIcon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Deterministic brand color from team name (stable across renders)
function teamColor(name: string): { from: string; to: string } {
  const n = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const PALETTES = [
    { from: '#1a3a6e', to: '#0f2247' },
    { from: '#6e1a2e', to: '#47101e' },
    { from: '#1a5c2e', to: '#0f3a1d' },
    { from: '#4a1a6e', to: '#2e1047' },
    { from: '#6e4a1a', to: '#473010' },
    { from: '#1a4a6e', to: '#0f2f47' },
    { from: '#6e1a6e', to: '#471047' },
    { from: '#1a6e6e', to: '#0f4747' },
    { from: '#3a4a1a', to: '#242f0f' },
    { from: '#6e2a1a', to: '#471a0f' },
    { from: '#1a2e6e', to: '#0f1d47' },
    { from: '#5a1a1a', to: '#3a0f0f' },
  ];
  return PALETTES[n % PALETTES.length];
}

function initials(name: string): string {
  return name
    .replace(/FC|AFC|SC|CF|FK|SV|AC|AS|SS|RC|VfB|VfL|RB|SL|UK|US/g, ' ')
    .split(/[\s&.()\-/]+/)
    .filter(Boolean)
    .map(w => w[0])
    .filter(c => /[A-Za-z0-9]/.test(c))
    .slice(0, 3)
    .join('')
    .toUpperCase();
}

const SIZE: Record<string, { box: string; img: string; text: string; radius: string; icon: string }> = {
  xs: { box: 'w-5 h-5',   img: 'p-px',  text: 'text-[7px]  font-black', radius: 'rounded-md',  icon: 'text-[10px]' },
  sm: { box: 'w-7 h-7',   img: 'p-0.5', text: 'text-[9px]  font-black', radius: 'rounded-lg',  icon: 'text-[14px]' },
  md: { box: 'w-10 h-10', img: 'p-1',   text: 'text-[11px] font-black', radius: 'rounded-xl',  icon: 'text-[20px]' },
  lg: { box: 'w-16 h-16', img: 'p-1.5', text: 'text-[16px] font-black', radius: 'rounded-2xl', icon: 'text-[30px]' },
};

export function TeamBadge({ name, sportIcon, size = 'md', className }: TeamBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = imgFailed ? null : getTeamLogo(name);
  const cfg = SIZE[size];
  const { from, to } = teamColor(name);

  // 1. Logo from CDN
  if (logoUrl) {
    return (
      <div className={cn(cfg.box, 'flex items-center justify-center shrink-0', className)}>
        <img
          src={logoUrl}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain drop-shadow-md"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // 2. Sport icon — preferred for individuals / esports / sports where initials look wrong
  if (sportIcon) {
    return (
      <div
        className={cn(
          cfg.box, cfg.radius,
          'flex items-center justify-center shrink-0 select-none',
          'shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/5',
          cfg.icon,
          className,
        )}
        style={{ background: `linear-gradient(135deg, ${from}cc, ${to}cc)` }}
        title={name}
      >
        {sportIcon}
      </div>
    );
  }

  // 3. Initials badge — fallback for team sports with no logo and no sport icon
  const abbr = initials(name);
  return (
    <div
      className={cn(
        cfg.box, cfg.radius,
        'flex items-center justify-center shrink-0',
        'shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-white/5',
        cfg.text, 'text-white tracking-tight leading-none select-none',
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      title={name}
    >
      {abbr || '?'}
    </div>
  );
}
