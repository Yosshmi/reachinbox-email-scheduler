import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info("Server started", {
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

function shutdown(signal: string): void {
  logger.info("Shutdown signal received", { signal });
  server.close((error) => {
    if (error) {
      logger.error("Server shutdown failed", { error: error.message });
      process.exit(1);
    }

    logger.info("Server stopped");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
