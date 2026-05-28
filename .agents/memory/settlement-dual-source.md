---
name: Settlement dual-source
description: How the auto-settlement worker resolves bets — source priority, auto-void, cron cadence.
---

# Settlement Worker Architecture

## Rule
Three-pass resolution per sport per cron tick:
1. **The Odds API** (`/v4/sports/{sport}/scores?daysFrom=3`) — primary, all sports
2. **API-Football** (`/fixtures?date=…&status=FT`) — fallback, soccer only (20+ leagues mapped in `apiFootball.ts`)
3. **Auto-void** — open selections whose earliest bet is > 12 h old with no result from either source → stake refunded

**Why:** Odds API can be slow to mark events as completed; API-Football fills the gap for soccer. Auto-void prevents funds being locked indefinitely if both sources fail.

**How to apply:**
- Cron runs `*/1 * * * *` with `isRunning` mutex to prevent overlapping ticks.
- API-Football results are cached 30 min per date to stay within 100 req/day free tier.
- `isApiFootballSport(sportKey)` gates the fallback so non-soccer sports don't waste quota.
- `settlement_log.source` stores `"odds-api"` | `"api-football"` | `"auto-void"` for admin audit.
- `AUTO_VOID_HOURS = 12` constant in `settlementWorker.ts` — safe threshold (match + buffer).
- Team name matching uses `teamsMatch()` in `apiFootball.ts`: normalises club suffixes (FC, AC, etc.), then checks equality → substring → shared long word.
- Event IDs are always Odds API IDs (primary key); API-Football fixture IDs are internal only.
