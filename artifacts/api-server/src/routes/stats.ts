import { Router } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, betsTable, betSelectionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ── GET /stats/my ─────────────────────────────────────────────────────────────
// Query param: ?days=7|30|90|0  (0 = all time, default = 30)
//
// All performance metrics are filtered by settledAt so that the selected period
// reflects outcomes that actually resolved in that window, not just bets placed.
router.get("/stats/my", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const daysParam = parseInt(String(req.query.days ?? "30"), 10);
  const validDays = [7, 30, 90, 0].includes(daysParam) ? daysParam : 30;

  // Compute a cutoff date (null = no date filter = all time)
  const cutoff = validDays > 0
    ? new Date(Date.now() - validDays * 86_400_000).toISOString()
    : null;

  // For all settled performance queries: filter by settledAt so that numbers
  // reflect bets that resolved in the chosen window.
  const settledPeriodCond = cutoff
    ? sql`${betsTable.settledAt} >= ${cutoff}::timestamptz`
    : undefined;

  // Base condition: only settled bets (won/lost/void) for performance metrics
  const settledStatusCond = sql`${betsTable.status} in ('won','lost','void')`;

  // Combined condition helper
  const periodFilter = and(
    eq(betsTable.userId, userId),
    settledStatusCond,
    settledPeriodCond,
  );

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
    .where(periodFilter);

  const staked  = parseFloat(summary.totalStaked);
  const payout  = parseFloat(summary.totalPayout);
  const settled = (summary.wonBets ?? 0) + (summary.lostBets ?? 0);
  const winRate = settled > 0 ? (summary.wonBets ?? 0) / settled : 0;
  const netPnl  = payout - staked;
  const roi     = staked > 0 ? (netPnl / staked) * 100 : 0;

  // ── 2. Daily P&L (dense range based on selected period) ───────────────────
  const chartDays = validDays > 0 ? validDays : 90;
  const chartCond = sql`${betsTable.settledAt} >= now() - interval '${sql.raw(String(chartDays))} days'`;

  const dailyRows = await db
    .select({
      date: sql<string>`date_trunc('day', settled_at at time zone 'utc')::date::text`,
      pnl:  sql<number>`sum(settled_payout::numeric - stake::numeric)::float`,
    })
    .from(betsTable)
    .where(and(
      eq(betsTable.userId, userId),
      sql`status in ('won','lost')`,
      chartCond,
    ))
    .groupBy(sql`date_trunc('day', settled_at at time zone 'utc')::date`)
    .orderBy(sql`date_trunc('day', settled_at at time zone 'utc')::date`);

  const today  = new Date();
  const pnlMap = Object.fromEntries(dailyRows.map(r => [r.date, r.pnl]));
  let cumulative = 0;
  const dailyPnl: { date: string; pnl: number; cumulative: number }[] = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key    = d.toISOString().slice(0, 10);
    const dayPnl = pnlMap[key] ?? 0;
    cumulative  += dayPnl;
    dailyPnl.push({
      date:       key,
      pnl:        Math.round(dayPnl    * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    });
  }

  // ── 3. Sport breakdown (settled bets, per-sport win/loss) ─────────────────
  const sportRows = await db
    .select({
      sport:     betSelectionsTable.sport,
      bets:      sql<number>`count(distinct ${betsTable.id})::int`,
      wonBets:   sql<number>`count(distinct ${betsTable.id}) filter (where ${betsTable.status} = 'won')::int`,
      lostBets:  sql<number>`count(distinct ${betsTable.id}) filter (where ${betsTable.status} = 'lost')::int`,
      staked:    sql<string>`coalesce(sum(distinct ${betsTable.stake}::numeric), 0)::text`,
      netPnl:    sql<number>`coalesce(sum(${betsTable.settledPayout}::numeric - ${betsTable.stake}::numeric) filter (where ${betsTable.status} in ('won','lost')), 0)::float`,
    })
    .from(betSelectionsTable)
    .innerJoin(betsTable, eq(betSelectionsTable.betId, betsTable.id))
    .where(periodFilter)
    .groupBy(betSelectionsTable.sport)
    .orderBy(desc(sql`count(distinct ${betsTable.id})`));

  // ── 4. Bet type breakdown (settled bets) ──────────────────────────────────
  const typeRows = await db
    .select({
      type:   betsTable.type,
      count:  sql<number>`count(*)::int`,
      staked: sql<string>`coalesce(sum(stake::numeric), 0)::text`,
    })
    .from(betsTable)
    .where(periodFilter)
    .groupBy(betsTable.type);

  // ── 5. Streaks + recent form ───────────────────────────────────────────────
  const [recentSettled, recentForm10] = await Promise.all([
    db.select({ status: betsTable.status })
      .from(betsTable)
      .where(and(
        eq(betsTable.userId, userId),
        sql`status in ('won', 'lost')`,
        settledPeriodCond,
      ))
      .orderBy(desc(betsTable.settledAt))
      .limit(200),

    // Include betId + eventName so frontend can navigate to bet detail
    db.select({
        id:         betsTable.id,
        status:     betsTable.status,
        totalOdds:  betsTable.totalOdds,
        settledAt:  betsTable.settledAt,
      })
      .from(betsTable)
      .where(and(
        eq(betsTable.userId, userId),
        sql`status in ('won', 'lost', 'void')`,
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

  // ── 6. Most-backed selection (settled bets) ───────────────────────────────
  const mbsRows = await db
    .select({
      selection:   betSelectionsTable.selection,
      count:       sql<number>`count(*)::int`,
      totalStaked: sql<string>`coalesce(sum(${betsTable.stake}::numeric), 0)::text`,
      totalPayout: sql<string>`coalesce(sum(${betsTable.settledPayout}::numeric) filter (where ${betsTable.status} in ('won','lost')), 0)::text`,
    })
    .from(betSelectionsTable)
    .innerJoin(betsTable, eq(betSelectionsTable.betId, betsTable.id))
    .where(periodFilter)
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
      wonBets:  r.wonBets  ?? 0,
      lostBets: r.lostBets ?? 0,
      staked:   Math.round(parseFloat(r.staked) * 100) / 100,
      netPnl:   Math.round(r.netPnl * 100) / 100,
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
