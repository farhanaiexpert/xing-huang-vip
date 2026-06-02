import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import apiRouter from "./routes/index.js";

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());

const BASE = process.env.BASE_PATH ?? "/api";

// Public health-check — must be registered BEFORE apiRouter because the
// admin catch-all (router.use(authenticate, requireAdmin)) would 401 it otherwise.
app.get(`${BASE}/health`, (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get(`${BASE}/healthz`, (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(BASE, apiRouter);

export default app;
