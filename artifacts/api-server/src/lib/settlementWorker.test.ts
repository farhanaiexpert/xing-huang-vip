/**
 * Settlement worker — unit tests for pure outcome-mapping functions.
 * These functions have no DB or network dependencies and can be tested in isolation.
 */

import { describe, it, expect } from "vitest";
import {
  determineMatchOutcome,
  normalizeMarketType,
  mapSelectionOutcome,
  mapBttsOutcome,
  mapTotalsOutcome,
  mapSpreadsOutcome,
  expandSportKey,
  shouldSkipFutureEvent,
  shouldEscalateToManualReview,
} from "./settlementWorker.js";
import type { CompletedEvent } from "./apiFootball.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(
  homeScore: number,
  awayScore: number,
  homeTeam = "Arsenal",
  awayTeam = "Chelsea",
): CompletedEvent {
  return {
    id:        "test-event-1",
    sport_key: "soccer_epl",
    home_team:  homeTeam,
    away_team:  awayTeam,
    completed:  true,
    scores: [
      { name: homeTeam, score: String(homeScore) },
      { name: awayTeam, score: String(awayScore) },
    ],
  };
}

// ─── determineMatchOutcome ────────────────────────────────────────────────────

describe("determineMatchOutcome", () => {
  it("returns home when home wins", () => {
    expect(determineMatchOutcome(makeEvent(2, 0))).toBe("home");
  });
  it("returns away when away wins", () => {
    expect(determineMatchOutcome(makeEvent(0, 3))).toBe("away");
  });
  it("returns draw on equal scores", () => {
    expect(determineMatchOutcome(makeEvent(1, 1))).toBe("draw");
  });
  it("returns void when scores are missing", () => {
    const ev: CompletedEvent = { id: "x", sport_key: "soccer_epl", home_team: "A", away_team: "B", completed: true, scores: null };
    expect(determineMatchOutcome(ev)).toBe("void");
  });
  it("returns void when score entries don't match team names", () => {
    const ev: CompletedEvent = {
      id: "x", sport_key: "soccer_epl", home_team: "A", away_team: "B", completed: true,
      scores: [{ name: "X", score: "1" }, { name: "Y", score: "0" }],
    };
    expect(determineMatchOutcome(ev)).toBe("void");
  });
});

// ─── normalizeMarketType ──────────────────────────────────────────────────────

describe("normalizeMarketType", () => {
  it.each<[string, string]>([
    ["Match Result", "h2h"],
    ["match result", "h2h"],
    ["1X2", "h2h"],
    ["Moneyline", "h2h"],
    ["h2h", "h2h"],
    ["Over/Under 2.5", "totals"],
    ["over/under", "totals"],
    ["totals", "totals"],
    ["Total Goals", "totals"],
    ["Spreads", "spreads"],
    ["Handicap", "spreads"],
    ["Asian Handicap", "spreads"],
    ["BTTS", "btts"],
    ["Both Teams to Score", "btts"],
    ["GG/NG", "btts"],
  ])("normalizes %s → %s", (input: string, expected: string) => {
    expect(normalizeMarketType(input)).toBe(expected);
  });
});

// ─── mapSelectionOutcome ──────────────────────────────────────────────────────

describe("mapSelectionOutcome", () => {
  const HOME = "Arsenal";
  const AWAY = "Chelsea";

  it("home team wins — bet on home", () => {
    expect(mapSelectionOutcome("Arsenal", "home", HOME, AWAY)).toBe("won");
  });
  it("home team wins — bet on away", () => {
    expect(mapSelectionOutcome("Chelsea", "home", HOME, AWAY)).toBe("lost");
  });
  it("home team wins — bet on draw", () => {
    expect(mapSelectionOutcome("Draw", "home", HOME, AWAY)).toBe("lost");
  });
  it('home team wins — "1" shorthand', () => {
    expect(mapSelectionOutcome("1", "home", HOME, AWAY)).toBe("won");
  });
  it('away team wins — "2" shorthand', () => {
    expect(mapSelectionOutcome("2", "away", HOME, AWAY)).toBe("won");
  });
  it('draw — "X" shorthand', () => {
    expect(mapSelectionOutcome("x", "draw", HOME, AWAY)).toBe("won");
  });
  it('draw — loses non-draw bet', () => {
    expect(mapSelectionOutcome("Arsenal", "draw", HOME, AWAY)).toBe("lost");
  });
  it("uses stored team name as alias (different API name)", () => {
    // API calls team "Manchester City", stored name was "Man City"
    expect(mapSelectionOutcome("Man City", "home", "Manchester City", "Liverpool", "Man City", "Liverpool")).toBe("won");
  });
  it("fuzzy fallback — partial word match", () => {
    expect(mapSelectionOutcome("arsenal fc", "home", HOME, AWAY)).toBe("won");
  });
  it("void outcome propagates", () => {
    expect(mapSelectionOutcome("Arsenal", "void", HOME, AWAY)).toBe("void");
  });
});

// ─── mapBttsOutcome ───────────────────────────────────────────────────────────

describe("mapBttsOutcome", () => {
  it("yes wins when both scored", () => {
    expect(mapBttsOutcome("yes", 1, 1)).toBe("won");
  });
  it("yes loses when only home scored", () => {
    expect(mapBttsOutcome("yes", 2, 0)).toBe("lost");
  });
  it("no wins when only one scored", () => {
    expect(mapBttsOutcome("no", 1, 0)).toBe("won");
  });
  it("no loses when both scored", () => {
    expect(mapBttsOutcome("no", 2, 1)).toBe("lost");
  });
  it("void on unknown selection", () => {
    expect(mapBttsOutcome("maybe", 1, 1)).toBe("void");
  });
});

// ─── mapTotalsOutcome ─────────────────────────────────────────────────────────

describe("mapTotalsOutcome — parsing from label", () => {
  it("over 2.5 wins when total > 2.5", () => {
    expect(mapTotalsOutcome("Over 2.5", 2, 1)).toBe("won");
  });
  it("over 2.5 loses when total < 2.5", () => {
    expect(mapTotalsOutcome("Over 2.5", 1, 1)).toBe("lost");
  });
  it("under 2.5 wins when total < 2.5", () => {
    expect(mapTotalsOutcome("Under 2.5", 1, 1)).toBe("won");
  });
  it("under 2.5 loses when total > 2.5", () => {
    expect(mapTotalsOutcome("Under 2.5", 2, 1)).toBe("lost");
  });
  it("push (total equals line) returns void", () => {
    expect(mapTotalsOutcome("Over 3", 2, 1)).toBe("void");
  });
});

describe("mapTotalsOutcome — using stored point", () => {
  it("over wins with stored point", () => {
    expect(mapTotalsOutcome("Over 2.5", 2, 1, 2.5)).toBe("won");
  });
  it("under wins with stored point", () => {
    expect(mapTotalsOutcome("Under 2.5", 1, 0, 2.5)).toBe("won");
  });
  it("stored point overrides label parse", () => {
    // Label says 2.5 but stored point is 3.5; total = 3 → under 3.5 = won
    expect(mapTotalsOutcome("Under 2.5", 2, 1, 3.5)).toBe("won");
  });
  it("null stored point falls back to label parse", () => {
    expect(mapTotalsOutcome("Over 2.5", 2, 1, null)).toBe("won");
  });
});

// ─── mapSpreadsOutcome ────────────────────────────────────────────────────────

describe("mapSpreadsOutcome — parsing from label", () => {
  it("home -1.5 wins when home wins by 2+", () => {
    expect(mapSpreadsOutcome("Arsenal -1.5", "Arsenal", "Chelsea", 3, 0)).toBe("won");
  });
  it("home -1.5 loses when home wins by exactly 1", () => {
    expect(mapSpreadsOutcome("Arsenal -1.5", "Arsenal", "Chelsea", 2, 1)).toBe("lost");
  });
  it("away +1.5 wins when away loses by 1", () => {
    expect(mapSpreadsOutcome("Chelsea +1.5", "Arsenal", "Chelsea", 2, 1)).toBe("won");
  });
  it("away +1.5 loses when away loses by 2+", () => {
    expect(mapSpreadsOutcome("Chelsea +1.5", "Arsenal", "Chelsea", 3, 0)).toBe("lost");
  });
  it("returns void on unparseable selection", () => {
    expect(mapSpreadsOutcome("Unknown team", "Arsenal", "Chelsea", 2, 0)).toBe("void");
  });
});

describe("mapSpreadsOutcome — using stored point", () => {
  it("home team wins cover with stored negative spread", () => {
    // Stored point -1.5 for the home team; home score 3, away 0 → margin = 3 - 1.5 - 0 = 1.5 > 0
    expect(mapSpreadsOutcome("Arsenal -1.5", "Arsenal", "Chelsea", 3, 0, -1.5)).toBe("won");
  });
  it("away team covers with stored positive spread", () => {
    // Stored point +1.5 for away team; away 1, home 2 → margin = 1 + 1.5 - 2 = 0.5 > 0
    expect(mapSpreadsOutcome("Chelsea +1.5", "Arsenal", "Chelsea", 2, 1, 1.5)).toBe("won");
  });
});

// ─── expandSportKey ───────────────────────────────────────────────────────────

describe("expandSportKey", () => {
  it("exact Odds API key passes through as-is", () => {
    const result = expandSportKey("soccer_epl");
    expect(result).toEqual(["soccer_epl"]);
  });
  it("generic 'soccer' expands to a list including EPL and La Liga", () => {
    const result = expandSportKey("soccer");
    expect(result).toContain("soccer_epl");
    expect(result).toContain("soccer_spain_la_liga");
    expect(result).toContain("soccer_uefa_champs_league");
  });
  it("sp_soccer internal key expands similarly to generic soccer", () => {
    const result = expandSportKey("sp_soccer");
    expect(result).toContain("soccer_epl");
    expect(result).toContain("soccer_italy_serie_a");
  });
  it("betsapi_1 (soccer ID) expands to soccer leagues", () => {
    const result = expandSportKey("betsapi_1");
    expect(result).toContain("soccer_epl");
  });
  it("betsapi_16 (basketball) expands to NBA", () => {
    const result = expandSportKey("betsapi_16");
    expect(result).toContain("basketball_nba");
  });
  it("sp_ucl expands only to Champions League", () => {
    expect(expandSportKey("sp_ucl")).toEqual(["soccer_uefa_champs_league"]);
  });
  it("unknown non-underscore sport falls back to UNKNOWN_SPORT_FALLBACK (includes soccer_epl)", () => {
    const result = expandSportKey("unknownsport");
    expect(result).toContain("soccer_epl");
    expect(result.length).toBeGreaterThan(5);
  });
  it("unknown sp_ prefixed key falls back to UNKNOWN_SPORT_FALLBACK", () => {
    const result = expandSportKey("sp_unknown");
    expect(result).toContain("soccer_epl");
  });
  it("betsapi_91 maps to empty array (sport not covered)", () => {
    expect(expandSportKey("betsapi_91")).toEqual([]);
  });
});

// ─── shouldSkipFutureEvent ────────────────────────────────────────────────────

describe("shouldSkipFutureEvent", () => {
  const now = new Date("2025-06-10T12:00:00Z");

  it("returns false for a past match (match already started)", () => {
    const commence = new Date("2025-06-10T10:00:00Z"); // 2h before now
    expect(shouldSkipFutureEvent(commence, now)).toBe(false);
  });
  it("returns true for a future match (hasn't kicked off)", () => {
    const commence = new Date("2025-06-10T14:00:00Z"); // 2h in the future
    expect(shouldSkipFutureEvent(commence, now)).toBe(true);
  });
  it("returns false when commence equals now exactly (boundary — treat as started)", () => {
    expect(shouldSkipFutureEvent(now, now)).toBe(false);
  });
  it("returns false for null commenceTime (legacy row — never skip)", () => {
    expect(shouldSkipFutureEvent(null, now)).toBe(false);
  });
  it("returns false for match 1 second in the past", () => {
    const commence = new Date(now.getTime() - 1000);
    expect(shouldSkipFutureEvent(commence, now)).toBe(false);
  });
  it("returns true for match 1 second in the future", () => {
    const commence = new Date(now.getTime() + 1000);
    expect(shouldSkipFutureEvent(commence, now)).toBe(true);
  });
});

// ─── shouldEscalateToManualReview ─────────────────────────────────────────────

describe("shouldEscalateToManualReview", () => {
  const now = new Date("2025-06-12T12:00:00Z");

  it("returns false when only 10h have passed (below default 48h threshold)", () => {
    const commence = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    expect(shouldEscalateToManualReview(commence, now)).toBe(false);
  });
  it("returns false when exactly 47h 59m 59s have passed", () => {
    const commence = new Date(now.getTime() - (48 * 3600 - 1) * 1000);
    expect(shouldEscalateToManualReview(commence, now)).toBe(false);
  });
  it("returns true when exactly 48h have passed (default threshold)", () => {
    const commence = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    expect(shouldEscalateToManualReview(commence, now)).toBe(true);
  });
  it("returns true when 72h have passed", () => {
    const commence = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    expect(shouldEscalateToManualReview(commence, now)).toBe(true);
  });
  it("returns false for null commenceTime (legacy row — never auto-escalate)", () => {
    expect(shouldEscalateToManualReview(null, now)).toBe(false);
  });
  it("respects custom reviewHours override", () => {
    const commence = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6h ago
    expect(shouldEscalateToManualReview(commence, now, 4)).toBe(true);   // 6h > 4h → escalate
    expect(shouldEscalateToManualReview(commence, now, 12)).toBe(false); // 6h < 12h → not yet
  });
  it("future commence_time results in false (match hasn't happened yet)", () => {
    const commence = new Date(now.getTime() + 10 * 60 * 60 * 1000); // 10h in the future
    expect(shouldEscalateToManualReview(commence, now)).toBe(false);
  });
});
