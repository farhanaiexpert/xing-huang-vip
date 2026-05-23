import { logger } from "../lib/logger";
import { runAutoSettlement } from "./settlement";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick() {
  if (running) return; // skip if previous run still going
  running = true;
  try {
    const result = await runAutoSettlement();
    if (result.settled > 0) {
      logger.info(result, "Scheduler: settlement run completed");
    }
  } catch (err) {
    logger.error({ err }, "Scheduler: settlement run failed");
  } finally {
    running = false;
  }
}

export function startScheduler() {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  logger.info({ intervalMs: INTERVAL_MS }, "Settlement scheduler started");
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
