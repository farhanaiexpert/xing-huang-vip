/**
 * Country flag lookup for national / youth team names.
 *
 * Many BetsAPI fixtures are international or youth matches — e.g. "Japan Youth",
 * "Thailand U19", "Korea Republic", "Brazil U23 (W)". These teams have no club
 * crest in teamLogos.ts, so they would otherwise fall back to a plain initials
 * circle. This helper detects the underlying country and returns a flag image so
 * each team gets a recognisable picture.
 *
 * Matching is intentionally strict: the name is normalised (qualifiers like
 * "Youth", "U19", "Women", "B", "National Team" are stripped) and then matched
 * EXACTLY against a country alias. This avoids accidentally flagging a club whose
 * name merely contains a country word.
 *
 * Flags are served from flagcdn.com (free, no key). UK home nations use the
 * gb-eng / gb-sct / gb-wls / gb-nir subdivision codes.
 */

const flag = (code: string) => `https://flagcdn.com/w160/${code}.png`;

// Lowercased country alias → ISO 3166-1 alpha-2 (or flagcdn subdivision) code.
const COUNTRY_CODES: Record<string, string> = {
  // Europe
  'england': 'gb-eng', 'scotland': 'gb-sct', 'wales': 'gb-wls', 'northern ireland': 'gb-nir',
  'united kingdom': 'gb', 'great britain': 'gb',
  'spain': 'es', 'espana': 'es', 'portugal': 'pt', 'france': 'fr', 'germany': 'de',
  'italy': 'it', 'italia': 'it', 'netherlands': 'nl', 'holland': 'nl', 'belgium': 'be',
  'switzerland': 'ch', 'austria': 'at', 'poland': 'pl', 'ukraine': 'ua', 'russia': 'ru',
  'sweden': 'se', 'norway': 'no', 'denmark': 'dk', 'finland': 'fi', 'iceland': 'is',
  'ireland': 'ie', 'republic of ireland': 'ie', 'czechia': 'cz', 'czech republic': 'cz',
  'slovakia': 'sk', 'hungary': 'hu', 'romania': 'ro', 'bulgaria': 'bg', 'greece': 'gr',
  'croatia': 'hr', 'serbia': 'rs', 'slovenia': 'si', 'bosnia and herzegovina': 'ba',
  'bosnia': 'ba', 'north macedonia': 'mk', 'macedonia': 'mk', 'montenegro': 'me',
  'albania': 'al', 'kosovo': 'xk', 'turkey': 'tr', 'turkiye': 'tr', 'cyprus': 'cy',
  'georgia': 'ge', 'armenia': 'am', 'azerbaijan': 'az', 'belarus': 'by', 'lithuania': 'lt',
  'latvia': 'lv', 'estonia': 'ee', 'luxembourg': 'lu', 'malta': 'mt', 'moldova': 'md',
  'andorra': 'ad', 'san marino': 'sm', 'liechtenstein': 'li', 'faroe islands': 'fo',
  'gibraltar': 'gi', 'kazakhstan': 'kz',

  // Americas
  'usa': 'us', 'united states': 'us', 'united states of america': 'us',
  'canada': 'ca', 'mexico': 'mx', 'brazil': 'br', 'brasil': 'br', 'argentina': 'ar',
  'uruguay': 'uy', 'paraguay': 'py', 'chile': 'cl', 'colombia': 'co', 'peru': 'pe',
  'ecuador': 'ec', 'venezuela': 've', 'bolivia': 'bo', 'costa rica': 'cr', 'panama': 'pa',
  'honduras': 'hn', 'guatemala': 'gt', 'el salvador': 'sv', 'nicaragua': 'ni',
  'jamaica': 'jm', 'trinidad and tobago': 'tt', 'haiti': 'ht', 'cuba': 'cu',
  'dominican republic': 'do', 'curacao': 'cw',

  // Asia
  'japan': 'jp', 'south korea': 'kr', 'korea republic': 'kr', 'korea': 'kr',
  'north korea': 'kp', 'korea dpr': 'kp', 'china': 'cn', 'china pr': 'cn',
  'chinese taipei': 'tw', 'taiwan': 'tw', 'hong kong': 'hk', 'macau': 'mo',
  'india': 'in', 'thailand': 'th', 'vietnam': 'vn', 'indonesia': 'id', 'malaysia': 'my',
  'singapore': 'sg', 'philippines': 'ph', 'myanmar': 'mm', 'cambodia': 'kh', 'laos': 'la',
  'iran': 'ir', 'ir iran': 'ir', 'iraq': 'iq', 'saudi arabia': 'sa', 'qatar': 'qa',
  'united arab emirates': 'ae', 'uae': 'ae', 'kuwait': 'kw', 'bahrain': 'bh', 'oman': 'om',
  'jordan': 'jo', 'lebanon': 'lb', 'syria': 'sy', 'palestine': 'ps', 'yemen': 'ye',
  'israel': 'il', 'uzbekistan': 'uz', 'turkmenistan': 'tm', 'tajikistan': 'tj',
  'kyrgyzstan': 'kg', 'afghanistan': 'af', 'pakistan': 'pk', 'bangladesh': 'bd',
  'sri lanka': 'lk', 'nepal': 'np', 'maldives': 'mv', 'bhutan': 'bt', 'mongolia': 'mn',

  // Oceania
  'australia': 'au', 'new zealand': 'nz', 'fiji': 'fj', 'papua new guinea': 'pg',
  'new caledonia': 'nc', 'tahiti': 'pf',

  // Africa
  'egypt': 'eg', 'morocco': 'ma', 'algeria': 'dz', 'tunisia': 'tn', 'libya': 'ly',
  'nigeria': 'ng', 'ghana': 'gh', 'senegal': 'sn', 'cameroon': 'cm', 'ivory coast': 'ci',
  "cote d'ivoire": 'ci', 'south africa': 'za', 'kenya': 'ke', 'ethiopia': 'et',
  'mali': 'ml', 'burkina faso': 'bf', 'guinea': 'gn', 'dr congo': 'cd', 'congo dr': 'cd',
  'congo': 'cg', 'angola': 'ao', 'zambia': 'zm', 'zimbabwe': 'zw', 'uganda': 'ug',
  'tanzania': 'tz', 'gabon': 'ga', 'togo': 'tg', 'benin': 'bj', 'mozambique': 'mz',
  'cape verde': 'cv', 'mauritania': 'mr', 'madagascar': 'mg', 'sudan': 'sd',
  'namibia': 'na', 'botswana': 'bw', 'rwanda': 'rw', 'sierra leone': 'sl', 'liberia': 'lr',
  'gambia': 'gm', 'niger': 'ne', 'chad': 'td', 'malawi': 'mw', 'equatorial guinea': 'gq',
  'guinea-bissau': 'gw', 'comoros': 'km', 'burundi': 'bi', 'eswatini': 'sz',
};

/** Strip youth/women/reserve qualifiers and normalise to a bare country phrase. */
function normalizeCountry(raw: string): string {
  let s = raw.toLowerCase();
  // Remove parenthetical qualifiers e.g. "(w)", "(u20)"
  s = s.replace(/\([^)]*\)/g, ' ');
  // Remove age-group markers: U19, U-19, U/19, etc.
  s = s.replace(/\bu[-/]?\d{1,2}\b/g, ' ');
  // Remove common qualifiers (whole words only).
  s = s.replace(/\b(youth|junior|jnr|jr|olympic|amateur|reserves?|academy|national team|national|nt|women|woman|ladies|girls|boys|men|fem(?:enino|inine)?|w|b|ii|iii)\b/g, ' ');
  // Collapse whitespace.
  return s.replace(/[^a-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Return a flag image URL for a national/youth team name, or null if the name
 * does not resolve to a known country.
 */
export function getTeamFlag(name: string): string | null {
  if (!name) return null;
  const key = normalizeCountry(name);
  if (!key) return null;
  const code = COUNTRY_CODES[key];
  return code ? flag(code) : null;
}
