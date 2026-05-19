import cron from "node-cron";
import { CronExpressionParser } from "cron-parser";
import { performSync } from "./sync";
import { prisma } from "./prisma";

declare global {
  var __cronRegistered: boolean | undefined;
}

export function ensureCron() {
  if (global.__cronRegistered) return;
  global.__cronRegistered = true;
  
  // Run a dispatcher every minute
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const activeSettings = await prisma.settings.findMany({
      where: { autoSyncEnabled: true },
    });

    for (const settings of activeSettings) {
      try {
        const interval = CronExpressionParser.parse(settings.autoSyncCron || "0 9 * * *");
        const lastRunPlanned = interval.prev().toDate();
        
        // If it was supposed to run in the last minute AND we haven't run it yet (or haven't run it since that planned time)
        const hasRecentlyRun = settings.lastCronRunAt && settings.lastCronRunAt >= lastRunPlanned;

        if (lastRunPlanned >= oneMinuteAgo && lastRunPlanned <= now && !hasRecentlyRun) {
           const shouldPush = settings.autoPushToSheets && settings.exportDestination === "google_sheets";
           
           // Update lastCronRunAt BEFORE running to prevent race conditions if sync takes long
           await prisma.settings.update({
             where: { id: settings.id },
             data: { lastCronRunAt: now }
           });

           await performSync({ userId: settings.userId, pushToSheets: shouldPush });
        }
      } catch (err) {
        console.error(`Cron error for user ${settings.userId}:`, err);
        await prisma.auditLog.create({
          data: { 
            userId: settings.userId,
            eventType: "cron_error", 
            payload: { message: (err as Error).message } 
          },
        });
      }
    }
  });
}

