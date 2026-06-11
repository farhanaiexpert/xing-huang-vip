/**
 * BetsApiMarketDrawer — expandable rich-market panel for a single BetsAPI fixture.
 *
 * Fetches markets from the cache-only /api/betsapi/markets/:fixtureId endpoint
 * (no extra BetsAPI credits). Renders one section per market type, reusing the
 * shared <OddsButton/> so the existing bet-slip flow is untouched. Markets with
 * no valid odds are hidden rather than shown as empty buttons.
 */
import { useEffect, useState } from 'react';
import type { Match } from '../types';
import { fetchBetsApiMarkets, type BetsApiMarketsResponse } from '../lib/betsApi';
import { OddsButton } from './OddsButton';
import { cn } from '../lib/utils';

interface Props {
  match:      Match;
  leagueName: string;
}

/** A single labelled selection: caption on top, odds button below. */
function Cell(props: {
  base:          BaseOddsProps;
  marketId:      string;
  marketName:    string;
  selectionType: string;
  selectionName: string;
  label:         string;
  odds?:         number;
  point?:        number;
}) {
  const { base, marketId, marketName, selectionType, selectionName, label, odds, point } = props;
  if (odds == null || !(odds > 1)) return null;
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <span className="text-[9px] font-semibold text-[#94A3B8]/70 leading-none truncate max-w-full">{label}</span>
      <OddsButton
        {...base}
        marketId={marketId}
        marketName={marketName}
        selectionType={selectionType}
        selectionName={selectionName}
        odds={odds}
        point={point}
      />
    </div>
  );
}

interface BaseOddsProps {
  matchId:      string;
  matchName:    string;
  leagueName:   string;
  sportKey?:    string;
  sportId?:     string;
  commenceTime?: string;
  homeTeam?:    string;
  awayTeam?:    string;
  kickoffTime?: string;
}

/** Section wrapper — only rendered when it has ≥1 child with valid odds. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(arr) && arr.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]/70">{title}</span>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-2.5">{children}</div>
    </div>
  );
}

export function BetsApiMarketDrawer({ match, leagueName }: Props) {
  const [data,    setData]    = useState<BetsApiMarketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchBetsApiMarkets(match.id)
      .then(res => { if (!cancelled) { setData(res); setLoading(false); if (!res) setError(true); } })
      .catch(() => { if (!cancelled) { setLoading(false); setError(true); } });
    return () => { cancelled = true; };
  }, [match.id]);

  const matchName = match.team2 ? `${match.team1} vs ${match.team2}` : match.team1;
  const home = match.team1;
  const away = match.team2 ?? 'Away';

  const base: BaseOddsProps = {
    matchId:      match.id,
    matchName,
    leagueName,
    sportKey:     match.sportKey,
    sportId:      match.sportId,
    commenceTime: match.commenceIso,
    homeTeam:     match.team1,
    awayTeam:     match.team2 ?? '',
    kickoffTime:  match.isLive ? undefined : match.kickoffTime,
  };

  const mid = (suffix: string) => `mkt_${match.id}_${suffix}`;
  // Match Result must reuse the EXACT marketId the compact row/carousel use so the
  // bet slip dedupes the same selection instead of creating a duplicate.
  const resultMid =
    match.sportId === 'sp_soccer'        ? mid('mr')
    : match.sportId === 'sp_horse_racing' ? mid('wo')
    :                                       mid('mw');

  if (loading) {
    return (
      <div className="px-3.5 py-3 bg-[#0B1018] border-t border-[#1E2A38] flex flex-col gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-2.5 w-24 rounded bg-[#1A2535] animate-pulse" />
            <div className="flex gap-2">
              {[0, 1, 2].map(j => (
                <div key={j} className="h-11 sm:h-9 w-[52px] rounded-lg bg-[#141C28] animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const rm = data?.richMarkets ?? null;
  const odds = data?.prematchOdds ?? null;

  if (error || !rm) {
    return (
      <div className="px-3.5 py-4 bg-[#0B1018] border-t border-[#1E2A38] text-center">
        <p className="text-[11px] text-[#94A3B8]/60">Additional markets are not available right now.</p>
      </div>
    );
  }

  const hcpLineNum = rm.hcpLine != null ? parseFloat(rm.hcpLine) : undefined;
  const cornersLineNum = rm.cornersLine != null ? parseFloat(rm.cornersLine) : undefined;
  const cardsLineNum = rm.cardsLine != null ? parseFloat(rm.cardsLine) : undefined;

  // Determine whether any market at all is renderable
  const hasAny =
    (odds && odds.home > 1) ||
    (rm.hcpHome != null && rm.hcpAway != null) ||
    (rm.ou25Over != null && rm.ou25Under != null) ||
    (rm.bttsY != null && rm.bttsN != null) ||
    (rm.htHome != null) ||
    (rm.correctScore && rm.correctScore.length > 0) ||
    (rm.cornersOver != null && rm.cornersUnder != null) ||
    (rm.cardsOver != null && rm.cardsUnder != null) ||
    (rm.nextGoalHome != null);

  if (!hasAny) {
    return (
      <div className="px-3.5 py-4 bg-[#0B1018] border-t border-[#1E2A38] text-center">
        <p className="text-[11px] text-[#94A3B8]/60">Additional markets are not available right now.</p>
      </div>
    );
  }

  return (
    <div className="px-3.5 py-3.5 bg-[#0B1018] border-t border-[#1E2A38] flex flex-col gap-4">
      {/* Match Result (1X2) */}
      {odds && odds.home > 1 && (
        <Section title="Match Result">
          <Cell base={base} marketId={resultMid} marketName="Match Result" selectionType="1" selectionName={home} label={home} odds={odds.home} />
          {odds.draw != null && (
            <Cell base={base} marketId={resultMid} marketName="Match Result" selectionType="X" selectionName="Draw" label="Draw" odds={odds.draw} />
          )}
          <Cell base={base} marketId={resultMid} marketName="Match Result" selectionType="2" selectionName={away} label={away} odds={odds.away} />
        </Section>
      )}

      {/* Asian / Match Handicap */}
      {rm.hcpHome != null && rm.hcpAway != null && (
        <Section title={`Handicap${rm.hcpLine ? ` (${rm.hcpLine})` : ''}`}>
          <Cell base={base} marketId={mid('hcp')} marketName="Handicap" selectionType="h1" selectionName={`${home} ${rm.hcpLine ?? ''}`.trim()} label={home} odds={rm.hcpHome} point={Number.isNaN(hcpLineNum) ? undefined : hcpLineNum} />
          <Cell base={base} marketId={mid('hcp')} marketName="Handicap" selectionType="h2" selectionName={`${away} ${rm.hcpLine ?? ''}`.trim()} label={away} odds={rm.hcpAway} point={Number.isNaN(hcpLineNum) ? undefined : hcpLineNum} />
        </Section>
      )}

      {/* Over / Under 2.5 Goals */}
      {rm.ou25Over != null && rm.ou25Under != null && (
        <Section title="Total Goals (2.5)">
          <Cell base={base} marketId={mid('ou25')} marketName="Over/Under 2.5" selectionType="over" selectionName="Over 2.5" label="Over 2.5" odds={rm.ou25Over} point={2.5} />
          <Cell base={base} marketId={mid('ou25')} marketName="Over/Under 2.5" selectionType="under" selectionName="Under 2.5" label="Under 2.5" odds={rm.ou25Under} point={2.5} />
        </Section>
      )}

      {/* Both Teams To Score */}
      {rm.bttsY != null && rm.bttsN != null && (
        <Section title="Both Teams To Score">
          <Cell base={base} marketId={mid('btts')} marketName="Both Teams To Score" selectionType="yes" selectionName="BTTS - Yes" label="Yes" odds={rm.bttsY} />
          <Cell base={base} marketId={mid('btts')} marketName="Both Teams To Score" selectionType="no" selectionName="BTTS - No" label="No" odds={rm.bttsN} />
        </Section>
      )}

      {/* Half-Time Result */}
      {rm.htHome != null && (
        <Section title="Half-Time Result">
          <Cell base={base} marketId={mid('ht')} marketName="Half-Time Result" selectionType="ht1" selectionName={`HT: ${home}`} label={home} odds={rm.htHome} />
          {rm.htDraw != null && (
            <Cell base={base} marketId={mid('ht')} marketName="Half-Time Result" selectionType="htX" selectionName="HT: Draw" label="Draw" odds={rm.htDraw} />
          )}
          {rm.htAway != null && (
            <Cell base={base} marketId={mid('ht')} marketName="Half-Time Result" selectionType="ht2" selectionName={`HT: ${away}`} label={away} odds={rm.htAway} />
          )}
        </Section>
      )}

      {/* Correct Score */}
      {rm.correctScore && rm.correctScore.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]/70">Correct Score</span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {rm.correctScore.map(cs => (
              <Cell
                key={cs.label}
                base={base}
                marketId={mid('cs')}
                marketName="Correct Score"
                selectionType={`cs_${cs.label}`}
                selectionName={`Correct Score ${cs.label}`}
                label={cs.label}
                odds={cs.odds}
              />
            ))}
          </div>
        </div>
      )}

      {/* Corners O/U */}
      {rm.cornersOver != null && rm.cornersUnder != null && (
        <Section title={`Total Corners${rm.cornersLine ? ` (${rm.cornersLine})` : ''}`}>
          <Cell base={base} marketId={mid('corners')} marketName="Total Corners" selectionType="cover" selectionName={`Corners Over ${rm.cornersLine ?? ''}`.trim()} label={`Over ${rm.cornersLine ?? ''}`.trim()} odds={rm.cornersOver} point={Number.isNaN(cornersLineNum) ? undefined : cornersLineNum} />
          <Cell base={base} marketId={mid('corners')} marketName="Total Corners" selectionType="cunder" selectionName={`Corners Under ${rm.cornersLine ?? ''}`.trim()} label={`Under ${rm.cornersLine ?? ''}`.trim()} odds={rm.cornersUnder} point={Number.isNaN(cornersLineNum) ? undefined : cornersLineNum} />
        </Section>
      )}

      {/* Cards O/U */}
      {rm.cardsOver != null && rm.cardsUnder != null && (
        <Section title={`Total Cards${rm.cardsLine ? ` (${rm.cardsLine})` : ''}`}>
          <Cell base={base} marketId={mid('cards')} marketName="Total Cards" selectionType="kover" selectionName={`Cards Over ${rm.cardsLine ?? ''}`.trim()} label={`Over ${rm.cardsLine ?? ''}`.trim()} odds={rm.cardsOver} point={Number.isNaN(cardsLineNum) ? undefined : cardsLineNum} />
          <Cell base={base} marketId={mid('cards')} marketName="Total Cards" selectionType="kunder" selectionName={`Cards Under ${rm.cardsLine ?? ''}`.trim()} label={`Under ${rm.cardsLine ?? ''}`.trim()} odds={rm.cardsUnder} point={Number.isNaN(cardsLineNum) ? undefined : cardsLineNum} />
        </Section>
      )}

      {/* Next Goal */}
      {rm.nextGoalHome != null && (
        <Section title="Next Goal">
          <Cell base={base} marketId={mid('ng')} marketName="Next Goal" selectionType="ng1" selectionName={`Next Goal: ${home}`} label={home} odds={rm.nextGoalHome} />
          {rm.nextGoalNone != null && (
            <Cell base={base} marketId={mid('ng')} marketName="Next Goal" selectionType="ngN" selectionName="Next Goal: None" label="No Goal" odds={rm.nextGoalNone} />
          )}
          {rm.nextGoalAway != null && (
            <Cell base={base} marketId={mid('ng')} marketName="Next Goal" selectionType="ng2" selectionName={`Next Goal: ${away}`} label={away} odds={rm.nextGoalAway} />
          )}
        </Section>
      )}

      <p className={cn('text-[9px] text-[#475569] pt-1')}>
        Markets from BetsAPI · cached, no live refresh
      </p>
    </div>
  );
}
