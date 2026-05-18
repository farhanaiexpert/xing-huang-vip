export type OddsFormat = 'decimal' | 'fractional' | 'american';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function formatOdds(decimal: number, format: OddsFormat): string {
  if (!decimal || decimal <= 1) {
    if (format === 'american') return '-∞';
    if (format === 'fractional') return '0/1';
    return decimal.toFixed(2);
  }

  switch (format) {
    case 'decimal':
      return decimal.toFixed(2);

    case 'fractional': {
      const num = Math.round((decimal - 1) * 100);
      const den = 100;
      const g   = gcd(num, den);
      return `${num / g}/${den / g}`;
    }

    case 'american': {
      if (decimal >= 2) {
        return `+${Math.round((decimal - 1) * 100)}`;
      } else {
        return `${Math.round(-100 / (decimal - 1))}`;
      }
    }
  }
}

export const FORMAT_LABELS: Record<OddsFormat, string> = {
  decimal:    'Dec',
  fractional: 'Frac',
  american:   'US',
};
