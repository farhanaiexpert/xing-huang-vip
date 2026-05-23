import app from "./app.js";
import { logger } from "./lib/logger.js";

const PORT = parseInt(process.env.PORT ?? "5000", 10);

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "CupBett API server started");
});
