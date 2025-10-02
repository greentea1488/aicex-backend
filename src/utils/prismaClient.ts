import { PrismaClient } from "../../generated/prisma";
import { logger } from "./logger";

export const prisma = new PrismaClient().$extends({
  query: {
    $allOperations({ model, operation, args, query }) {
      const start = Date.now();
      const duration = Date.now() - start;

      logger.info(`PRISMA | ${model}.${operation} (${JSON.stringify(args)}) | ${duration}ms`);

      return query(args);
    },
  },
});
