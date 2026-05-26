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
import poolsRouter from "./pools.js";
import setupRouter from "./setup.js";
import webhooksRouter from "./webhooks.js";
import rgRouter from "./rg.js";
import boostsRouter from "./boosts.js";
import loyaltyRouter from "./loyalty.js";

const router = Router();

router.use(setupRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(walletRouter);
router.use(betsRouter);
router.use(referralRouter);
router.use(oddsRouter);
router.use(adminRouter);
router.use(winspinRouter);
router.use(promotionsRouter);
router.use(poolsRouter);
router.use(webhooksRouter);
router.use(rgRouter);
router.use(boostsRouter);
router.use(loyaltyRouter);

export default router;
