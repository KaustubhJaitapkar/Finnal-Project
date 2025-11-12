import { PrismaClient } from "@prisma/client";

class PrismaClientSingleton {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      // Avoid printing raw SQL queries by default. Keep warnings and errors.
      // If you need SQL debugging, enable it explicitly (e.g. set PRISMA_LOG_QUERIES=true).
      const includeQueryLog = process.env.PRISMA_LOG_QUERIES === 'true';
      PrismaClientSingleton.instance = new PrismaClient({
        log: includeQueryLog
          ? ["query", "error", "warn"]
          : ["warn", "error"],
      });
    }
    return PrismaClientSingleton.instance;
  }
}

export const prisma = PrismaClientSingleton.getInstance();