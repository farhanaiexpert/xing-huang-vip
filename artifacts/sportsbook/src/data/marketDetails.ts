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
  return TEAM_PLAYERS[teamName] ?? ['Player A', 'Player B', 'Player C', 'Player D', 'Player E'];
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

  // Double chance
  const dc1x = o(1/(ph+pd) * 1.06 * v);
  const dc12  = o(1/(ph+pa) * 1.06 * v);
  const dcx2  = o(1/(pd+pa) * 1.06 * v);

  // HT result  
  const ht1 = o(hOdds * 1.30 * v);
  const htX = o(1.88 * v);
  const ht2 = o(aOdds * 1.50 * v);

  // BTTS
  const bY = o((1.62 + pd * 0.7) * v);
  const bN = o((2.18 - pd * 0.5) * v);

  // Over/under goals
  const o15Ov = o(1.30 * v);  const o15Un = o(3.40 / v);
  const o25Ov = o(1.88 * v);  const o25Un = o(1.92 / v);
  const o35Ov = o(3.20 * v);  const o35Un = o(1.33 / v);
  const o45Ov = o(6.50 * v);  const o45Un = o(1.10);

  // Asian handicap (home -1 if home favored, +1 if away or even)
  const hcpLine = ph > 0.50 ? '-1' : ph > 0.40 ? '0' : '+1';
  const hcpHFav = ph > 0.50;
  const hcpH = o(hcpHFav ? 2.05 * v : 1.88 * v);
  const hcpA = o(hcpHFav ? 1.85 / v : 2.02 / v);

  // Correct score — top 10 most likely + other
  const scores: { sc: string; prob: number }[] = [
    { sc: '1-0', prob: ph * 0.30 },
    { sc: '2-0', prob: ph * 0.18 },
    { sc: '2-1', prob: ph * 0.22 },
    { sc: '3-0', prob: ph * 0.08 },
    { sc: '3-1', prob: ph * 0.09 },
    { sc: '0-0', prob: pd * 0.38 },
    { sc: '1-1', prob: pd * 0.42 },
    { sc: '2-2', prob: pd * 0.12 },
    { sc: '0-1', prob: pa * 0.30 },
    { sc: '0-2', prob: pa * 0.18 },
    { sc: '1-2', prob: pa * 0.22 },
  ].sort((a, b) => b.prob - a.prob).slice(0, 10);
  const otherProb = 0.06;

  const correctScoreSels = scores.map(({ sc, prob }, i) => {
    const fairOdds = 1 / Math.max(0.005, prob) * 1.15;
    return sel(`mkt_${mid}_cs_${i}`, `mkt_${mid}_cs`, sc, sc, fairOdds * v);
  });
  correctScoreSels.push(sel(`mkt_${mid}_cs_other`, `mkt_${mid}_cs`, 'Any Other', 'AO', (1/otherProb) * 1.10 * v));

  // Goal scorer players
  const homePlayers = getPlayers(ht);
  const awayPlayers = getPlayers(at);
  const allPlayers = [
    ...homePlayers.map((p, i) => ({ name: `${p} (${ht})`, baseOdds: 3.00 + i * 0.40 })),
    ...awayPlayers.map((p, i) => ({ name: `${p} (${at})`, baseOdds: 3.50 + i * 0.45 })),
  ];

  const firstGoalSels = allPlayers.map((p, i) =>
    sel(`mkt_${mid}_fg_${i}`, `mkt_${mid}_fg`, p.name, p.name.split(' ')[0], o(p.baseOdds * v))
  );
  const anytimeSels = allPlayers.map((p, i) =>
    sel(`mkt_${mid}_ag_${i}`, `mkt_${mid}_ag`, p.name, p.name.split(' ')[0], o((p.baseOdds * 0.72) * v))
  );

  // Build markets
  const mMR  = pm; // reuse primary
  const mBTTS = market(`mkt_${mid}_btts`,  mid, 'mt_btts', 'Both Teams to Score', [
    sel(`mkt_${mid}_btts_y`, `mkt_${mid}_btts`, 'Yes', 'Yes', bY, ph > 0.5 ? 'stable' : 'up'),
    sel(`mkt_${mid}_btts_n`, `mkt_${mid}_btts`, 'No',  'No',  bN),
  ]);
  const mOU25 = market(`mkt_${mid}_ou25`, mid, 'mt_ou_25', 'Over/Under 2.5', [
    sel(`mkt_${mid}_ou25_o`, `mkt_${mid}_ou25`, 'Over 2.5',  'O 2.5', o25Ov),
    sel(`mkt_${mid}_ou25_u`, `mkt_${mid}_ou25`, 'Under 2.5', 'U 2.5', o25Un),
  ]);
  const mOU15 = market(`mkt_${mid}_ou15`, mid, 'mt_ou_15', 'Over/Under 1.5', [
    sel(`mkt_${mid}_ou15_o`, `mkt_${mid}_ou15`, 'Over 1.5',  'O 1.5', o15Ov),
    sel(`mkt_${mid}_ou15_u`, `mkt_${mid}_ou15`, 'Under 1.5', 'U 1.5', o15Un),
  ]);
  const mOU35 = market(`mkt_${mid}_ou35`, mid, 'mt_ou_35', 'Over/Under 3.5', [
    sel(`mkt_${mid}_ou35_o`, `mkt_${mid}_ou35`, 'Over 3.5',  'O 3.5', o35Ov),
    sel(`mkt_${mid}_ou35_u`, `mkt_${mid}_ou35`, 'Under 3.5', 'U 3.5', o35Un),
  ]);
  const mOU45 = market(`mkt_${mid}_ou45`, mid, 'mt_ou_45', 'Over/Under 4.5', [
    sel(`mkt_${mid}_ou45_o`, `mkt_${mid}_ou45`, 'Over 4.5',  'O 4.5', o45Ov),
    sel(`mkt_${mid}_ou45_u`, `mkt_${mid}_ou45`, 'Under 4.5', 'U 4.5', o45Un),
  ]);
  const mDC = market(`mkt_${mid}_dc`, mid, 'mt_double_chance', 'Double Chance', [
    sel(`mkt_${mid}_dc_1x`, `mkt_${mid}_dc`, `${ht} or Draw`, '1X', dc1x),
    sel(`mkt_${mid}_dc_12`, `mkt_${mid}_dc`, 'Home or Away',  '12', dc12),
    sel(`mkt_${mid}_dc_x2`, `mkt_${mid}_dc`, `Draw or ${at}`, 'X2', dcx2),
  ]);
  const mHT = market(`mkt_${mid}_ht`, mid, 'mt_ht_result', 'Half Time Result', [
    sel(`mkt_${mid}_ht_1`, `mkt_${mid}_ht`, `${ht}`, '1', ht1),
    sel(`mkt_${mid}_ht_x`, `mkt_${mid}_ht`, 'Draw', 'X', htX),
    sel(`mkt_${mid}_ht_2`, `mkt_${mid}_ht`, `${at}`, '2', ht2),
  ]);
  const mHCP = market(`mkt_${mid}_hcp`, mid, 'mt_asian_handicap', `Asian Handicap (${hcpLine})`, [
    sel(`mkt_${mid}_hcp_h`, `mkt_${mid}_hcp`, `${ht} ${hcpLine}`, ht, hcpH),
    sel(`mkt_${mid}_hcp_a`, `mkt_${mid}_hcp`, `${at} ${hcpLine === '-1' ? '+1' : hcpLine === '+1' ? '-1' : '0'}`, at, hcpA),
  ]);
  const mCS = market(`mkt_${mid}_cs`, mid, 'mt_correct_score', 'Correct Score', correctScoreSels);
  const mFG = market(`mkt_${mid}_fg`, mid, 'mt_first_scorer', 'First Goal Scorer', firstGoalSels);
  const mAG = market(`mkt_${mid}_ag`, mid, 'mt_anytime_scorer', 'Anytime Goal Scorer', anytimeSels);

  // European Handicap lines
  const mEH = market(`mkt_${mid}_eh`, mid, 'mt_eur_handicap', `European Handicap`, [
    sel(`mkt_${mid}_eh_h1`, `mkt_${mid}_eh`, `${ht} (-1)`, `${ht} -1`, o(hOdds * 1.55 * v)),
    sel(`mkt_${mid}_eh_d1`, `mkt_${mid}_eh`, `Draw (-1)`, `X -1`, o(dOdds * 0.70 * v)),
    sel(`mkt_${mid}_eh_a1`, `mkt_${mid}_eh`, `${at} (-1)`, `${at} -1`, o(aOdds * 0.55 * v)),
  ]);

  return [
    { id: 'popular',      name: 'Popular',         icon: '⭐', category: 'popular',   markets: [mMR, mBTTS, mOU25],                 isDefaultOpen: true  },
    { id: 'goals',        name: 'Goals',            icon: '⚽', category: 'goals',     markets: [mBTTS, mOU15, mOU25, mOU35, mOU45], isDefaultOpen: true  },
    { id: 'result',       name: 'Match Result',     icon: '🏆', category: 'result',    markets: [mMR, mDC, mHT],                     isDefaultOpen: false },
    { id: 'handicap',     name: 'Handicap',         icon: '⚖️', category: 'handicap',  markets: [mHCP, mEH],                         isDefaultOpen: false },
    { id: 'correctscore', name: 'Correct Score',    icon: '🎯', category: 'specials',  markets: [mCS],                               isDefaultOpen: false },
    { id: 'goalscorer',   name: 'Goal Scorer',      icon: '👟', category: 'players',   markets: [mFG, mAG],                          isDefaultOpen: false },
  ];
}

// ── Tennis markets ────────────────────────────────────────────────────────────

function tennisMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: p1, awayTeamName: p2, primaryMarket: pm } = match;
  const v = vs(mid);
  const p1Odds = pm.selections[0]?.odds ?? 1.8;
  const p2Odds = pm.selections[pm.selections.length - 1]?.odds ?? 2.1;

  // Set betting
  const p1Better = p1Odds < p2Odds;
  const set20 = o((p1Better ? 2.80 : 4.20) * v);
  const set21 = o((p1Better ? 3.60 : 5.50) * v);
  const set12 = o((p1Better ? 5.50 : 3.60) * v);
  const set02 = o((p1Better ? 4.20 : 2.80) * v);

  // Set winners
  const s1p1 = o(p1Odds * 0.90 * v);
  const s1p2 = o(p2Odds * 0.90 * v);
  const s2p1 = o(p1Odds * 0.92 * v);
  const s2p2 = o(p2Odds * 0.92 * v);

  // Total games
  const tgOver = o(1.88 * v);
  const tgUnder = o(1.92 / v);

  const mMW = pm;
  const mSB = market(`mkt_${mid}_sb`, mid, 'mt_set_betting', 'Set Betting', [
    sel(`mkt_${mid}_sb_20`, `mkt_${mid}_sb`, `${p1} 2-0`, '2-0', set20),
    sel(`mkt_${mid}_sb_21`, `mkt_${mid}_sb`, `${p1} 2-1`, '2-1', set21),
    sel(`mkt_${mid}_sb_12`, `mkt_${mid}_sb`, `${p2} 1-2`, '1-2', set12),
    sel(`mkt_${mid}_sb_02`, `mkt_${mid}_sb`, `${p2} 0-2`, '0-2', set02),
  ]);
  const mS1 = market(`mkt_${mid}_s1w`, mid, 'mt_set_winner', 'Set 1 Winner', [
    sel(`mkt_${mid}_s1w_1`, `mkt_${mid}_s1w`, p1, p1.split(' ')[0], s1p1),
    sel(`mkt_${mid}_s1w_2`, `mkt_${mid}_s1w`, p2, p2.split(' ')[0], s1p2),
  ]);
  const mS2 = market(`mkt_${mid}_s2w`, mid, 'mt_set_winner', 'Set 2 Winner', [
    sel(`mkt_${mid}_s2w_1`, `mkt_${mid}_s2w`, p1, p1.split(' ')[0], s2p1),
    sel(`mkt_${mid}_s2w_2`, `mkt_${mid}_s2w`, p2, p2.split(' ')[0], s2p2),
  ]);
  const mTG = market(`mkt_${mid}_tg`, mid, 'mt_total_games', 'Total Games Over/Under 21.5', [
    sel(`mkt_${mid}_tg_o`, `mkt_${mid}_tg`, 'Over 21.5', 'O 21.5', tgOver),
    sel(`mkt_${mid}_tg_u`, `mkt_${mid}_tg`, 'Under 21.5', 'U 21.5', tgUnder),
  ]);
  const mTB = market(`mkt_${mid}_tb`, mid, 'mt_tiebreak', 'Match Tiebreak — Yes/No', [
    sel(`mkt_${mid}_tb_y`, `mkt_${mid}_tb`, 'Yes — Match goes to tiebreak', 'Yes', o(2.20 * v)),
    sel(`mkt_${mid}_tb_n`, `mkt_${mid}_tb`, 'No', 'No', o(1.65 / v)),
  ]);

  return [
    { id: 'popular', name: 'Popular',      icon: '⭐', category: 'popular', markets: [mMW, mSB],        isDefaultOpen: true  },
    { id: 'sets',    name: 'Set Betting',  icon: '🎾', category: 'sets',    markets: [mSB, mS1, mS2],   isDefaultOpen: true  },
    { id: 'games',   name: 'Games',        icon: '📊', category: 'goals',   markets: [mTG, mTB],         isDefaultOpen: false },
  ];
}

// ── Basketball / NBA markets ──────────────────────────────────────────────────

function basketballMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: ht, awayTeamName: at, primaryMarket: pm } = match;
  const v = vs(mid);
  const hOdds = pm.selections[0]?.odds ?? 1.85;
  const aOdds = pm.selections[pm.selections.length - 1]?.odds ?? 2.00;
  const hBetter = hOdds < aOdds;

  // Handicap
  const hcpH = o(1.90 * v);
  const hcpA = o(1.90 / v);
  const spread = hBetter ? '-5.5' : '+5.5';

  // Totals
  const tot225Ov = o(1.90 * v);  const tot225Un = o(1.90 / v);
  const tot235Ov = o(1.88 * v);  const tot235Un = o(1.92 / v);

  // Quarter winners
  const q1H = o(hOdds * 0.88 * v);
  const q1A = o(aOdds * 0.88 / v);
  const q2H = o(hOdds * 0.90 * v);
  const q2A = o(aOdds * 0.90 / v);

  const mMW  = pm;
  const mHCP = market(`mkt_${mid}_hcp`, mid, 'mt_point_spread', `Point Spread (${spread})`, [
    sel(`mkt_${mid}_hcp_h`, `mkt_${mid}_hcp`, `${ht} ${spread}`, ht, hcpH),
    sel(`mkt_${mid}_hcp_a`, `mkt_${mid}_hcp`, `${at} ${spread === '-5.5' ? '+5.5' : '-5.5'}`, at, hcpA),
  ]);
  const mT225 = market(`mkt_${mid}_t225`, mid, 'mt_total_pts', 'Total Points Over/Under 225.5', [
    sel(`mkt_${mid}_t225_o`, `mkt_${mid}_t225`, 'Over 225.5', 'O 225.5', tot225Ov),
    sel(`mkt_${mid}_t225_u`, `mkt_${mid}_t225`, 'Under 225.5', 'U 225.5', tot225Un),
  ]);
  const mT235 = market(`mkt_${mid}_t235`, mid, 'mt_total_pts', 'Total Points Over/Under 235.5', [
    sel(`mkt_${mid}_t235_o`, `mkt_${mid}_t235`, 'Over 235.5', 'O 235.5', tot235Ov),
    sel(`mkt_${mid}_t235_u`, `mkt_${mid}_t235`, 'Under 235.5', 'U 235.5', tot235Un),
  ]);
  const mQ1 = market(`mkt_${mid}_q1`, mid, 'mt_quarter_winner', 'Q1 Winner', [
    sel(`mkt_${mid}_q1_h`, `mkt_${mid}_q1`, ht, ht, q1H),
    sel(`mkt_${mid}_q1_a`, `mkt_${mid}_q1`, at, at, q1A),
  ]);
  const mQ2 = market(`mkt_${mid}_q2`, mid, 'mt_quarter_winner', 'Q2 Winner', [
    sel(`mkt_${mid}_q2_h`, `mkt_${mid}_q2`, ht, ht, q2H),
    sel(`mkt_${mid}_q2_a`, `mkt_${mid}_q2`, at, at, q2A),
  ]);
  const mOT = market(`mkt_${mid}_ot`, mid, 'mt_overtime', 'Overtime?', [
    sel(`mkt_${mid}_ot_y`, `mkt_${mid}_ot`, 'Yes — Goes to OT', 'Yes', o(4.80 * v)),
    sel(`mkt_${mid}_ot_n`, `mkt_${mid}_ot`, 'No', 'No', o(1.20)),
  ]);

  return [
    { id: 'popular',  name: 'Popular',       icon: '⭐', category: 'popular',  markets: [mMW, mHCP, mT225], isDefaultOpen: true  },
    { id: 'totals',   name: 'Totals',        icon: '📊', category: 'goals',    markets: [mT225, mT235],      isDefaultOpen: true  },
    { id: 'quarters', name: 'Quarters',      icon: '🏀', category: 'quarters', markets: [mQ1, mQ2],          isDefaultOpen: false },
    { id: 'specials', name: 'Specials',      icon: '🎯', category: 'specials', markets: [mOT],               isDefaultOpen: false },
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

  // Handicap (map)
  const hcpH = o(1.90 * v);
  const hcpA = o(1.90 / v);

  const mMW  = pm;
  const mSB  = market(`mkt_${mid}_sb`, mid, 'mt_series_score', 'Series Correct Score', [
    sel(`mkt_${mid}_sb_20`, `mkt_${mid}_sb`, `${t1} 2-0`, '2-0', o((t1Fav ? 3.0 : 5.0) * v)),
    sel(`mkt_${mid}_sb_21`, `mkt_${mid}_sb`, `${t1} 2-1`, '2-1', o((t1Fav ? 4.5 : 7.0) * v)),
    sel(`mkt_${mid}_sb_12`, `mkt_${mid}_sb`, `${t2} 1-2`, '1-2', o((!t1Fav ? 4.5 : 7.0) * v)),
    sel(`mkt_${mid}_sb_02`, `mkt_${mid}_sb`, `${t2} 0-2`, '0-2', o((!t1Fav ? 3.0 : 5.0) * v)),
  ]);
  const mM1  = market(`mkt_${mid}_m1`, mid, 'mt_map_winner', 'Map 1 Winner', [
    sel(`mkt_${mid}_m1_1`, `mkt_${mid}_m1`, t1, t1, m1T1),
    sel(`mkt_${mid}_m1_2`, `mkt_${mid}_m1`, t2, t2, m1T2),
  ]);
  const mM2  = market(`mkt_${mid}_m2`, mid, 'mt_map_winner', 'Map 2 Winner', [
    sel(`mkt_${mid}_m2_1`, `mkt_${mid}_m2`, t1, t1, m2T1),
    sel(`mkt_${mid}_m2_2`, `mkt_${mid}_m2`, t2, t2, m2T2),
  ]);
  const mM3  = market(`mkt_${mid}_m3`, mid, 'mt_map_winner', 'Map 3 Winner (if played)', [
    sel(`mkt_${mid}_m3_1`, `mkt_${mid}_m3`, t1, t1, m3T1),
    sel(`mkt_${mid}_m3_2`, `mkt_${mid}_m3`, t2, t2, m3T2),
  ]);
  const mR1  = market(`mkt_${mid}_r1`, mid, 'mt_total_rounds', 'Map 1 Total Rounds O/U 26.5', [
    sel(`mkt_${mid}_r1_o`, `mkt_${mid}_r1`, 'Over 26.5', 'O 26.5', o(1.88 * v)),
    sel(`mkt_${mid}_r1_u`, `mkt_${mid}_r1`, 'Under 26.5', 'U 26.5', o(1.92 / v)),
  ]);
  const mHCP = market(`mkt_${mid}_hcp`, mid, 'mt_map_handicap', 'Map Handicap (-1.5)', [
    sel(`mkt_${mid}_hcp_h`, `mkt_${mid}_hcp`, `${t1} -1.5`, t1, hcpH),
    sel(`mkt_${mid}_hcp_a`, `mkt_${mid}_hcp`, `${t2} +1.5`, t2, hcpA),
  ]);

  return [
    { id: 'popular', name: 'Popular',     icon: '⭐', category: 'popular', markets: [mMW, mSB, mM1], isDefaultOpen: true  },
    { id: 'maps',    name: 'Map Winner',  icon: '🗺️', category: 'maps',    markets: [mM1, mM2, mM3], isDefaultOpen: true  },
    { id: 'rounds',  name: 'Rounds',      icon: '📊', category: 'goals',   markets: [mR1, mHCP],     isDefaultOpen: false },
  ];
}

// ── Horse racing markets ──────────────────────────────────────────────────────

function horseRacingMarkets(match: MatchEntity): MarketDetailGroup[] {
  const { id: mid, homeTeamName: runner, primaryMarket: pm } = match;
  const v = vs(mid);
  const winOdds = pm.selections[0]?.odds ?? 4.0;

  const ewOdds = o((winOdds * 0.22) * v); // E/W place portion
  const plOdds = o(winOdds * 0.28 * v);   // Place-only odds

  // Fake other runners for the race
  const fakeRunners = [
    { name: runner,         win: winOdds,                  place: plOdds },
    { name: 'Night Star',   win: o(3.50 * v),             place: o(1.60 * v) },
    { name: 'Thunder Bay',  win: o(5.00 * v),             place: o(1.90 * v) },
    { name: 'Silver Dawn',  win: o(7.50 * v),             place: o(2.50 * v) },
    { name: 'Royal Knight', win: o(10.0 * v),             place: o(3.20 * v) },
    { name: 'Desert Rose',  win: o(14.0 * v),             place: o(4.50 * v) },
  ];

  const winSels   = fakeRunners.map((r, i) => sel(`mkt_${mid}_win_${i}`,   `mkt_${mid}_win`,   r.name, r.name, r.win));
  const placeSels = fakeRunners.map((r, i) => sel(`mkt_${mid}_place_${i}`, `mkt_${mid}_place`, r.name, r.name, r.place));
  const ewSels    = fakeRunners.map((r, i) => sel(`mkt_${mid}_ew_${i}`,    `mkt_${mid}_ew`,    r.name, r.name, o(r.win * 0.5)));

  const mWin   = market(`mkt_${mid}_win`,   mid, 'mt_win_only',  'Win',        winSels);
  const mPlace = market(`mkt_${mid}_place`, mid, 'mt_place',     'Place (1/4 odds, 3 places)', placeSels);
  const mEW    = market(`mkt_${mid}_ew`,    mid, 'mt_each_way',  'Each Way',   ewSels);

  return [
    { id: 'runners', name: 'Runners',    icon: '🏇', category: 'runners', markets: [mWin, mPlace, mEW], isDefaultOpen: true },
  ];
}

// ── Generic fallback ──────────────────────────────────────────────────────────

function genericMarkets(match: MatchEntity): MarketDetailGroup[] {
  return [
    { id: 'popular', name: 'Popular', icon: '⭐', category: 'popular', markets: [match.primaryMarket], isDefaultOpen: true },
  ];
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateDetailMarkets(match: MatchEntity): MarketDetailGroup[] {
  const sport = match.sportId;
  if (sport === 'sp_soccer')       return soccerMarkets(match);
  if (sport === 'sp_tennis')       return tennisMarkets(match);
  if (sport === 'sp_nba' || sport === 'sp_basketball') return basketballMarkets(match);
  if (sport === 'sp_esports')      return esportsMarkets(match);
  if (sport === 'sp_horse_racing') return horseRacingMarkets(match);
  return genericMarkets(match);
}
