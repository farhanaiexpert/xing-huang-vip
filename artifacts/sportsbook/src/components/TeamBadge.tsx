/**
 * TeamBadge — displays a team/club logo image with graceful fallback.
 *
 * Fallback priority (never shows a broken image):
 *   1. ESPN CDN club logo (via getTeamLogo)
 *   2. Country flag (via getTeamFlag) — national / youth teams (e.g. "Japan
 *      Youth", "Thailand U19") get a recognisable flag picture
 *   3. Sport icon (emoji) — resolved from `sportId` (or explicit `sportIcon`),
 *      e.g. a Vietnamese club with no flag shows ⚽
 *   4. Styled initials badge — last resort only when no sport context exists
 *
 * Pass `sportId` (e.g. "sp_soccer", "tennis_atp", "mma_ufc") and the emoji is
 * resolved automatically via sportIconFor, so callers never need their own map.
 * `sportIcon` (emoji or image URL) overrides the resolved icon when provided.
 *
 * Sizes:
 *   xs  — 20px  used in compact rows
 *   sm  — 28px  used in match list rows
 *   md  — 40px  default
 *   lg  — 64px  used in match detail hero
 *   number — exact pixel size (used by section highlight rows)
 */
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { getTeamLogo } from '../lib/teamLogos';
import { getTeamFlag } from '../lib/countryFlags';
import { sportIconFor } from '../lib/featuredMarkets';

interface TeamBadgeProps {
  name: string;
  /** Internal sport id / key — resolves the emoji fallback automatically. */
  sportId?: string;
  /** Explicit emoji or image URL — overrides the sportId-resolved icon. */
  sportIcon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
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

export function TeamBadge({ name, sportId, sportIcon, size = 'md', className }: TeamBadgeProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [flagFailed, setFlagFailed] = useState(false);
  const [sportIconFailed, setSportIconFailed] = useState(false);

  // Reset failure flags when the team changes so a reused badge instance doesn't
  // suppress the new team's logo/flag based on the previous team's load errors.
  useEffect(() => {
    setLogoFailed(false);
    setFlagFailed(false);
    setSportIconFailed(false);
  }, [name]);

  const { from, to } = teamColor(name);

  // Resolve a guaranteed sport emoji when a sport context is available so a team
  // with no logo/flag falls back to its sport icon instead of bare initials.
  const resolvedSportIcon = sportIcon ?? (sportId ? sportIconFor(sportId) : undefined);

  // Numeric size → inline-styled box; named size → tailwind classes.
  const px = typeof size === 'number' ? size : null;
  const cfg = px == null ? SIZE[size] : null;

  const boxClass = cfg ? cfg.box : 'shrink-0';
  const boxStyle = px != null ? { width: px, height: px } : undefined;
  const radiusClass = cfg ? cfg.radius : px! <= 22 ? 'rounded-md' : px! <= 40 ? 'rounded-lg' : 'rounded-xl';
  const imgPadClass = cfg ? cfg.img : 'p-0.5';
  const iconClass = cfg ? cfg.icon : '';
  const iconStyle = px != null ? { fontSize: Math.round(px * 0.5) } : undefined;
  const textClass = cfg ? cfg.text : 'font-black';
  const textStyle = px != null ? { fontSize: Math.max(7, Math.round(px * 0.4)) } : undefined;

  const logoUrl = logoFailed ? null : getTeamLogo(name);
  const flagUrl = flagFailed ? null : getTeamFlag(name);

  // 1. Club logo from CDN
  if (logoUrl) {
    return (
      <div className={cn(boxClass, 'flex items-center justify-center shrink-0', className)} style={boxStyle}>
        <img
          src={logoUrl}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          className={cn('w-full h-full object-contain drop-shadow-md', imgPadClass)}
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  // 2. Country flag — national / youth teams
  if (flagUrl) {
    return (
      <div
        className={cn(
          boxClass, radiusClass,
          'flex items-center justify-center shrink-0 overflow-hidden',
          'shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/10',
          className,
        )}
        style={boxStyle}
        title={name}
      >
        <img
          src={flagUrl}
          alt={`${name} flag`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setFlagFailed(true)}
        />
      </div>
    );
  }

  // 3. Sport icon — emoji or image URL (a failed URL degrades to an emoji,
  //    never a broken image)
  if (resolvedSportIcon) {
    const isImgUrl = resolvedSportIcon.startsWith('http');
    const showImg = isImgUrl && !sportIconFailed;
    // When a URL icon fails (or isn't an emoji), fall back to a guaranteed emoji.
    const emojiFallback = isImgUrl ? (sportId ? sportIconFor(sportId) : '🏆') : resolvedSportIcon;
    return (
      <div
        className={cn(
          boxClass, radiusClass,
          'flex items-center justify-center shrink-0 select-none',
          'shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/5',
          !showImg && iconClass,
          className,
        )}
        style={{ ...boxStyle, ...(showImg ? undefined : iconStyle), background: `linear-gradient(135deg, ${from}cc, ${to}cc)` }}
        title={name}
      >
        {showImg
          ? <img src={resolvedSportIcon} alt="" className="w-3/4 h-3/4 object-contain" loading="lazy" onError={() => setSportIconFailed(true)} />
          : emojiFallback}
      </div>
    );
  }

  // 4. Initials badge — last resort when no sport context is available
  const abbr = initials(name);
  return (
    <div
      className={cn(
        boxClass, radiusClass,
        'flex items-center justify-center shrink-0',
        'shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-white/5',
        textClass, 'text-white tracking-tight leading-none select-none',
        className,
      )}
      style={{ ...boxStyle, ...textStyle, background: `linear-gradient(135deg, ${from}, ${to})` }}
      title={name}
    >
      {abbr || '?'}
    </div>
  );
}
