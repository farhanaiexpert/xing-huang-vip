/**
 * TeamBadge — displays a team/club logo image with graceful initials fallback.
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
    { from: '#1a3a6e', to: '#0f2247' },  // deep blue
    { from: '#6e1a2e', to: '#47101e' },  // deep red
    { from: '#1a5c2e', to: '#0f3a1d' },  // deep green
    { from: '#4a1a6e', to: '#2e1047' },  // deep purple
    { from: '#6e4a1a', to: '#473010' },  // deep amber
    { from: '#1a4a6e', to: '#0f2f47' },  // mid blue
    { from: '#6e1a6e', to: '#471047' },  // deep magenta
    { from: '#1a6e6e', to: '#0f4747' },  // teal
    { from: '#3a4a1a', to: '#242f0f' },  // olive
    { from: '#6e2a1a', to: '#471a0f' },  // terracotta
    { from: '#1a2e6e', to: '#0f1d47' },  // navy
    { from: '#5a1a1a', to: '#3a0f0f' },  // dark maroon
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

const SIZE: Record<string, { box: string; img: string; text: string; radius: string }> = {
  xs: { box: 'w-5 h-5',   img: 'p-px',  text: 'text-[7px]  font-black', radius: 'rounded-md'  },
  sm: { box: 'w-7 h-7',   img: 'p-0.5', text: 'text-[9px]  font-black', radius: 'rounded-lg'  },
  md: { box: 'w-10 h-10', img: 'p-1',   text: 'text-[11px] font-black', radius: 'rounded-xl'  },
  lg: { box: 'w-16 h-16', img: 'p-1.5', text: 'text-[16px] font-black', radius: 'rounded-2xl' },
};

export function TeamBadge({ name, sportIcon, size = 'md', className }: TeamBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = imgFailed ? null : getTeamLogo(name);
  const cfg = SIZE[size];
  const abbr = initials(name);
  const { from, to } = teamColor(name);

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

  // Fallback: gradient initials badge
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
      {abbr || sportIcon || '?'}
    </div>
  );
}
