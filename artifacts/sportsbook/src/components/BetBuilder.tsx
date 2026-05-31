import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { BB_MATCHES, TAB_CONFIG, type TabKey, type BBPlayer, type BBMatch } from '../data/betBuilderData';
import { JerseySilk } from './JerseySilk';
import { getJerseyUrl } from '../lib/teamJerseys';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';

const TABS: TabKey[] = ['main', 'sot', 'shots', 'fouls', 'tackles'];
const PREVIEW_ROWS = 6;

/* ── Team colour for numbered jersey badge ─────────────────────────── */
const TEAM_COLORS: Record<string, { bg: string; text: string }> = {
  Bournemouth:     { bg: '#B71C1C', text: '#fff' },
  'Man City':      { bg: '#6CCFF6', text: '#1A2040' },
  Chelsea:         { bg: '#034694', text: '#fff' },
  Tottenham:       { bg: '#132257', text: '#fff' },
};

function teamColor(name: string) {
  return TEAM_COLORS[name] ?? { bg: '#253241', text: '#F8FAFC' };
}

/* ── Mini jersey icon + squad number ──────────────────────────────── */
function PlayerJersey({ player, matchHome, matchAway }: { player: BBPlayer; matchHome: string; matchAway: string }) {
  const [failed, setFailed] = useState(false);
  const teamName = player.team === 'home' ? matchHome : matchAway;
  const url = getJerseyUrl(teamName);
  const color = teamColor(teamName);

  return (
    <div className="relative shrink-0 w-9 h-9 flex items-center justify-center">
      {url && !failed ? (
        <>
          <img
            src={url}
            alt=""
            onError={() => setFailed(true)}
            className="w-9 h-9 object-contain"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
          />
          {/* Number badge */}
          <span
            className="absolute bottom-0 right-0 text-[8px] font-black leading-none px-1 py-0.5 rounded-sm"
            style={{ background: color.bg, color: color.text, lineHeight: '1' }}
          >
            {player.number}
          </span>
        </>
      ) : (
        /* Fallback: plain coloured box */
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black"
          style={{ background: color.bg, color: color.text }}
        >
          {player.number}
        </div>
      )}
    </div>
  );
}

/* ── Form strip — last 5 results ──────────────────────────────────── */
function FormStrip({ form }: { form: (0 | 1 | 2 | 3)[] }) {
  return (
    <div className="flex items-center gap-[5px] mt-[3px]">
      {form.map((v, i) => {
        const isLast = i === form.length - 1;
        return (
          <span
            key={i}
            className={cn(
              'text-[11px] leading-none font-bold tabular-nums',
              v > 0
                ? isLast ? 'text-[#00DFA9]' : 'text-[#94A3B8]'
                : isLast ? 'text-[#EF4444]/80' : 'text-[#3E4C5E]'
            )}
          >
            {v}
          </span>
        );
      })}
    </div>
  );
}

/* ── Single odds cell ─────────────────────────────────────────────── */
function OddsCell({ value, selId, onToggle, active }: {
  value: number | null;
  selId: string;
  onToggle: () => void;
  active: boolean;
}) {
  if (value === null) return <div className="flex-1 text-center" />;
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex-1 text-center text-[13px] font-bold tabular-nums transition-colors rounded-sm py-0.5',
        active
          ? 'text-[#00DFA9] bg-[#00DFA9]/10'
          : 'text-[#FACC15] hover:text-[#FDE68A]'
      )}
    >
      {value.toFixed(2)}
    </button>
  );
}

/* ── Match mini-tab at the bottom (next match preview) ─────────────── */
function MatchPreviewBar({ match, onClick }: { match: BBMatch; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 py-3 border-t border-[#253241] hover:bg-[#1A2330]/60 transition-colors"
    >
      <span className="text-[13px] font-semibold text-[#F8FAFC]">{match.home}</span>
      <JerseySilk team={match.home} size="sm" sportIcon="⚽" />
      <span className="text-[11px] text-[#94A3B8] font-medium px-1">v</span>
      <JerseySilk team={match.away} size="sm" sportIcon="⚽" flip />
      <span className="text-[13px] font-semibold text-[#F8FAFC]">{match.away}</span>
      <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] ml-1" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main BetBuilder component
══════════════════════════════════════════════════════════════════════ */
export function BetBuilder() {
  const [matchIdx, setMatchIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('main');
  const [expanded, setExpanded] = useState(false);
  const { addSelection, removeSelection, hasSelection } = useBetSlip();

  const match = BB_MATCHES[matchIdx];
  const { cols } = TAB_CONFIG[activeTab];

  /* players that actually have at least one non-null odd for this tab */
  const eligible = match.players.filter(p => {
    const row = p.odds[activeTab];
    return Array.isArray(row) && row.some(v => v !== null);
  });
  const visible = expanded ? eligible : eligible.slice(0, PREVIEW_ROWS);

  function toggleOdd(player: BBPlayer, colIdx: number, value: number) {
    const selId = `bb_${match.id}_${player.id}_${activeTab}_${colIdx}`;
    if (hasSelection(selId)) {
      removeSelection(selId);
    } else {
      const col = cols[colIdx];
      const tab = TAB_CONFIG[activeTab].label;
      addSelection({
        id: selId,
        marketId: `bb_${match.id}_${activeTab}`,
        matchId: match.id,
        matchName: `${match.home} v ${match.away}`,
        leagueName: match.league,
        sportKey: 'soccer_epl',
        marketName: `${tab} — ${col}`,
        selectionType: '1',
        selectionName: `${player.name} ${col}`,
        odds: value,
      });
    }
  }

  const nextMatch = BB_MATCHES[(matchIdx + 1) % BB_MATCHES.length];

  return (
    <div
      className="rounded-xl overflow-hidden mb-5"
      style={{
        background: 'linear-gradient(180deg, #141C27 0%, #0F1620 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#253241]">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-black tracking-tight" style={{ color: '#00DFA9' }}>BET</span>
          <span className="text-[13px] font-black tracking-tight text-[#F8FAFC]">BUILDER</span>
          <span className="text-[13px] font-black" style={{ color: '#00DFA9' }}>+</span>
        </div>
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
          Player Markets
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Match header ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center py-4 gap-2 border-b border-[#253241]/60">
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-bold text-[#F8FAFC]">{match.home}</span>
          <JerseySilk team={match.home} size="sm" sportIcon="⚽" />
          <span className="text-[12px] font-semibold text-[#94A3B8] px-0.5">v</span>
          <JerseySilk team={match.away} size="sm" sportIcon="⚽" flip />
          <span className="text-[15px] font-bold text-[#F8FAFC]">{match.away}</span>
        </div>
        <span className="text-[11px] text-[#94A3B8]">{match.league} · {match.kickoff}</span>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[#253241] overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setExpanded(false); }}
              className={cn(
                'shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap',
                active
                  ? 'text-[#F8FAFC] border border-[#F8FAFC]/30 bg-[#253241]'
                  : 'text-[#94A3B8] border border-transparent hover:text-[#F8FAFC] hover:bg-[#1E2A38]'
              )}
            >
              {TAB_CONFIG[tab].label}
            </button>
          );
        })}
      </div>

      {/* ── Table header ─────────────────────────────────────────── */}
      <div className="flex items-center px-4 py-1.5 border-b border-[#253241]/50">
        <div className="w-[180px] shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
          Player / Last 5
        </div>
        <div className="flex-1 flex items-center">
          {cols.map(col => (
            <div key={col} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              {col}
            </div>
          ))}
        </div>
      </div>

      {/* ── Player rows ──────────────────────────────────────────── */}
      <div className="divide-y divide-[#253241]/40">
        {visible.map(player => {
          const row = player.odds[activeTab] as (number | null)[];
          return (
            <div key={player.id} className="flex items-center px-4 py-2.5 hover:bg-[#1A2330]/60 transition-colors">
              {/* Left: jersey + name + form */}
              <div className="w-[180px] shrink-0 flex items-center gap-2.5">
                <PlayerJersey player={player} matchHome={match.home} matchAway={match.away} />
                <div className="min-w-0">
                  <span className="text-[13px] font-semibold text-[#F8FAFC] leading-tight block truncate">
                    {player.name}
                  </span>
                  <FormStrip form={player.form} />
                </div>
              </div>

              {/* Vertical divider */}
              <div className="w-px h-8 bg-[#253241] mx-3 shrink-0" />

              {/* Odds columns */}
              <div className="flex-1 flex items-center">
                {row.map((val, ci) => {
                  const selId = `bb_${match.id}_${player.id}_${activeTab}_${ci}`;
                  return (
                    <OddsCell
                      key={ci}
                      value={val}
                      selId={selId}
                      active={hasSelection(selId)}
                      onToggle={() => val !== null && toggleOdd(player, ci, val)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Show more ────────────────────────────────────────────── */}
      {eligible.length > PREVIEW_ROWS && (
        <button
          onClick={() => setExpanded(x => !x)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-[#253241] text-[12px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}

      {/* ── Next match preview ───────────────────────────────────── */}
      <MatchPreviewBar match={nextMatch} onClick={() => { setMatchIdx((matchIdx + 1) % BB_MATCHES.length); setExpanded(false); }} />
    </div>
  );
}
