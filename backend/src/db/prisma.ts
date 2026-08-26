import { PrismaClient } from "@prisma/client";

import { logger } from "../utils/logger.js";

export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info("Database connected");
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database disconnected");
}
