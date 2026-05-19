import { useState } from 'react';
import { getJerseyUrl } from '../lib/teamJerseys';
import { TeamBadge } from './TeamBadge';

interface JerseySilkProps {
  team: string;
  size?: 'sm' | 'md' | 'lg';
  /** Shown when no jersey mapping exists or image fails to load */
  sportIcon?: string;
  /** If true, mirrors the image horizontally (for away team) */
  flip?: boolean;
}

const SIZE_MAP = {
  sm: 44,
  md: 60,
  lg: 80,
};

export function JerseySilk({ team, size = 'md', sportIcon, flip = false }: JerseySilkProps) {
  const [failed, setFailed] = useState(false);
  const url = getJerseyUrl(team);

  if (!url || failed) {
    return <TeamBadge name={team} sportIcon={sportIcon ?? '⚽'} size={size} />;
  }

  const px = SIZE_MAP[size];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: px, height: px }}
    >
      {/* Soft glow under the jersey */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-2 rounded-full blur-md opacity-30 pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.4)' }}
      />
      <img
        src={url}
        alt={`${team} jersey`}
        onError={() => setFailed(true)}
        style={{
          width: px,
          height: px,
          objectFit: 'contain',
          transform: flip ? 'scaleX(-1)' : undefined,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
        }}
        draggable={false}
      />
    </div>
  );
}
