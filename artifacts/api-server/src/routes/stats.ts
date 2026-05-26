import { Router } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, betsTable, betSelectionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ── GET /stats/my ─────────────────────────────────────────────────────────────
router.get("/stats/my", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  // ── 1. Summary aggregates ─────────────────────────────────────────────────
  const [summary] = await db
    .select({
      totalBets:    sql<number>`count(*)::int`,
      wonBets:      sql<number>`count(*) filter (where status = 'won')::int`,
      lostBets:     sql<number>`count(*) filter (where status = 'lost')::int`,
      voidBets:     sql<number>`count(*) filter (where status = 'void')::int`,
      totalStaked:  sql<string>`coalesce(sum(stake), 0)::text`,
      totalPayout:  sql<string>`coalesce(sum(settled_payout), 0)::text`,
      bestWin:      sql<string>`coalesce(max(settled_payout::numeric - stake::numeric) filter (where status = 'won'), 0)::text`,
    })
    .from(betsTable)
    .where(and(eq(betsTable.userId, userId)));

  const staked = parseFloat(summary.totalStaked);
  const payout = parseFloat(summary.totalPayout);
  const settled = (summary.wonBets ?? 0) + (summary.lostBets ?? 0);
  const winRate = settled > 0 ? (summary.wonBets ?? 0) / settled : 0;

  // ── 2. Last 30 days daily P&L ─────────────────────────────────────────────
  const dailyRows = await db
    .select({
      date: sql<string>`date_trunc('day', settled_at at time zone 'utc')::date::text`,
      pnl:  sql<number>`sum(settled_payout::numeric - stake::numeric)::float`,
    })
    .from(betsTable)
    .where(and(
      eq(betsTable.userId, userId),
      sql`status in ('won','lost')`,
      sql`settled_at >= now() - interval '30 days'`,
    ))
    .groupBy(sql`date_trunc('day', settled_at at time zone 'utc')::date`)
    .orderBy(sql`date_trunc('day', settled_at at time zone 'utc')::date`);

  // Build a dense 30-day range with cumulative
  const today = new Date();
  const days: { date: string; pnl: number; cumulative: number }[] = [];
  const pnlMap = Object.fromEntries(dailyRows.map(r => [r.date, r.pnl]));
  let cumulative = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayPnl = pnlMap[key] ?? 0;
    cumulative += dayPnl;
    days.push({ date: key, pnl: Math.round(dayPnl * 100) / 100, cumulative: Math.round(cumulative * 100) / 100 });
  }

  // ── 3. Sport breakdown ────────────────────────────────────────────────────
  const sportRows = await db
    .select({
      sport:   betSelectionsTable.sport,
      bets:    sql<number>`count(distinct ${betsTable.id})::int`,
      staked:  sql<string>`coalesce(sum(distinct ${betsTable.stake}::numeric), 0)::text`,
      netPnl:  sql<number>`coalesce(sum(${betsTable.settledPayout}::numeric - ${betsTable.stake}::numeric) filter (where ${betsTable.status} in ('won','lost')), 0)::float`,
    })
    .from(betSelectionsTable)
    .innerJoin(betsTable, eq(betSelectionsTable.betId, betsTable.id))
    .where(eq(betsTable.userId, userId))
    .groupBy(betSelectionsTable.sport)
    .orderBy(desc(sql`count(distinct ${betsTable.id})`));

  // ── 4. Bet type breakdown ─────────────────────────────────────────────────
  const typeRows = await db
    .select({
      type:   betsTable.type,
      count:  sql<number>`count(*)::int`,
      staked: sql<string>`coalesce(sum(stake::numeric), 0)::text`,
    })
    .from(betsTable)
    .where(eq(betsTable.userId, userId))
    .groupBy(betsTable.type);

  // ── 5. Winning streaks ────────────────────────────────────────────────────
  const recentBets = await db
    .select({ status: betsTable.status, settledAt: betsTable.settledAt })
    .from(betsTable)
    .where(and(
      eq(betsTable.userId, userId),
      sql`status in ('won', 'lost')`,
    ))
    .orderBy(desc(betsTable.settledAt))
    .limit(200);

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (let idx = 0; idx < recentBets.length; idx++) {
    const b = recentBets[idx];
    if (b.status === "won") {
      if (idx === 0 || recentBets[idx - 1]?.status === "won") currentStreak++;
      runningStreak++;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      if (idx === 0) currentStreak = 0;
      runningStreak = 0;
    }
  }

  // current streak: how many consecutive wins from the most recent settled bet
  let current = 0;
  for (const b of recentBets) {
    if (b.status === "won") current++;
    else break;
  }

  res.json({
    summary: {
      totalBets:   summary.totalBets ?? 0,
      wonBets:     summary.wonBets   ?? 0,
      lostBets:    summary.lostBets  ?? 0,
      voidBets:    summary.voidBets  ?? 0,
      winRate:     Math.round(winRate * 1000) / 10,
      totalStaked: Math.round(staked * 100) / 100,
      totalPayout: Math.round(payout * 100) / 100,
      netPnl:      Math.round((payout - staked) * 100) / 100,
      bestWin:     Math.round(parseFloat(summary.bestWin) * 100) / 100,
    },
    dailyPnl:          days,
    sportBreakdown:    sportRows.map(r => ({
      sport:   r.sport || "Other",
      bets:    r.bets,
      staked:  Math.round(parseFloat(r.staked) * 100) / 100,
      netPnl:  Math.round(r.netPnl * 100) / 100,
    })),
    betTypeBreakdown:  typeRows.map(r => ({
      type:   r.type,
      count:  r.count,
      staked: Math.round(parseFloat(r.staked) * 100) / 100,
    })),
    streaks: { current, longest: longestStreak },
  });
});

export default router;
