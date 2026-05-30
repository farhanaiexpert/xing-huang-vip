import { Router } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, betsTable, betSelectionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ── GET /stats/my ─────────────────────────────────────────────────────────────
// Query param: ?days=7|30|90|0  (0 = all time, default = 30)
//
// All performance metrics are filtered by settledAt so the selected period
// reflects bets that actually resolved in that window.
router.get("/stats/my", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const daysParam = parseInt(String(req.query.days ?? "30"), 10);
  const validDays = [7, 30, 90, 0].includes(daysParam) ? daysParam : 30;

  // Cutoff ISO string — null means no date filter (all time)
  const cutoff = validDays > 0
    ? new Date(Date.now() - validDays * 86_400_000).toISOString()
    : null;

  // SQL fragment applied to settled_at-based queries
  const settledPeriodCond = cutoff
    ? sql`${betsTable.settledAt} >= ${cutoff}::timestamptz`
    : undefined;

  // Helper SQL fragment for CTE / raw queries
  const periodAndSql = cutoff
    ? sql`AND b.settled_at >= ${cutoff}::timestamptz`
    : sql``;

  // ── 1. Summary aggregates (settled bets only in period) ───────────────────
  const [summary] = await db
    .select({
      totalBets:   sql<number>`count(*)::int`,
      wonBets:     sql<number>`count(*) filter (where status = 'won')::int`,
      lostBets:    sql<number>`count(*) filter (where status = 'lost')::int`,
      voidBets:    sql<number>`count(*) filter (where status = 'void')::int`,
      totalStaked: sql<string>`coalesce(sum(stake), 0)::text`,
      totalPayout: sql<string>`coalesce(sum(settled_payout), 0)::text`,
      bestWin:     sql<string>`coalesce(max(settled_payout::numeric - stake::numeric) filter (where status = 'won'), 0)::text`,
      avgOdds:     sql<number>`coalesce(avg(total_odds::numeric), 0)::float`,
      avgStake:    sql<number>`coalesce(avg(stake::numeric), 0)::float`,
    })
    .from(betsTable)
    .where(and(
      eq(betsTable.userId, userId),
      sql`${betsTable.status} in ('won','lost','void')`,
      settledPeriodCond,
    ));

  const staked  = parseFloat(summary.totalStaked);
  const payout  = parseFloat(summary.totalPayout);
  const settled = (summary.wonBets ?? 0) + (summary.lostBets ?? 0);
  const winRate = settled > 0 ? (summary.wonBets ?? 0) / settled : 0;
  const netPnl  = payout - staked;
  const roi     = staked > 0 ? (netPnl / staked) * 100 : 0;

  // ── 2. Daily P&L ──────────────────────────────────────────────────────────
  // For a specific range (7/30/90) build a dense day-by-day array.
  // For all time (days=0) fetch every settled day and build a dense range
  // from the user's first bet to today.
  const rawDailyRows = await db
    .select({
      date: sql<string>`date_trunc('day', settled_at at time zone 'utc')::date::text`,
      pnl:  sql<number>`sum(settled_payout::numeric - stake::numeric)::float`,
    })
    .from(betsTable)
    .where(and(
      eq(betsTable.userId, userId),
      sql`${betsTable.status} in ('won','lost')`,
      ...(validDays > 0
        ? [sql`${betsTable.settledAt} >= now() - interval '${sql.raw(String(validDays))} days'`]
        : []),
    ))
    .groupBy(sql`date_trunc('day', settled_at at time zone 'utc')::date`)
    .orderBy(sql`date_trunc('day', settled_at at time zone 'utc')::date`);

  const today  = new Date();
  const pnlMap = Object.fromEntries(rawDailyRows.map(r => [r.date, r.pnl]));

  // Determine dense range window
  let startDate: Date;
  if (validDays > 0) {
    startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - (validDays - 1));
  } else if (rawDailyRows.length > 0) {
    startDate = new Date(rawDailyRows[0].date + "T00:00:00Z");
  } else {
    startDate = new Date(today); // no data — empty chart
  }

  let cumulative = 0;
  const dailyPnl: { date: string; pnl: number; cumulative: number }[] = [];
  const cursor = new Date(startDate);
  while (cursor <= today) {
    const key    = cursor.toISOString().slice(0, 10);
    const dayPnl = pnlMap[key] ?? 0;
    cumulative  += dayPnl;
    dailyPnl.push({
      date:       key,
      pnl:        Math.round(dayPnl    * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // ── 3. Sport breakdown — CTE with DISTINCT ON to avoid multi-selection
  //      double-counting for accas that span multiple bet_selections rows.
  interface SportRow extends Record<string, unknown> {
    sport: string; bets: number; won_bets: number;
    lost_bets: number; staked: number; net_pnl: number;
  }
  const sportResult = await db.execute<SportRow>(sql`
    WITH deduped AS (
      SELECT DISTINCT ON (bs.bet_id, bs.sport)
        bs.sport,
        b.id                      AS bet_id,
        b.status,
        b.stake::numeric          AS stake_val,
        b.settled_payout::numeric AS payout_val
      FROM bet_selections bs
      JOIN bets b ON bs.bet_id = b.id
      WHERE b.user_id = ${userId}
        AND b.status IN ('won','lost','void')
        ${periodAndSql}
      ORDER BY bs.bet_id, bs.sport
    )
    SELECT
      sport,
      COUNT(DISTINCT bet_id)::int   AS bets,
      COUNT(DISTINCT bet_id) FILTER (WHERE status = 'won')::int  AS won_bets,
      COUNT(DISTINCT bet_id) FILTER (WHERE status = 'lost')::int AS lost_bets,
      COALESCE(SUM(stake_val), 0)::float  AS staked,
      COALESCE(SUM(payout_val - stake_val) FILTER (WHERE status IN ('won','lost')), 0)::float AS net_pnl
    FROM deduped
    GROUP BY sport
    ORDER BY bets DESC
    LIMIT 5
  `);
  const sportRows = sportResult.rows as SportRow[];

  // ── 4. Bet type breakdown ─────────────────────────────────────────────────
  const typeRows = await db
    .select({
      type:   betsTable.type,
      count:  sql<number>`count(*)::int`,
      staked: sql<string>`coalesce(sum(stake::numeric), 0)::text`,
    })
    .from(betsTable)
    .where(and(
      eq(betsTable.userId, userId),
      sql`${betsTable.status} in ('won','lost','void')`,
      settledPeriodCond,
    ))
    .groupBy(betsTable.type);

  // ── 5. Streaks + recent form ───────────────────────────────────────────────
  const [recentSettled, recentForm10] = await Promise.all([
    db.select({ status: betsTable.status })
      .from(betsTable)
      .where(and(
        eq(betsTable.userId, userId),
        sql`${betsTable.status} in ('won','lost')`,
        settledPeriodCond,
      ))
      .orderBy(desc(betsTable.settledAt))
      .limit(200),

    db.select({
        id:        betsTable.id,
        status:    betsTable.status,
        totalOdds: betsTable.totalOdds,
        settledAt: betsTable.settledAt,
      })
      .from(betsTable)
      .where(and(
        eq(betsTable.userId, userId),
        sql`${betsTable.status} in ('won','lost','void')`,
        settledPeriodCond,
      ))
      .orderBy(desc(betsTable.settledAt))
      .limit(10),
  ]);

  // Current win streak (most-recent-first)
  let currentWin = 0;
  for (const b of recentSettled) {
    if (b.status === "won") currentWin++;
    else break;
  }

  // Longest win/loss streaks (chronological)
  const chronological = [...recentSettled].reverse();
  let longestWin  = 0, longestLoss  = 0;
  let runningWin  = 0, runningLoss  = 0;
  for (const b of chronological) {
    if (b.status === "won") {
      runningWin++;
      longestWin  = Math.max(longestWin,  runningWin);
      runningLoss = 0;
    } else {
      runningLoss++;
      longestLoss = Math.max(longestLoss, runningLoss);
      runningWin  = 0;
    }
  }

  const recentForm = recentForm10.map(b => ({
    betId:  b.id,
    status: b.status as "won" | "lost" | "void",
    odds:   Math.round(parseFloat(b.totalOdds) * 100) / 100,
    date:   b.settledAt ? b.settledAt.toISOString().slice(0, 10) : null,
  }));

  // ── 6. Most-backed selection ──────────────────────────────────────────────
  const mbsRows = await db
    .select({
      selection:   betSelectionsTable.selection,
      count:       sql<number>`count(*)::int`,
      totalStaked: sql<string>`coalesce(sum(${betsTable.stake}::numeric), 0)::text`,
      totalPayout: sql<string>`coalesce(sum(${betsTable.settledPayout}::numeric) filter (where ${betsTable.status} in ('won','lost')), 0)::text`,
    })
    .from(betSelectionsTable)
    .innerJoin(betsTable, eq(betSelectionsTable.betId, betsTable.id))
    .where(and(
      eq(betsTable.userId, userId),
      sql`${betsTable.status} in ('won','lost','void')`,
      settledPeriodCond,
    ))
    .groupBy(betSelectionsTable.selection)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const mbs = mbsRows[0] ?? null;
  let mostBackedSelection: { selection: string; count: number; roi: number } | null = null;
  if (mbs && mbs.count > 0) {
    const mbsStaked = parseFloat(mbs.totalStaked);
    const mbsPayout = parseFloat(mbs.totalPayout);
    mostBackedSelection = {
      selection: mbs.selection,
      count:     mbs.count,
      roi:       mbsStaked > 0 ? Math.round(((mbsPayout - mbsStaked) / mbsStaked) * 10000) / 100 : 0,
    };
  }

  // ── Response ──────────────────────────────────────────────────────────────
  res.json({
    days:    validDays,
    summary: {
      totalBets:   summary.totalBets   ?? 0,
      wonBets:     summary.wonBets     ?? 0,
      lostBets:    summary.lostBets    ?? 0,
      voidBets:    summary.voidBets    ?? 0,
      winRate:     Math.round(winRate  * 1000) / 10,
      totalStaked: Math.round(staked   * 100)  / 100,
      totalPayout: Math.round(payout   * 100)  / 100,
      netPnl:      Math.round(netPnl   * 100)  / 100,
      bestWin:     Math.round(parseFloat(summary.bestWin) * 100) / 100,
      roi:         Math.round(roi      * 100)  / 100,
      avgOdds:     Math.round((summary.avgOdds  ?? 0) * 100) / 100,
      avgStake:    Math.round((summary.avgStake ?? 0) * 100) / 100,
    },
    dailyPnl,
    sportBreakdown: sportRows.map(r => ({
      sport:    r.sport || "Other",
      bets:     r.bets,
      wonBets:  r.won_bets  ?? 0,
      lostBets: r.lost_bets ?? 0,
      staked:   Math.round(r.staked  * 100) / 100,
      netPnl:   Math.round(r.net_pnl * 100) / 100,
    })),
    betTypeBreakdown: typeRows.map(r => ({
      type:   r.type,
      count:  r.count,
      staked: Math.round(parseFloat(r.staked) * 100) / 100,
    })),
    streaks: {
      current:     currentWin,
      longest:     longestWin,
      longestLoss: longestLoss,
    },
    recentForm,
    mostBackedSelection,
  });
});

export default router;
