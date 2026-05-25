import { Router } from "express";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import walletRouter from "./wallet.js";
import betsRouter from "./bets.js";
import referralRouter from "./referral.js";
import oddsRouter from "./odds.js";
import adminRouter from "./admin.js";
import winspinRouter from "./winspin.js";
import promotionsRouter from "./promotions.js";

const router = Router();

router.use(authRouter);
router.use(usersRouter);
router.use(walletRouter);
router.use(betsRouter);
router.use(referralRouter);
router.use(oddsRouter);
router.use(adminRouter);
router.use(winspinRouter);
router.use(promotionsRouter);

export default router;
