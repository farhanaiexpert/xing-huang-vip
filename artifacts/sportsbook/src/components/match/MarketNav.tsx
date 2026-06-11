import { useRef, useEffect } from 'react';
import { getGroupColor } from '../../data/groupColors';
import type { MarketDetailGroup } from '../../data/marketDetails';

interface MarketNavProps {
  groups:   MarketDetailGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

export function MarketNav({ groups, activeId, onSelect }: MarketNavProps) {
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs   = useRef<Record<string, HTMLButtonElement | null>>({});

  const totalCount = groups.reduce(
    (sum, g) => sum + g.markets.reduce((a, m) => a + m.selections.length, 0), 0
  );

  // Auto-center active tab
  useEffect(() => {
    const id  = activeId ?? '__all__';
    const btn = buttonRefs.current[id];
    const nav = navScrollRef.current;
    if (!btn || !nav) return;
    const targetLeft = btn.offsetLeft - nav.clientWidth / 2 + btn.offsetWidth / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeId]);

  const visibleGroups = groups.filter(g =>
    g.markets.reduce((a, m) => a + m.selections.length, 0) > 0
  );

  return (
    <div
      className="sticky top-0 z-20"
      style={{
        background:       'linear-gradient(180deg, #070B12 0%, #08101A 100%)',
        backdropFilter:   'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom:     '1px solid rgba(30,42,58,0.8)',
        boxShadow:        '0 4px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Rainbow top accent line */}
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, #FACC15 0%, #00DFA9 22%, #38BDF8 44%, #A78BFA 66%, #F472B6 83%, #FB7185 100%)',
      }} />

      {/* Scrollable tab row */}
      <div
        ref={navScrollRef}
        className="market-nav-scroll flex items-stretch overflow-x-auto"
        style={{ height: '60px' }}
      >
        {/* "All" tab */}
        <NavTab
          tabRef={el => { buttonRefs.current['__all__'] = el; }}
          icon="◎"
          label="All"
          count={totalCount}
          isActive={activeId === null}
          color="#94A3B8"
          onClick={() => onSelect('__all__')}
          isAllTab
        />

        {/* Thin vertical divider after All */}
        <div style={{ width: '1px', background: 'rgba(37,50,65,0.5)', alignSelf: 'center', height: '28px', flexShrink: 0 }} />

        {/* Group tabs */}
        {visibleGroups.map(group => {
          const count = group.markets.reduce((a, m) => a + m.selections.length, 0);
          return (
            <NavTab
              key={group.id}
              tabRef={el => { buttonRefs.current[group.id] = el; }}
              icon={group.icon}
              label={group.name}
              count={count}
              isActive={activeId === group.id}
              color={getGroupColor(group.id)}
              onClick={() => onSelect(group.id)}
            />
          );
        })}

        {/* Right padding so last tab isn't behind the fade */}
        <div style={{ width: '24px', flexShrink: 0 }} />
      </div>

      {/* Left + right fade gradients */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '32px', height: '100%',
        background: 'linear-gradient(to right, rgba(7,11,18,0.95) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, width: '40px', height: '100%',
        background: 'linear-gradient(to left, rgba(8,16,26,0.95) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Individual tab ────────────────────────────────────────────────────────────

interface NavTabProps {
  tabRef:   (el: HTMLButtonElement | null) => void;
  icon:     string;
  label:    string;
  count:    number;
  isActive: boolean;
  color:    string;
  onClick:  () => void;
  isAllTab?: boolean;
}

function NavTab({ tabRef, icon, label, count, isActive, color, onClick, isAllTab }: NavTabProps) {
  const { r, g, b } = hexToRgb(color);

  const activeText   = color;
  const inactiveText = 'rgba(148,163,184,0.6)';
  const activeBg     = `rgba(${r},${g},${b},0.06)`;
  const activeBorder = color;

  return (
    <button
      ref={tabRef}
      onClick={onClick}
      style={{
        height:        '60px',
        paddingInline: isAllTab ? '18px' : '15px',
        display:       'flex',
        alignItems:    'center',
        gap:           '7px',
        whiteSpace:    'nowrap',
        flexShrink:    0,
        cursor:        'pointer',
        background:    isActive ? activeBg : 'transparent',
        borderBottom:  `3px solid ${isActive ? activeBorder : 'transparent'}`,
        color:         isActive ? activeText : inactiveText,
        transition:    'color 0.18s ease, background 0.18s ease, border-color 0.18s ease',
      }}
      onMouseEnter={e => {
        if (isActive) return;
        const el = e.currentTarget;
        el.style.color      = 'rgba(220,228,240,0.88)';
        el.style.background = 'rgba(37,50,65,0.25)';
        el.style.borderBottomColor = `rgba(${r},${g},${b},0.25)`;
      }}
      onMouseLeave={e => {
        if (isActive) return;
        const el = e.currentTarget;
        el.style.color             = inactiveText;
        el.style.background        = 'transparent';
        el.style.borderBottomColor = 'transparent';
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: isAllTab ? '14px' : '15px', lineHeight: 1, flexShrink: 0 }}>
        {icon}
      </span>

      {/* Label */}
      <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>
        {label}
      </span>

      {/* Count badge */}
      <span style={{
        fontSize:     '10.5px',
        fontWeight:   700,
        lineHeight:   1,
        padding:      '2px 6px',
        borderRadius: '20px',
        fontVariantNumeric: 'tabular-nums',
        flexShrink:   0,
        transition:   'all 0.18s ease',
        ...(isActive ? {
          background: `rgba(${r},${g},${b},0.18)`,
          color,
          border:     `1px solid rgba(${r},${g},${b},0.3)`,
        } : {
          background: 'rgba(22,33,48,0.9)',
          color:      'rgba(148,163,184,0.4)',
          border:     '1px solid rgba(37,50,65,0.5)',
        }),
      }}>
        {count}
      </span>
    </button>
  );
}
