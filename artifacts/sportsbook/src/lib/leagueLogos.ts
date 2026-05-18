/**
 * League / tournament logo lookup.
 * Returns a public image URL for a given league name, or null if not found.
 *
 * All images are loaded lazily with onError fallback in the consuming component —
 * a broken/missing URL simply falls back to the flag emoji silently.
 *
 * Source: Wikimedia Commons direct SVG file URLs (stable, public, no CORS).
 */

// Direct Wikimedia SVG — format: /wikipedia/{ns}/{h1+h2}/{file}
const WC = (ns: string, h: string, file: string) =>
  `https://upload.wikimedia.org/wikipedia/${ns}/${h}/${file}`;

interface LeagueLogoEntry { keywords: string[]; url: string }

const ENTRIES: LeagueLogoEntry[] = [
  // ── Tennis ─────────────────────────────────────────────────────────────
  {
    keywords: ['french open', 'roland garros', 'roland-garros'],
    url: WC('en', '2/20', 'Roland-Garros-logo.svg'),
  },
  {
    keywords: ['wimbledon', 'the championships'],
    url: WC('en', '4/43', 'Wimbledon_Championships_Logo.svg'),
  },
  {
    keywords: ['us open tennis', 'us open (tennis)', 'us open – men', 'us open – women'],
    url: WC('en', '9/9b', 'US_Open_Tennis_BW.svg'),
  },
  {
    keywords: ['australian open'],
    url: WC('en', 'd/d3', 'Australian_Open_logo.svg'),
  },

  // ── Cricket ────────────────────────────────────────────────────────────
  {
    keywords: ['indian premier league', 'ipl'],
    url: WC('en', '8/8a', 'Indian_Premier_League_Official_Logo.svg'),
  },
  {
    keywords: ['big bash', 'bbl'],
    url: WC('en', '8/87', 'Big_Bash_League_Logo.svg'),
  },

  // ── MMA / Combat Sports ───────────────────────────────────────────────
  {
    keywords: ['ufc', 'ultimate fighting'],
    url: WC('commons', '9/92', 'UFC_Logo.svg'),
  },
  {
    keywords: ['bellator'],
    url: WC('commons', '9/99', 'Bellator_MMA_logo.svg'),
  },
  {
    keywords: ['one championship', 'one fc'],
    url: WC('commons', '6/6a', 'ONE_Championship_Logo.svg'),
  },

  // ── Motor Racing ─────────────────────────────────────────────────────
  {
    keywords: ['formula 1', 'formula one', 'formula_1'],
    url: WC('commons', 'b/b2', 'Formula_One_Logo.svg'),
  },
  {
    keywords: ['motogp'],
    url: WC('commons', 'b/b1', 'MotoGP_logo.svg'),
  },

  // ── Soccer cups / international ──────────────────────────────────────
  {
    keywords: ['champions league', 'ucl'],
    url: WC('en', 'b/bf', 'UEFA_Champions_League_logo_2.svg'),
  },
  {
    keywords: ['world cup', 'fifa world cup'],
    url: WC('en', 'c/c7', 'FIFA_World_Cup_Logo.svg'),
  },
  {
    keywords: ['copa america'],
    url: WC('en', 'd/df', 'Copa_Am%C3%A9rica_official_logo.svg'),
  },
];

export function getLeagueLogo(leagueName: string): string | null {
  if (!leagueName) return null;
  // Pad so isolated keywords don't match mid-word
  const padded = ` ${leagueName.toLowerCase()} `;
  for (const entry of ENTRIES) {
    if (entry.keywords.some(kw => padded.includes(kw))) return entry.url;
  }
  return null;
}
