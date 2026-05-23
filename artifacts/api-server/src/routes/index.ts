import { Router } from "express";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import walletRouter from "./wallet.js";
import betsRouter from "./bets.js";
import referralRouter from "./referral.js";
import oddsRouter from "./odds.js";

const router = Router();

router.use(authRouter);
router.use(usersRouter);
router.use(walletRouter);
router.use(betsRouter);
router.use(referralRouter);
router.use(oddsRouter);

export default router;
