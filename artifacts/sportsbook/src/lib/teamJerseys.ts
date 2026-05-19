/**
 * Team jersey silk URL mapping — bet365 SoccerSilks CDN
 * Confirmed URLs provided directly; guesses use the most common naming pattern.
 * The JerseySilk component uses onError to silently hide any that 404.
 */

const B = 'https://content001.bet365.com/SoccerSilks/';

export const TEAM_JERSEYS: Record<string, string> = {
  // ── Confirmed by user ─────────────────────────────────────────────────────
  'Bournemouth':           `${B}Bournemouth_Home_Front_25_26.svg`,
  'AFC Bournemouth':       `${B}Bournemouth_Home_Front_25_26.svg`,
  'Man City':              `${B}Man%20City%20Home%2025_26%20Front.svg`,
  'Manchester City':       `${B}Man%20City%20Home%2025_26%20Front.svg`,
  'Chelsea':               `${B}Chelsea_Home_Front_2526.svg`,
  'Chelsea FC':            `${B}Chelsea_Home_Front_2526.svg`,
  'Tottenham':             `${B}Tottenham_Front_Home_2526.svg`,
  'Tottenham Hotspur':     `${B}Tottenham_Front_Home_2526.svg`,
  'Spurs':                 `${B}Tottenham_Front_Home_2526.svg`,

  // ── Premier League ────────────────────────────────────────────────────────
  'Arsenal':               `${B}Arsenal_Home_Front_2526.svg`,
  'Liverpool':             `${B}Liverpool_Home_Front_2526.svg`,
  'Liverpool FC':          `${B}Liverpool_Home_Front_2526.svg`,
  'Manchester United':     `${B}Man%20Utd_Home_Front_2526.svg`,
  'Manchester Utd':        `${B}Man%20Utd_Home_Front_2526.svg`,
  'Man United':            `${B}Man%20Utd_Home_Front_2526.svg`,
  'Man Utd':               `${B}Man%20Utd_Home_Front_2526.svg`,
  'Aston Villa':           `${B}Aston%20Villa_Home_Front_2526.svg`,
  'Newcastle':             `${B}Newcastle_Home_Front_2526.svg`,
  'Newcastle United':      `${B}Newcastle_Home_Front_2526.svg`,
  'West Ham':              `${B}West%20Ham_Home_Front_2526.svg`,
  'West Ham United':       `${B}West%20Ham_Home_Front_2526.svg`,
  'Brighton':              `${B}Brighton_Home_Front_2526.svg`,
  'Brighton & Hove Albion':`${B}Brighton_Home_Front_2526.svg`,
  'Everton':               `${B}Everton_Home_Front_2526.svg`,
  'Everton FC':            `${B}Everton_Home_Front_2526.svg`,
  'Wolves':                `${B}Wolves_Home_Front_2526.svg`,
  'Wolverhampton Wanderers':`${B}Wolves_Home_Front_2526.svg`,
  'Crystal Palace':        `${B}Crystal%20Palace_Home_Front_2526.svg`,
  'Nottingham Forest':     `${B}Nottm%20Forest_Home_Front_2526.svg`,
  'Fulham':                `${B}Fulham_Home_Front_2526.svg`,
  'Fulham FC':             `${B}Fulham_Home_Front_2526.svg`,
  'Brentford':             `${B}Brentford_Home_Front_2526.svg`,
  'Brentford FC':          `${B}Brentford_Home_Front_2526.svg`,
  'Leicester':             `${B}Leicester_Home_Front_2526.svg`,
  'Leicester City':        `${B}Leicester_Home_Front_2526.svg`,
  'Ipswich':               `${B}Ipswich_Home_Front_2526.svg`,
  'Ipswich Town':          `${B}Ipswich_Home_Front_2526.svg`,
  'Southampton':           `${B}Southampton_Home_Front_2526.svg`,

  // ── La Liga ───────────────────────────────────────────────────────────────
  'Barcelona':             `${B}Barcelona_Home_Front_2526.svg`,
  'FC Barcelona':          `${B}Barcelona_Home_Front_2526.svg`,
  'Real Madrid':           `${B}Real%20Madrid_Home_Front_2526.svg`,
  'Atletico Madrid':       `${B}Atletico%20Madrid_Home_Front_2526.svg`,
  'Atletico':              `${B}Atletico%20Madrid_Home_Front_2526.svg`,
  'Sevilla':               `${B}Sevilla_Home_Front_2526.svg`,
  'Real Sociedad':         `${B}Real%20Sociedad_Home_Front_2526.svg`,
  'Villarreal':            `${B}Villarreal_Home_Front_2526.svg`,
  'Athletic Bilbao':       `${B}Athletic%20Bilbao_Home_Front_2526.svg`,
  'Valencia':              `${B}Valencia_Home_Front_2526.svg`,

  // ── Serie A ───────────────────────────────────────────────────────────────
  'Juventus':              `${B}Juventus_Home_Front_2526.svg`,
  'Inter':                 `${B}Inter%20Milan_Home_Front_2526.svg`,
  'Inter Milan':           `${B}Inter%20Milan_Home_Front_2526.svg`,
  'AC Milan':              `${B}AC%20Milan_Home_Front_2526.svg`,
  'Napoli':                `${B}Napoli_Home_Front_2526.svg`,
  'Roma':                  `${B}Roma_Home_Front_2526.svg`,
  'Lazio':                 `${B}Lazio_Home_Front_2526.svg`,
  'Atalanta':              `${B}Atalanta_Home_Front_2526.svg`,
  'Fiorentina':            `${B}Fiorentina_Home_Front_2526.svg`,
  'Bologna':               `${B}Bologna_Home_Front_2526.svg`,

  // ── Bundesliga ────────────────────────────────────────────────────────────
  'Bayern Munich':         `${B}Bayern%20Munich_Home_Front_2526.svg`,
  'Bayern':                `${B}Bayern%20Munich_Home_Front_2526.svg`,
  'Borussia Dortmund':     `${B}Borussia%20Dortmund_Home_Front_2526.svg`,
  'Dortmund':              `${B}Borussia%20Dortmund_Home_Front_2526.svg`,
  'RB Leipzig':            `${B}RB%20Leipzig_Home_Front_2526.svg`,
  'Leipzig':               `${B}RB%20Leipzig_Home_Front_2526.svg`,
  'Bayer Leverkusen':      `${B}Bayer%20Leverkusen_Home_Front_2526.svg`,
  'Leverkusen':            `${B}Bayer%20Leverkusen_Home_Front_2526.svg`,
  'Eintracht Frankfurt':   `${B}Eintracht%20Frankfurt_Home_Front_2526.svg`,
  'Borussia Monchengladbach': `${B}Borussia%20Monchengladbach_Home_Front_2526.svg`,

  // ── Ligue 1 ───────────────────────────────────────────────────────────────
  'PSG':                   `${B}PSG_Home_Front_2526.svg`,
  'Paris Saint-Germain':   `${B}PSG_Home_Front_2526.svg`,
  'Marseille':             `${B}Marseille_Home_Front_2526.svg`,
  'Lyon':                  `${B}Lyon_Home_Front_2526.svg`,
  'Monaco':                `${B}Monaco_Home_Front_2526.svg`,
  'Nice':                  `${B}Nice_Home_Front_2526.svg`,
};

/** Returns the jersey silk URL for a given team name, or undefined if not mapped. */
export function getJerseyUrl(team: string): string | undefined {
  return TEAM_JERSEYS[team] ?? TEAM_JERSEYS[team.trim()];
}
