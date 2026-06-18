/**
 * MATCH DETAIL MARKETS
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates rich, sport-specific market groups for a match detail page.
 * Uses the primary market odds as a baseline and derives all secondary
 * market odds with realistic correlations.
 *
 * API_HOOK: Replace generateDetailMarkets() with:
 *   GET /api/matches/:matchId/markets  (returns all MarketEntity[])
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { MatchEntity, MarketEntity } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MarketCategory =
  | 'popular' | 'goals' | 'result' | 'handicap'
  | 'specials' | 'players' | 'maps' | 'sets' | 'quarters' | 'runners';

export interface MarketDetailGroup {
  id: string;
  name: string;
  icon: string;
  category: MarketCategory;
  markets: MarketEntity[];
  isDefaultOpen: boolean;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Clamp and round to 2 decimal places */
function o(n: number): number { return Math.max(1.01, Math.round(n * 100) / 100); }

/** Per-match seed for odds variation (0.92–1.04 range) */
function vs(matchId: string): number {
  const n = matchId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 0.92 + (n % 13) * 0.01;
}

function sel(id: string, marketId: string, name: string, shortName: string, odds: number, movement: 'up' | 'down' | 'stable' = 'stable') {
  return { id, marketId, name, shortName, odds: o(odds), oddsStatus: 'active' as const, oddsMovement: movement };
}

function market(id: string, matchId: string, typeId: string, name: string, selections: ReturnType<typeof sel>[]): MarketEntity {
  return { id, matchId, marketTypeId: typeId, name, status: 'active', selections };
}

// ── Known players per team ────────────────────────────────────────────────────

const TEAM_PLAYERS: Record<string, string[]> = {
  'Arsenal':         ['Saka', 'Havertz', 'Martinelli', 'Trossard', 'Odegaard'],
  'Chelsea':         ['Palmer', 'Jackson', 'Nkunku', 'Neto', 'Mudryk'],
  'Man City':        ['Haaland', 'De Bruyne', 'Foden', 'Silva', 'Doku'],
  'Liverpool':       ['Salah', 'Nunez', 'Diaz', 'Jota', 'Gakpo'],
  'Tottenham':       ['Son', 'Richarlison', 'Maddison', 'Johnson', 'Bergvall'],
  'Aston Villa':     ['Watkins', 'Bailey', 'Duran', 'Rogers', 'McGinn'],
  'Newcastle':       ['Isak', 'Gordon', 'Almiron', 'Schar', 'Trippier'],
  'West Ham':        ['Bowen', 'Kudus', 'Ward-Prowse', 'Guilherme', 'Summerville'],
  'Barcelona':       ['Yamal', 'Raphinha', 'Lewandowski', 'Pedri', 'Ferran'],
  'Real Madrid':     ['Mbappe', 'Vinicius', 'Bellingham', 'Modric', 'Rodrygo'],
  'Atletico Madrid': ['Griezmann', 'Morata', 'Felix', 'Lino', 'Correa'],
  'Sevilla':         ['En-Nesyri', 'Lukebakio', 'Saul', 'Sow', 'Gudelj'],
  'Villarreal':      ['Danjuma', 'Morales', 'Capoue', 'Lo Celso', 'Baena'],
  'Valencia':        ['Duro', 'Diego Lopez', 'Guillamón', 'Pepelu', 'Almeida'],
  'PSG':             ['Dembele', 'Kvaratskhelia', 'Asensio', 'Neves', 'Doue'],
  'Bayern Munich':   ['Kane', 'Musiala', 'Gnabry', 'Muller', 'Olise'],
  'AC Milan':        ['Morata', 'Pulisic', 'Reijnders', 'Theo', 'Loftus-Cheek'],
  'Inter':           ['Thuram', 'Lautaro', 'Calhanoglu', 'Barella', 'Dumfries'],
  'Juventus':        ['Vlahovic', 'Yildiz', 'Koopmeiners', 'McKennie', 'Chiesa'],
  'Roma':            ['Dybala', 'Lukaku', 'Pellegrini', 'Cristante', 'El Shaarawy'],
  'PSV':             ['Tillman', 'De Jong', 'Bakayoko', 'Teze', 'Dest'],
  'Porto':           ['Evanilson', 'Galeno', 'Pepê', 'Veron', 'Martim'],
};

function getPlayers(teamName: string): string[] {
  return TEAM_PLAYERS[teamName] ?? ['球员 A', '球员 B', '球员 C', '球员 D', '球员 E'];
}

// ── Soccer markets ────────────────────────────────────────────────────────────

function soccerMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: ht, awayTeamName: at, primaryMarket: pm } = match;
  const v = vs(mid);

  const hOdds = pm.selections[0]?.odds ?? 2.0;
  const dOdds = pm.selections[1]?.odds ?? 3.2;
  const aOdds = pm.selections[2]?.odds ?? 3.5;

  const ih = 1/hOdds, id = 1/dOdds, ia = 1/aOdds;
  const tot = ih + id + ia;
  const ph = ih/tot, pd = id/tot, pa = ia/tot;

  // ── Double chance ──────────────────────────────────────────────────────────
  const dc1x = o(1/(ph+pd) * 1.06 * v);
  const dc12  = o(1/(ph+pa) * 1.06 * v);
  const dcx2  = o(1/(pd+pa) * 1.06 * v);

  // ── HT result ─────────────────────────────────────────────────────────────
  const ht1Odds = o(hOdds * 1.30 * v);
  const htXOdds = o(1.88 * v);
  const ht2Odds = o(aOdds * 1.50 * v);

  // ── BTTS — prefer real API odds, fall back to h2h-derived values ──────────
  const bY = match.bttsYes  ? o(match.bttsYes)          : o((1.62 + pd * 0.7) * v);
  const bN = match.bttsNo   ? o(match.bttsNo)           : o((2.18 - pd * 0.5) * v);

  // ── Over/Under goals — prefer real API O/U 2.5, fall back to generated ───
  const o05Ov = o(1.10 * v);  const o05Un = o(7.50 / v);
  const o15Ov = o(1.30 * v);  const o15Un = o(3.40 / v);
  const o25Ov = match.ouOver25  ? o(match.ouOver25)  : o(1.88 * v);
  const o25Un = match.ouUnder25 ? o(match.ouUnder25) : o(1.92 / v);
  const o35Ov = o(3.20 * v);  const o35Un = o(1.33 / v);
  const o45Ov = o(6.50 * v);  const o45Un = o(1.10);
  const o55Ov = o(11.0 * v);  const o55Un = o(1.05);

  // ── Draw No Bet ───────────────────────────────────────────────────────────
  const dnbH = o(1/(ph/(ph+pa)) * 1.06 * v);
  const dnbA = o(1/(pa/(ph+pa)) * 1.06 * v);

  // ── Asian Handicap — full range of lines ──────────────────────────────────
  // Fair line: positive = home advantage in goals
  const fairLine = (ph - pa) * 3.5;
  const hcpLinesList: number[] = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];

  const hcpMarkets = hcpLinesList.map(line => {
    const dist    = line - fairLine;           // dist > 0: home gets extra goals
    const adjF    = Math.exp(dist * 0.35);
    const homeH   = o(1.90 * adjF * v);
    const awayH   = o(1.90 / adjF / v);
    const awayLine = -line;
    const fmt = (n: number) => n > 0 ? `+${n}` : `${n}`;
    const safeKey = line.toString().replace('.', 'd').replace('-', 'n').replace('+', 'p');
    return market(
      `mkt_${mid}_hcpA_${safeKey}`, mid, 'mt_asian_handicap',
      `亚洲让球   ${ht} ${fmt(line)}`,
      [
        sel(`mkt_${mid}_hcpAh_${safeKey}`, `mkt_${mid}_hcpA_${safeKey}`, `${ht} ${fmt(line)}`,      fmt(line),      homeH),
        sel(`mkt_${mid}_hcpAa_${safeKey}`, `mkt_${mid}_hcpA_${safeKey}`, `${at} ${fmt(awayLine)}`,  fmt(awayLine),  awayH),
      ],
    );
  });

  // ── European Handicap lines ────────────────────────────────────────────────
  const ehLines = [-2, -1, 0, 1, 2] as const;
  const ehMarkets = ehLines.map(line => {
    const adjF = Math.exp((line - fairLine) * 0.3);
    const fmt   = (n: number) => n > 0 ? `+${n}` : `${n}`;
    return market(
      `mkt_${mid}_eh${line < 0 ? 'n' : ''}${Math.abs(line)}`,
      mid, 'mt_eur_handicap',
      `欧洲让球   ${ht} ${fmt(line)}`,
      [
        sel(`mkt_${mid}_eh${line}h`, `mkt_${mid}_eh${line}`, `${ht} ${fmt(line)}`,  `1`, o(hOdds * adjF * 1.05 * v)),
        sel(`mkt_${mid}_eh${line}d`, `mkt_${mid}_eh${line}`, `Draw ${fmt(line)}`,   `X`, o(dOdds * 0.90 * v)),
        sel(`mkt_${mid}_eh${line}a`, `mkt_${mid}_eh${line}`, `${at} ${fmt(-line)}`, `2`, o(aOdds / adjF * 1.05 * v)),
      ],
    );
  });

  // ── Half-Time / Full-Time (9 combos) ──────────────────────────────────────
  const htph = ph * 0.72;
  const htpd = pd * 1.40;
  const htpa = pa * 0.72;

  const htftData = [
    { s: '1/1', ht2: ht,    ft2: ht,    p: htph * 0.80 },
    { s: '1/X', ht2: ht,    ft2: 'Draw',p: htph * 0.05 },
    { s: '1/2', ht2: ht,    ft2: at,    p: htph * 0.04 },
    { s: 'X/1', ht2: 'Draw',ft2: ht,    p: htpd * 0.38 },
    { s: 'X/X', ht2: 'Draw',ft2: 'Draw',p: htpd * 0.40 },
    { s: 'X/2', ht2: 'Draw',ft2: at,    p: htpd * 0.22 },
    { s: '2/1', ht2: at,    ft2: ht,    p: htpa * 0.04 },
    { s: '2/X', ht2: at,    ft2: 'Draw',p: htpa * 0.05 },
    { s: '2/2', ht2: at,    ft2: at,    p: htpa * 0.80 },
  ];
  const mHTFT = market(`mkt_${mid}_htft`, mid, 'mt_ht_ft', 'Half Time / Full Time',
    htftData.map((e, i) => sel(
      `mkt_${mid}_htft_${i}`, `mkt_${mid}_htft`,
      `${e.ht2} / ${e.ft2}`, e.s,
      o(1 / Math.max(0.008, e.p) * 1.14 * v),
    )),
  );

  // ── Corners ───────────────────────────────────────────────────────────────
  const c75Ov = o(2.40 * v);  const c75Un = o(1.55 / v);
  const c85Ov = o(1.90 * v);  const c85Un = o(1.90 / v);
  const c95Ov = o(2.10 * v);  const c95Un = o(1.72 / v);
  const c105Ov= o(3.20 * v);  const c105Un= o(1.35 / v);
  const c115Ov= o(5.50 * v);  const c115Un= o(1.14 / v);

  // First team to take a corner — home slightly favoured
  const ftcH = o((1.55 + pa * 0.4) * v);
  const ftcA = o((2.30 - pa * 0.4) / v);

  // Team corners handicap
  const thcpH = o(1.90 * v); const thcpA = o(1.90 / v);

  const mC75  = market(`mkt_${mid}_c75`,  mid, 'mt_corners', 'Total Corners — Over/Under 7.5',  [
    sel(`mkt_${mid}_c75o`,  `mkt_${mid}_c75`,  'Over 7.5',   'O 7.5',  c75Ov),
    sel(`mkt_${mid}_c75u`,  `mkt_${mid}_c75`,  'Under 7.5',  'U 7.5',  c75Un),
  ]);
  const mC85  = market(`mkt_${mid}_c85`,  mid, 'mt_corners', 'Total Corners — Over/Under 8.5',  [
    sel(`mkt_${mid}_c85o`,  `mkt_${mid}_c85`,  'Over 8.5',   'O 8.5',  c85Ov),
    sel(`mkt_${mid}_c85u`,  `mkt_${mid}_c85`,  'Under 8.5',  'U 8.5',  c85Un),
  ]);
  const mC95  = market(`mkt_${mid}_c95`,  mid, 'mt_corners', 'Total Corners — Over/Under 9.5',  [
    sel(`mkt_${mid}_c95o`,  `mkt_${mid}_c95`,  'Over 9.5',   'O 9.5',  c95Ov),
    sel(`mkt_${mid}_c95u`,  `mkt_${mid}_c95`,  'Under 9.5',  'U 9.5',  c95Un),
  ]);
  const mC105 = market(`mkt_${mid}_c105`, mid, 'mt_corners', 'Total Corners — Over/Under 10.5', [
    sel(`mkt_${mid}_c105o`, `mkt_${mid}_c105`, 'Over 10.5',  'O 10.5', c105Ov),
    sel(`mkt_${mid}_c105u`, `mkt_${mid}_c105`, 'Under 10.5', 'U 10.5', c105Un),
  ]);
  const mC115 = market(`mkt_${mid}_c115`, mid, 'mt_corners', 'Total Corners — Over/Under 11.5', [
    sel(`mkt_${mid}_c115o`, `mkt_${mid}_c115`, 'Over 11.5',  'O 11.5', c115Ov),
    sel(`mkt_${mid}_c115u`, `mkt_${mid}_c115`, 'Under 11.5', 'U 11.5', c115Un),
  ]);
  const mFTC  = market(`mkt_${mid}_ftc`,  mid, 'mt_first_corner', 'First Team to Take a Corner', [
    sel(`mkt_${mid}_ftch`,  `mkt_${mid}_ftc`,  ht, ht, ftcH),
    sel(`mkt_${mid}_ftca`,  `mkt_${mid}_ftc`,  at, at, ftcA),
  ]);
  const mTHCP = market(`mkt_${mid}_thcp`, mid, 'mt_corners_hcp', `角球让球 — ${ht} -2.5`, [
    sel(`mkt_${mid}_thcph`, `mkt_${mid}_thcp`, `${ht} -2.5`, `H -2.5`, thcpH),
    sel(`mkt_${mid}_thcpa`, `mkt_${mid}_thcp`, `${at} +2.5`, `A +2.5`, thcpA),
  ]);

  // ── Clean Sheet ───────────────────────────────────────────────────────────
  const csHProb = Math.max(0.12, 0.36 - pa * 0.32);
  const csAProb = Math.max(0.12, 0.36 - ph * 0.32);
  const csHY = o(1/csHProb * 1.10 * v);
  const csHN = o(1/(1 - csHProb) * 1.10 * v);
  const csAY = o(1/csAProb * 1.10 * v);
  const csAN = o(1/(1 - csAProb) * 1.10 * v);

  const mCSH = market(`mkt_${mid}_csh`, mid, 'mt_clean_sheet', `${ht} — 零封`, [
    sel(`mkt_${mid}_cshy`, `mkt_${mid}_csh`, 'Yes', 'Yes', csHY),
    sel(`mkt_${mid}_cshn`, `mkt_${mid}_csh`, 'No',  'No',  csHN),
  ]);
  const mCSA = market(`mkt_${mid}_csa`, mid, 'mt_clean_sheet', `${at} — 零封`, [
    sel(`mkt_${mid}_csay`, `mkt_${mid}_csa`, 'Yes', 'Yes', csAY),
    sel(`mkt_${mid}_csan`, `mkt_${mid}_csa`, 'No',  'No',  csAN),
  ]);

  // ── Correct Score ─────────────────────────────────────────────────────────
  const scores: { sc: string; prob: number }[] = [
    { sc: '1-0', prob: ph * 0.30 },
    { sc: '2-0', prob: ph * 0.18 },
    { sc: '2-1', prob: ph * 0.22 },
    { sc: '3-0', prob: ph * 0.08 },
    { sc: '3-1', prob: ph * 0.09 },
    { sc: '3-2', prob: ph * 0.05 },
    { sc: '4-0', prob: ph * 0.03 },
    { sc: '4-1', prob: ph * 0.02 },
    { sc: '0-0', prob: pd * 0.38 },
    { sc: '1-1', prob: pd * 0.42 },
    { sc: '2-2', prob: pd * 0.12 },
    { sc: '3-3', prob: pd * 0.04 },
    { sc: '0-1', prob: pa * 0.30 },
    { sc: '0-2', prob: pa * 0.18 },
    { sc: '1-2', prob: pa * 0.22 },
    { sc: '0-3', prob: pa * 0.08 },
    { sc: '1-3', prob: pa * 0.09 },
    { sc: '2-3', prob: pa * 0.05 },
    { sc: '0-4', prob: pa * 0.03 },
  ].sort((a, b) => b.prob - a.prob).slice(0, 16);

  const correctScoreSels = scores.map(({ sc, prob }, i) => {
    const fairOdds = 1 / Math.max(0.004, prob) * 1.15;
    return sel(`mkt_${mid}_cs_${i}`, `mkt_${mid}_cs`, sc, sc, fairOdds * v);
  });
  correctScoreSels.push(sel(`mkt_${mid}_cs_other`, `mkt_${mid}_cs`, 'Any Other', 'AO', o(1/0.05 * 1.10 * v)));

  // ── Goal scorer players ───────────────────────────────────────────────────
  const homePlayers = getPlayers(ht);
  const awayPlayers = getPlayers(at);
  const allPlayers = [
    ...homePlayers.map((p, i) => ({ name: `${p}（主队）`, baseOdds: 3.00 + i * 0.40 })),
    ...awayPlayers.map((p, i) => ({ name: `${p}（客队）`, baseOdds: 3.50 + i * 0.45 })),
  ];

  const firstGoalSels  = allPlayers.map((p, i) => sel(`mkt_${mid}_fg_${i}`,  `mkt_${mid}_fg`,  p.name, p.name.split(' ')[0], o(p.baseOdds * v)));
  const anytimeSels    = allPlayers.map((p, i) => sel(`mkt_${mid}_ag_${i}`,  `mkt_${mid}_ag`,  p.name, p.name.split(' ')[0], o((p.baseOdds * 0.72) * v)));
  const lastGoalSels   = allPlayers.map((p, i) => sel(`mkt_${mid}_lg_${i}`,  `mkt_${mid}_lg`,  p.name, p.name.split(' ')[0], o((p.baseOdds * 1.05) * v)));

  // ── Assemble markets ──────────────────────────────────────────────────────
  const mMR   = pm;
  const mBTTS = market(`mkt_${mid}_btts`, mid, 'mt_btts', 'Both Teams to Score', [
    sel(`mkt_${mid}_bttsy`, `mkt_${mid}_btts`, 'Yes', 'Yes', bY, ph > 0.5 ? 'stable' : 'up'),
    sel(`mkt_${mid}_bttsn`, `mkt_${mid}_btts`, 'No',  'No',  bN),
  ]);
  const mOU05 = market(`mkt_${mid}_ou05`, mid, 'mt_ou_05', 'Over/Under 0.5 Goals',  [
    sel(`mkt_${mid}_ou05o`, `mkt_${mid}_ou05`, 'Over 0.5',  'O 0.5',  o05Ov),
    sel(`mkt_${mid}_ou05u`, `mkt_${mid}_ou05`, 'Under 0.5', 'U 0.5',  o05Un),
  ]);
  const mOU15 = market(`mkt_${mid}_ou15`, mid, 'mt_ou_15', 'Over/Under 1.5 Goals',  [
    sel(`mkt_${mid}_ou15o`, `mkt_${mid}_ou15`, 'Over 1.5',  'O 1.5',  o15Ov),
    sel(`mkt_${mid}_ou15u`, `mkt_${mid}_ou15`, 'Under 1.5', 'U 1.5',  o15Un),
  ]);
  const mOU25 = market(`mkt_${mid}_ou25`, mid, 'mt_ou_25', 'Over/Under 2.5 Goals',  [
    sel(`mkt_${mid}_ou25o`, `mkt_${mid}_ou25`, 'Over 2.5',  'O 2.5',  o25Ov),
    sel(`mkt_${mid}_ou25u`, `mkt_${mid}_ou25`, 'Under 2.5', 'U 2.5',  o25Un),
  ]);
  const mOU35 = market(`mkt_${mid}_ou35`, mid, 'mt_ou_35', 'Over/Under 3.5 Goals',  [
    sel(`mkt_${mid}_ou35o`, `mkt_${mid}_ou35`, 'Over 3.5',  'O 3.5',  o35Ov),
    sel(`mkt_${mid}_ou35u`, `mkt_${mid}_ou35`, 'Under 3.5', 'U 3.5',  o35Un),
  ]);
  const mOU45 = market(`mkt_${mid}_ou45`, mid, 'mt_ou_45', 'Over/Under 4.5 Goals',  [
    sel(`mkt_${mid}_ou45o`, `mkt_${mid}_ou45`, 'Over 4.5',  'O 4.5',  o45Ov),
    sel(`mkt_${mid}_ou45u`, `mkt_${mid}_ou45`, 'Under 4.5', 'U 4.5',  o45Un),
  ]);
  const mOU55 = market(`mkt_${mid}_ou55`, mid, 'mt_ou_55', 'Over/Under 5.5 Goals',  [
    sel(`mkt_${mid}_ou55o`, `mkt_${mid}_ou55`, 'Over 5.5',  'O 5.5',  o55Ov),
    sel(`mkt_${mid}_ou55u`, `mkt_${mid}_ou55`, 'Under 5.5', 'U 5.5',  o55Un),
  ]);
  const mDC   = market(`mkt_${mid}_dc`,   mid, 'mt_double_chance', 'Double Chance', [
    sel(`mkt_${mid}_dc1x`,  `mkt_${mid}_dc`,   `${ht} or Draw`,  '1X', dc1x),
    sel(`mkt_${mid}_dc12`,  `mkt_${mid}_dc`,   'Home or Away',   '12', dc12),
    sel(`mkt_${mid}_dcx2`,  `mkt_${mid}_dc`,   `Draw or ${at}`,  'X2', dcx2),
  ]);
  const mHT   = market(`mkt_${mid}_ht`,   mid, 'mt_ht_result', 'Half Time Result', [
    sel(`mkt_${mid}_ht1`,   `mkt_${mid}_ht`,   ht,       '1', ht1Odds),
    sel(`mkt_${mid}_htx`,   `mkt_${mid}_ht`,   'Draw',   'X', htXOdds),
    sel(`mkt_${mid}_ht2`,   `mkt_${mid}_ht`,   at,       '2', ht2Odds),
  ]);
  const mDNB  = market(`mkt_${mid}_dnb`,  mid, 'mt_draw_no_bet', 'Draw No Bet', [
    sel(`mkt_${mid}_dnbh`,  `mkt_${mid}_dnb`,  ht, '1', dnbH),
    sel(`mkt_${mid}_dnba`,  `mkt_${mid}_dnb`,  at, '2', dnbA),
  ]);
  const mCS   = market(`mkt_${mid}_cs`,   mid, 'mt_correct_score',    'Correct Score',        correctScoreSels);
  const mFG   = market(`mkt_${mid}_fg`,   mid, 'mt_first_scorer',     'First Goal Scorer',    firstGoalSels);
  const mAG   = market(`mkt_${mid}_ag`,   mid, 'mt_anytime_scorer',   'Anytime Goal Scorer',  anytimeSels);
  const mLG   = market(`mkt_${mid}_lg`,   mid, 'mt_last_scorer',      'Last Goal Scorer',     lastGoalSels);

  // ── Team totals & odd/even ─────────────────────────────────────────────────
  const ttHomeOv = o((2.30 - ph * 1.10) * v);
  const ttHomeUn = o((1.55 + ph * 0.80) / v);
  const ttAwayOv = o((2.30 - pa * 1.10) * v);
  const ttAwayUn = o((1.55 + pa * 0.80) / v);

  const mTTHome  = market(`mkt_${mid}_tth`, mid, 'mt_team_total', `${ht} 球队总进球 — 大/小 1.5`, [
    sel(`mkt_${mid}_ttho`, `mkt_${mid}_tth`, 'Over 1.5',  'O 1.5', ttHomeOv),
    sel(`mkt_${mid}_tthu`, `mkt_${mid}_tth`, 'Under 1.5', 'U 1.5', ttHomeUn),
  ]);
  const mTTAway  = market(`mkt_${mid}_tta`, mid, 'mt_team_total', `${at} 球队总进球 — 大/小 1.5`, [
    sel(`mkt_${mid}_ttao`, `mkt_${mid}_tta`, 'Over 1.5',  'O 1.5', ttAwayOv),
    sel(`mkt_${mid}_ttau`, `mkt_${mid}_tta`, 'Under 1.5', 'U 1.5', ttAwayUn),
  ]);
  const mGoalsOE = market(`mkt_${mid}_oe`,  mid, 'mt_goals_oddeven', 'Total Goals — Odd/Even', [
    sel(`mkt_${mid}_oeo`, `mkt_${mid}_oe`, 'Odd',  'Odd',  o(1.90 * v)),
    sel(`mkt_${mid}_oee`, `mkt_${mid}_oe`, 'Even', 'Even', o(1.90 / v)),
  ]);

  // ── Next Goal & BTTS variants ──────────────────────────────────────────────
  const ngPH = ph * 0.80 + 0.10;
  const ngPA = pa * 0.80 + 0.10;
  const ngPN = Math.max(0.05, 1 - ngPH - ngPA);
  const mNextGoal = market(`mkt_${mid}_ng`, mid, 'mt_next_goal', 'Next Goal', [
    sel(`mkt_${mid}_ngh`, `mkt_${mid}_ng`, ht,        '1',  o(1 / ngPH * 1.08 * v)),
    sel(`mkt_${mid}_ngn`, `mkt_${mid}_ng`, 'No Goal', 'No', o(1 / ngPN * 1.05 * v)),
    sel(`mkt_${mid}_nga`, `mkt_${mid}_ng`, at,        '2',  o(1 / ngPA * 1.08 * v)),
  ]);
  const mBTTSHt = market(`mkt_${mid}_bttsht`, mid, 'mt_btts_ht', 'Both Teams to Score — 1st Half', [
    sel(`mkt_${mid}_bttshty`, `mkt_${mid}_bttsht`, 'Yes', 'Yes', o(bY * 1.95 * v)),
    sel(`mkt_${mid}_bttshtn`, `mkt_${mid}_bttsht`, 'No',  'No',  o(1.22 / v)),
  ]);

  // ── Featured combinations (same-game) ──────────────────────────────────────
  const pBY = 1 / bY, pBN = 1 / bN, pOv = 1 / o25Ov, pUn = 1 / o25Un;
  const combo = (p: number) => o(1 / Math.max(0.02, p) * 1.10 * v);
  const mComboResBtts = market(`mkt_${mid}_cb_rb`, mid, 'mt_combo_result_btts', 'Result & Both Teams to Score', [
    sel(`mkt_${mid}_cb_rb_hy`, `mkt_${mid}_cb_rb`, `${ht} & Yes`, '1 & Y', combo(ph * pBY)),
    sel(`mkt_${mid}_cb_rb_dy`, `mkt_${mid}_cb_rb`, 'Draw & Yes',  'X & Y', combo(pd * pBY)),
    sel(`mkt_${mid}_cb_rb_ay`, `mkt_${mid}_cb_rb`, `${at} & Yes`, '2 & Y', combo(pa * pBY)),
    sel(`mkt_${mid}_cb_rb_hn`, `mkt_${mid}_cb_rb`, `${ht} & No`,  '1 & N', combo(ph * pBN)),
    sel(`mkt_${mid}_cb_rb_an`, `mkt_${mid}_cb_rb`, `${at} & No`,  '2 & N', combo(pa * pBN)),
  ]);
  const mComboResOU = market(`mkt_${mid}_cb_ro`, mid, 'mt_combo_result_ou', 'Result & Over/Under 2.5 Goals', [
    sel(`mkt_${mid}_cb_ro_ho`, `mkt_${mid}_cb_ro`, `${ht} & Over 2.5`,  '1 & O', combo(ph * pOv)),
    sel(`mkt_${mid}_cb_ro_hu`, `mkt_${mid}_cb_ro`, `${ht} & Under 2.5`, '1 & U', combo(ph * pUn)),
    sel(`mkt_${mid}_cb_ro_du`, `mkt_${mid}_cb_ro`, 'Draw & Under 2.5',  'X & U', combo(pd * pUn)),
    sel(`mkt_${mid}_cb_ro_ao`, `mkt_${mid}_cb_ro`, `${at} & Over 2.5`,  '2 & O', combo(pa * pOv)),
    sel(`mkt_${mid}_cb_ro_au`, `mkt_${mid}_cb_ro`, `${at} & Under 2.5`, '2 & U', combo(pa * pUn)),
  ]);
  const mComboBttsOU = market(`mkt_${mid}_cb_bo`, mid, 'mt_combo_btts_ou', 'Both Teams to Score & Over/Under 2.5', [
    sel(`mkt_${mid}_cb_bo_yo`, `mkt_${mid}_cb_bo`, 'Yes & Over 2.5',  'Y & O', combo(pBY * pOv)),
    sel(`mkt_${mid}_cb_bo_yu`, `mkt_${mid}_cb_bo`, 'Yes & Under 2.5', 'Y & U', combo(pBY * pUn)),
    sel(`mkt_${mid}_cb_bo_no`, `mkt_${mid}_cb_bo`, 'No & Over 2.5',   'N & O', combo(pBN * pOv)),
    sel(`mkt_${mid}_cb_bo_nu`, `mkt_${mid}_cb_bo`, 'No & Under 2.5',  'N & U', combo(pBN * pUn)),
  ]);

  // ── Time / minute markets ──────────────────────────────────────────────────
  const tfgBands = [
    { lbl: '1-15',    p: 0.20 },
    { lbl: '16-30',   p: 0.19 },
    { lbl: '31-45',   p: 0.18 },
    { lbl: '46-60',   p: 0.16 },
    { lbl: '61-75',   p: 0.13 },
    { lbl: '76-90',   p: 0.10 },
    { lbl: 'No Goal', p: 0.06 },
  ];
  const mFirstGoalTime = market(`mkt_${mid}_fgt`, mid, 'mt_first_goal_time', 'Time of First Goal',
    tfgBands.map((b, i) => sel(
      `mkt_${mid}_fgt_${i}`, `mkt_${mid}_fgt`,
      b.lbl === 'No Goal' ? 'No Goal' : `${b.lbl} min`, b.lbl,
      o(1 / b.p * 1.12 * v),
    )),
  );
  const mGoalIn10 = market(`mkt_${mid}_gi10`, mid, 'mt_goal_first_10', 'Goal in First 10 Minutes', [
    sel(`mkt_${mid}_gi10y`, `mkt_${mid}_gi10`, 'Yes', 'Yes', o(3.40 * v)),
    sel(`mkt_${mid}_gi10n`, `mkt_${mid}_gi10`, 'No',  'No',  o(1.28 / v)),
  ]);
  const mFhOU15 = market(`mkt_${mid}_fhou15`, mid, 'mt_fh_ou', '1st Half Goals — Over/Under 1.5', [
    sel(`mkt_${mid}_fhou15o`, `mkt_${mid}_fhou15`, 'Over 1.5',  'O 1.5', o(2.60 * v)),
    sel(`mkt_${mid}_fhou15u`, `mkt_${mid}_fhou15`, 'Under 1.5', 'U 1.5', o(1.46 / v)),
  ]);
  const mHighHalf = market(`mkt_${mid}_hsh`, mid, 'mt_highest_half', 'Highest Scoring Half', [
    sel(`mkt_${mid}_hsh1`, `mkt_${mid}_hsh`, '1st Half', '1st', o(2.70 * v)),
    sel(`mkt_${mid}_hsh2`, `mkt_${mid}_hsh`, '2nd Half', '2nd', o(2.10 * v)),
    sel(`mkt_${mid}_hshe`, `mkt_${mid}_hsh`, 'Equal',    'Eq',  o(3.10 * v)),
  ]);

  // ── Specials: cards / penalties / fouls ────────────────────────────────────
  const mCards35 = market(`mkt_${mid}_cd35`, mid, 'mt_total_cards', 'Total Cards — Over/Under 3.5', [
    sel(`mkt_${mid}_cd35o`, `mkt_${mid}_cd35`, 'Over 3.5',  'O 3.5', o(1.95 * v)),
    sel(`mkt_${mid}_cd35u`, `mkt_${mid}_cd35`, 'Under 3.5', 'U 3.5', o(1.80 / v)),
  ]);
  const mCards45 = market(`mkt_${mid}_cd45`, mid, 'mt_total_cards', 'Total Cards — Over/Under 4.5', [
    sel(`mkt_${mid}_cd45o`, `mkt_${mid}_cd45`, 'Over 4.5',  'O 4.5', o(2.70 * v)),
    sel(`mkt_${mid}_cd45u`, `mkt_${mid}_cd45`, 'Under 4.5', 'U 4.5', o(1.44 / v)),
  ]);
  const mRedCard = market(`mkt_${mid}_red`, mid, 'mt_red_card', 'Red Card in Match', [
    sel(`mkt_${mid}_redy`, `mkt_${mid}_red`, 'Yes', 'Yes', o(4.20 * v)),
    sel(`mkt_${mid}_redn`, `mkt_${mid}_red`, 'No',  'No',  o(1.20 / v)),
  ]);
  const mPenalty = market(`mkt_${mid}_pen`, mid, 'mt_penalty_awarded', 'Penalty Awarded', [
    sel(`mkt_${mid}_peny`, `mkt_${mid}_pen`, 'Yes', 'Yes', o(3.10 * v)),
    sel(`mkt_${mid}_penn`, `mkt_${mid}_pen`, 'No',  'No',  o(1.34 / v)),
  ]);
  const mFouls = market(`mkt_${mid}_fouls`, mid, 'mt_total_fouls', 'Total Fouls — Over/Under 24.5', [
    sel(`mkt_${mid}_foulso`, `mkt_${mid}_fouls`, 'Over 24.5',  'O 24.5', o(1.90 * v)),
    sel(`mkt_${mid}_foulsu`, `mkt_${mid}_fouls`, 'Under 24.5', 'U 24.5', o(1.85 / v)),
  ]);

  return [
    {
      id: 'popular', name: 'Popular', icon: '⭐', category: 'popular',
      markets: [mMR, mBTTS, mOU25, mDNB],
      isDefaultOpen: true,
    },
    {
      id: 'goals', name: 'Goals / BTTS / Next Goal', icon: '⚽', category: 'goals',
      markets: [mBTTS, mBTTSHt, mNextGoal, mOU15, mOU25, mOU35],
      isDefaultOpen: true,
    },
    {
      id: 'overunder', name: 'Over / Under', icon: '📈', category: 'goals',
      markets: [mOU05, mOU15, mOU25, mOU35, mOU45, mOU55, mTTHome, mTTAway, mGoalsOE],
      isDefaultOpen: false,
    },
    {
      id: 'combos', name: 'Featured Combinations', icon: '🔥', category: 'specials',
      markets: [mComboResBtts, mComboResOU, mComboBttsOU],
      isDefaultOpen: false,
    },
    {
      id: 'timing', name: 'Time / Minute', icon: '🕐', category: 'specials',
      markets: [mFirstGoalTime, mGoalIn10, mFhOU15, mHighHalf],
      isDefaultOpen: false,
    },
    {
      id: 'result', name: 'Match Result', icon: '🏆', category: 'result',
      markets: [mMR, mDC, mDNB, mHT],
      isDefaultOpen: false,
    },
    {
      id: 'handicap', name: 'Handicap', icon: '⚖️', category: 'handicap',
      markets: hcpMarkets,
      isDefaultOpen: false,
    },
    {
      id: 'eur-handicap', name: 'European Handicap', icon: '🇪🇺', category: 'handicap',
      markets: ehMarkets,
      isDefaultOpen: false,
    },
    {
      id: 'halftime', name: 'Half Time', icon: '⏱️', category: 'specials',
      markets: [mHT, mHTFT],
      isDefaultOpen: false,
    },
    {
      id: 'corners', name: 'Corners', icon: '🚩', category: 'specials',
      markets: [mC85, mC95, mC105, mC75, mC115, mFTC, mTHCP],
      isDefaultOpen: false,
    },
    {
      id: 'cleansheet', name: 'Clean Sheet', icon: '🛡️', category: 'specials',
      markets: [mCSH, mCSA],
      isDefaultOpen: false,
    },
    {
      id: 'correctscore', name: 'Correct Score', icon: '🎯', category: 'specials',
      markets: [mCS],
      isDefaultOpen: false,
    },
    {
      id: 'goalscorer', name: 'Goal Scorer', icon: '👟', category: 'players',
      markets: [mFG, mAG, mLG],
      isDefaultOpen: false,
    },
    {
      id: 'cards-specials', name: 'Specials', icon: '🃏', category: 'specials',
      markets: [mCards35, mCards45, mRedCard, mPenalty, mFouls],
      isDefaultOpen: false,
    },
  ];
}

// ── Tennis markets ────────────────────────────────────────────────────────────

function tennisMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: p1, awayTeamName: p2, primaryMarket: pm } = match;
  const v = vs(mid);
  const p1Odds = pm.selections[0]?.odds ?? 1.8;
  const p2Odds = pm.selections[pm.selections.length - 1]?.odds ?? 2.1;

  const p1Better = p1Odds < p2Odds;
  const set20 = o((p1Better ? 2.80 : 4.20) * v);
  const set21 = o((p1Better ? 3.60 : 5.50) * v);
  const set12 = o((p1Better ? 5.50 : 3.60) * v);
  const set02 = o((p1Better ? 4.20 : 2.80) * v);

  const s1p1 = o(p1Odds * 0.90 * v);
  const s1p2 = o(p2Odds * 0.90 * v);
  const s2p1 = o(p1Odds * 0.92 * v);
  const s2p2 = o(p2Odds * 0.92 * v);
  const tgOver  = o(1.88 * v);
  const tgUnder = o(1.92 / v);

  const mMW = pm;
  const mSB = market(`mkt_${mid}_sb`, mid, 'mt_set_betting', 'Set Betting', [
    sel(`mkt_${mid}_sb20`, `mkt_${mid}_sb`, `${p1} 2-0`, '2-0', set20),
    sel(`mkt_${mid}_sb21`, `mkt_${mid}_sb`, `${p1} 2-1`, '2-1', set21),
    sel(`mkt_${mid}_sb12`, `mkt_${mid}_sb`, `${p2} 1-2`, '1-2', set12),
    sel(`mkt_${mid}_sb02`, `mkt_${mid}_sb`, `${p2} 0-2`, '0-2', set02),
  ]);
  const mS1 = market(`mkt_${mid}_s1w`, mid, 'mt_set_winner', 'Set 1 Winner', [
    sel(`mkt_${mid}_s1w1`, `mkt_${mid}_s1w`, p1, p1.split(' ')[0], s1p1),
    sel(`mkt_${mid}_s1w2`, `mkt_${mid}_s1w`, p2, p2.split(' ')[0], s1p2),
  ]);
  const mS2 = market(`mkt_${mid}_s2w`, mid, 'mt_set_winner', 'Set 2 Winner', [
    sel(`mkt_${mid}_s2w1`, `mkt_${mid}_s2w`, p1, p1.split(' ')[0], s2p1),
    sel(`mkt_${mid}_s2w2`, `mkt_${mid}_s2w`, p2, p2.split(' ')[0], s2p2),
  ]);
  const mTG = market(`mkt_${mid}_tg`, mid, 'mt_total_games', 'Total Games Over/Under 21.5', [
    sel(`mkt_${mid}_tgo`,  `mkt_${mid}_tg`,  'Over 21.5',  'O 21.5', tgOver),
    sel(`mkt_${mid}_tgu`,  `mkt_${mid}_tg`,  'Under 21.5', 'U 21.5', tgUnder),
  ]);
  const mTB = market(`mkt_${mid}_tb`, mid, 'mt_tiebreak', 'Match Tiebreak — Yes/No', [
    sel(`mkt_${mid}_tby`, `mkt_${mid}_tb`, 'Yes — Match goes to tiebreak', 'Yes', o(2.20 * v)),
    sel(`mkt_${mid}_tbn`, `mkt_${mid}_tb`, 'No',                           'No',  o(1.65 / v)),
  ]);

  return [
    { id: 'popular', name: 'Popular',     icon: '⭐', category: 'popular', markets: [mMW, mSB],      isDefaultOpen: true  },
    { id: 'sets',    name: 'Set Betting', icon: '🎾', category: 'sets',    markets: [mSB, mS1, mS2], isDefaultOpen: true  },
    { id: 'games',   name: 'Games',       icon: '📊', category: 'goals',   markets: [mTG, mTB],       isDefaultOpen: false },
  ];
}

// ── Basketball / NBA markets ──────────────────────────────────────────────────

function basketballMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: ht, awayTeamName: at, primaryMarket: pm } = match;
  const v = vs(mid);
  const hOdds = pm.selections[0]?.odds ?? 1.85;
  const aOdds = pm.selections[pm.selections.length - 1]?.odds ?? 2.00;
  const hBetter = hOdds < aOdds;

  const hcpH = o(1.90 * v);
  const hcpA = o(1.90 / v);
  const spread = hBetter ? '-5.5' : '+5.5';

  const tot225Ov = o(1.90 * v);  const tot225Un = o(1.90 / v);
  const tot235Ov = o(1.88 * v);  const tot235Un = o(1.92 / v);

  const q1H = o(hOdds * 0.88 * v);  const q1A = o(aOdds * 0.88 / v);
  const q2H = o(hOdds * 0.90 * v);  const q2A = o(aOdds * 0.90 / v);

  const mMW   = pm;
  const mHCP  = market(`mkt_${mid}_hcp`,  mid, 'mt_point_spread', `分差盘 (${spread})`, [
    sel(`mkt_${mid}_hcph`,  `mkt_${mid}_hcp`,  `${ht} ${spread}`,                          ht, hcpH),
    sel(`mkt_${mid}_hcpa`,  `mkt_${mid}_hcp`,  `${at} ${spread === '-5.5' ? '+5.5' : '-5.5'}`, at, hcpA),
  ]);
  const mT225 = market(`mkt_${mid}_t225`, mid, 'mt_total_pts', 'Total Points Over/Under 225.5', [
    sel(`mkt_${mid}_t225o`, `mkt_${mid}_t225`, 'Over 225.5',  'O 225.5', tot225Ov),
    sel(`mkt_${mid}_t225u`, `mkt_${mid}_t225`, 'Under 225.5', 'U 225.5', tot225Un),
  ]);
  const mT235 = market(`mkt_${mid}_t235`, mid, 'mt_total_pts', 'Total Points Over/Under 235.5', [
    sel(`mkt_${mid}_t235o`, `mkt_${mid}_t235`, 'Over 235.5',  'O 235.5', tot235Ov),
    sel(`mkt_${mid}_t235u`, `mkt_${mid}_t235`, 'Under 235.5', 'U 235.5', tot235Un),
  ]);
  const mQ1   = market(`mkt_${mid}_q1`,   mid, 'mt_quarter_winner', 'Q1 Winner', [
    sel(`mkt_${mid}_q1h`,   `mkt_${mid}_q1`,   ht, ht, q1H),
    sel(`mkt_${mid}_q1a`,   `mkt_${mid}_q1`,   at, at, q1A),
  ]);
  const mQ2   = market(`mkt_${mid}_q2`,   mid, 'mt_quarter_winner', 'Q2 Winner', [
    sel(`mkt_${mid}_q2h`,   `mkt_${mid}_q2`,   ht, ht, q2H),
    sel(`mkt_${mid}_q2a`,   `mkt_${mid}_q2`,   at, at, q2A),
  ]);
  const mOT   = market(`mkt_${mid}_ot`,   mid, 'mt_overtime', 'Overtime?', [
    sel(`mkt_${mid}_oty`,   `mkt_${mid}_ot`,   'Yes — Goes to OT', 'Yes', o(4.80 * v)),
    sel(`mkt_${mid}_otn`,   `mkt_${mid}_ot`,   'No',               'No',  o(1.20)),
  ]);

  return [
    { id: 'popular',  name: 'Popular',  icon: '⭐', category: 'popular',  markets: [mMW, mHCP, mT225], isDefaultOpen: true  },
    { id: 'totals',   name: 'Totals',   icon: '📊', category: 'goals',    markets: [mT225, mT235],      isDefaultOpen: true  },
    { id: 'quarters', name: 'Quarters', icon: '🏀', category: 'quarters', markets: [mQ1, mQ2],          isDefaultOpen: false },
    { id: 'specials', name: 'Specials', icon: '🎯', category: 'specials', markets: [mOT],               isDefaultOpen: false },
  ];
}

// ── Esports markets ───────────────────────────────────────────────────────────

function esportsMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: t1, awayTeamName: t2, primaryMarket: pm } = match;
  const v = vs(mid);
  const h = pm.selections[0]?.odds ?? 1.85;
  const a = pm.selections[pm.selections.length - 1]?.odds ?? 2.05;
  const t1Fav = h < a;

  const m1T1 = o((t1Fav ? h * 0.85 : h * 1.05) * v);
  const m1T2 = o((t1Fav ? a * 1.10 : a * 0.85) / v);
  const m2T1 = o(h * 0.92 * v);
  const m2T2 = o(a * 0.92 / v);
  const m3T1 = o(h * 0.95 * v);
  const m3T2 = o(a * 0.95 / v);

  const hcpH = o(1.90 * v);
  const hcpA = o(1.90 / v);

  const mMW  = pm;
  const mSB  = market(`mkt_${mid}_sb`,  mid, 'mt_series_score',  'Series Correct Score', [
    sel(`mkt_${mid}_sb20`, `mkt_${mid}_sb`,  `${t1} 2-0`, '2-0', o((t1Fav ? 3.0 : 5.0) * v)),
    sel(`mkt_${mid}_sb21`, `mkt_${mid}_sb`,  `${t1} 2-1`, '2-1', o((t1Fav ? 4.5 : 7.0) * v)),
    sel(`mkt_${mid}_sb12`, `mkt_${mid}_sb`,  `${t2} 1-2`, '1-2', o((!t1Fav ? 4.5 : 7.0) * v)),
    sel(`mkt_${mid}_sb02`, `mkt_${mid}_sb`,  `${t2} 0-2`, '0-2', o((!t1Fav ? 3.0 : 5.0) * v)),
  ]);
  const mM1  = market(`mkt_${mid}_m1`,  mid, 'mt_map_winner',    'Map 1 Winner', [
    sel(`mkt_${mid}_m11`,  `mkt_${mid}_m1`,  t1, t1, m1T1), sel(`mkt_${mid}_m12`, `mkt_${mid}_m1`, t2, t2, m1T2),
  ]);
  const mM2  = market(`mkt_${mid}_m2`,  mid, 'mt_map_winner',    'Map 2 Winner', [
    sel(`mkt_${mid}_m21`,  `mkt_${mid}_m2`,  t1, t1, m2T1), sel(`mkt_${mid}_m22`, `mkt_${mid}_m2`, t2, t2, m2T2),
  ]);
  const mM3  = market(`mkt_${mid}_m3`,  mid, 'mt_map_winner',    'Map 3 Winner (if played)', [
    sel(`mkt_${mid}_m31`,  `mkt_${mid}_m3`,  t1, t1, m3T1), sel(`mkt_${mid}_m32`, `mkt_${mid}_m3`, t2, t2, m3T2),
  ]);
  const mR1  = market(`mkt_${mid}_r1`,  mid, 'mt_total_rounds',  'Map 1 Total Rounds O/U 26.5', [
    sel(`mkt_${mid}_r1o`,  `mkt_${mid}_r1`,  'Over 26.5',  'O 26.5', o(1.88 * v)),
    sel(`mkt_${mid}_r1u`,  `mkt_${mid}_r1`,  'Under 26.5', 'U 26.5', o(1.92 / v)),
  ]);
  const mHCP = market(`mkt_${mid}_hcp`, mid, 'mt_map_handicap',  'Map Handicap (-1.5)', [
    sel(`mkt_${mid}_hcph`, `mkt_${mid}_hcp`, `${t1} -1.5`, t1, hcpH),
    sel(`mkt_${mid}_hcpa`, `mkt_${mid}_hcp`, `${t2} +1.5`, t2, hcpA),
  ]);

  return [
    { id: 'popular', name: 'Popular',    icon: '⭐', category: 'popular', markets: [mMW, mSB, mM1],  isDefaultOpen: true  },
    { id: 'maps',    name: 'Map Winner', icon: '🗺️', category: 'maps',    markets: [mM1, mM2, mM3], isDefaultOpen: true  },
    { id: 'rounds',  name: 'Rounds',     icon: '📊', category: 'goals',   markets: [mR1, mHCP],      isDefaultOpen: false },
  ];
}

// ── Horse racing markets ──────────────────────────────────────────────────────

function horseRacingMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: runner, primaryMarket: pm } = match;
  const v = vs(mid);
  const winOdds = pm.selections[0]?.odds ?? 4.0;
  const plOdds  = o(winOdds * 0.28 * v);

  const fakeRunners = [
    { name: runner,         win: winOdds,          place: plOdds },
    { name: '夜之星',       win: o(3.50 * v),      place: o(1.60 * v) },
    { name: '雷霆湾',       win: o(5.00 * v),      place: o(1.90 * v) },
    { name: '银色黎明',     win: o(7.50 * v),      place: o(2.50 * v) },
    { name: '皇家骑士',     win: o(10.0 * v),      place: o(3.20 * v) },
    { name: '沙漠玫瑰',     win: o(14.0 * v),      place: o(4.50 * v) },
  ];

  const winSels   = fakeRunners.map((r, i) => sel(`mkt_${mid}_win${i}`,   `mkt_${mid}_win`,   r.name, r.name, r.win));
  const placeSels = fakeRunners.map((r, i) => sel(`mkt_${mid}_plc${i}`,   `mkt_${mid}_place`, r.name, r.name, r.place));
  const ewSels    = fakeRunners.map((r, i) => sel(`mkt_${mid}_ew${i}`,    `mkt_${mid}_ew`,    r.name, r.name, o(r.win * 0.5)));

  const mWin   = market(`mkt_${mid}_win`,   mid, 'mt_win_only',  'Win',                         winSels);
  const mPlace = market(`mkt_${mid}_place`, mid, 'mt_place',     'Place (1/4 odds, 3 places)',  placeSels);
  const mEW    = market(`mkt_${mid}_ew`,    mid, 'mt_each_way',  'Each Way',                    ewSels);

  return [
    { id: 'runners', name: 'Runners', icon: '🏇', category: 'runners', markets: [mWin, mPlace, mEW], isDefaultOpen: true },
  ];
}

// ── Generic fallback ──────────────────────────────────────────────────────────
//
// Used for every sport without a dedicated generator (American football, baseball,
// cricket, MMA, ice hockey, rugby, boxing, darts, golf, handball, snooker,
// volleyball, etc.). Derives a full set of market types from the primary market
// so EVERY match shows rich markets — never just the single 1X2 / winner line.

function genericMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: ht, awayTeamName: at, primaryMarket: pm } = match;
  const v = vs(mid);
  const sels = pm.selections;
  const threeWay = sels.length >= 3;

  const hOdds = sels[0]?.odds ?? 2.0;
  const aOdds = sels[sels.length - 1]?.odds ?? 2.0;
  const dOdds = threeWay ? (sels[1]?.odds ?? 3.3) : 0;

  const ih = 1 / hOdds, ia = 1 / aOdds, idr = threeWay ? 1 / dOdds : 0;
  const tot = ih + ia + idr;
  const ph = ih / tot, pa = ia / tot, pdr = threeWay ? idr / tot : 0;

  // ── Match result / winner (primary) ──────────────────────────────────────
  const mMR = pm;

  // ── Double chance (three-way only) ───────────────────────────────────────
  const mDC = market(`mkt_${mid}_dc`, mid, 'mt_double_chance', 'Double Chance', [
    sel(`mkt_${mid}_dc1x`, `mkt_${mid}_dc`, `${ht} or Draw`,  '1X', o(1 / (ph + pdr) * 1.06 * v)),
    sel(`mkt_${mid}_dc12`, `mkt_${mid}_dc`, `${ht} or ${at}`, '12', o(1 / (ph + pa)  * 1.06 * v)),
    sel(`mkt_${mid}_dcx2`, `mkt_${mid}_dc`, `Draw or ${at}`,  'X2', o(1 / (pdr + pa) * 1.06 * v)),
  ]);

  // ── Draw No Bet (three-way only) ─────────────────────────────────────────
  const mDNB = market(`mkt_${mid}_dnb`, mid, 'mt_draw_no_bet', 'Draw No Bet', [
    sel(`mkt_${mid}_dnbh`, `mkt_${mid}_dnb`, ht, ht, o(1 / (ph / (ph + pa)) * 1.04 * v)),
    sel(`mkt_${mid}_dnba`, `mkt_${mid}_dnb`, at, at, o(1 / (pa / (ph + pa)) * 1.04 * v)),
  ]);

  // ── Handicap — derive from base probabilities ────────────────────────────
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const hcpLines = threeWay ? [-2, -1, 1, 2] : [-2.5, -1.5, 1.5, 2.5];
  const hcpMarkets = hcpLines.map((line, i) => {
    const hp = Math.min(0.92, Math.max(0.08, ph - line * 0.11));
    const apw = 1 - hp;
    return market(`mkt_${mid}_hcp${i}`, mid, 'mt_handicap', `让球 ${fmt(line)}`, [
      sel(`mkt_${mid}_hcp${i}h`, `mkt_${mid}_hcp${i}`, `${ht} ${fmt(line)}`,  ht, o(1 / hp  * 1.05 * v)),
      sel(`mkt_${mid}_hcp${i}a`, `mkt_${mid}_hcp${i}`, `${at} ${fmt(-line)}`, at, o(1 / apw * 1.05 * v)),
    ]);
  });

  // ── Totals — Over/Under ──────────────────────────────────────────────────
  const totalDefs = [
    { line: '1.5', ov: 1.30, un: 3.40 },
    { line: '2.5', ov: 1.85, un: 1.95 },
    { line: '3.5', ov: 2.90, un: 1.42 },
    { line: '4.5', ov: 4.60, un: 1.18 },
  ];
  const totalMarkets = totalDefs.map((t, i) =>
    market(`mkt_${mid}_tot${i}`, mid, 'mt_total', `总分 — 大/小 ${t.line}`, [
      sel(`mkt_${mid}_tot${i}o`, `mkt_${mid}_tot${i}`, `Over ${t.line}`,  `O ${t.line}`, o(t.ov * v)),
      sel(`mkt_${mid}_tot${i}u`, `mkt_${mid}_tot${i}`, `Under ${t.line}`, `U ${t.line}`, o(t.un / v)),
    ]),
  );

  // ── Total Odd / Even ─────────────────────────────────────────────────────
  const mOE = market(`mkt_${mid}_oe`, mid, 'mt_odd_even', 'Total — Odd / Even', [
    sel(`mkt_${mid}_oeo`, `mkt_${mid}_oe`, 'Odd',  'Odd',  o(1.95 * v)),
    sel(`mkt_${mid}_oee`, `mkt_${mid}_oe`, 'Even', 'Even', o(1.85 / v)),
  ]);

  const popularMarkets = threeWay
    ? [mMR, mDC, hcpMarkets[1], totalMarkets[1]]
    : [mMR, hcpMarkets[1], totalMarkets[1]];
  const resultMarkets = threeWay ? [mMR, mDC, mDNB] : [mMR];

  const groups: MarketDetailGroup[] = [
    { id: 'popular',  name: 'Popular',      icon: '⭐', category: 'popular',  markets: popularMarkets,        isDefaultOpen: true  },
  ];
  if (threeWay) {
    groups.push({ id: 'result', name: 'Match Result', icon: '🏆', category: 'result', markets: resultMarkets, isDefaultOpen: true });
  }
  groups.push(
    { id: 'handicap', name: 'Handicap',     icon: '⚖️', category: 'handicap', markets: hcpMarkets,            isDefaultOpen: false },
    { id: 'totals',   name: 'Over / Under', icon: '📈', category: 'goals',    markets: [...totalMarkets, mOE], isDefaultOpen: false },
  );
  return groups;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateDetailMarkets(match: MatchEntity): MarketDetailGroup[] {
  const sport = match.sportId;
  if (sport === 'sp_soccer' || sport === 'sp_ucl') return soccerMarkets(match);
  if (sport === 'sp_tennis')       return tennisMarkets(match);
  if (sport === 'sp_nba' || sport === 'sp_basketball') return basketballMarkets(match);
  if (sport === 'sp_esports')      return esportsMarkets(match);
  if (sport === 'sp_horse_racing') return horseRacingMarkets(match);
  return genericMarkets(match);
}
