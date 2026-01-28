import cron from "node-cron";
import { performSync } from "./sync";
import { prisma } from "./prisma";

declare global {
  // eslint-disable-next-line no-var
  var __cronRegistered: boolean | undefined;
}

let currentTask: cron.ScheduledTask | null = null;

export function ensureCron() {
  if (global.__cronRegistered) return;
  global.__cronRegistered = true;
  
  async function setupCron() {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings?.autoSyncEnabled) {
      if (currentTask) {
        currentTask.stop();
        currentTask = null;
      }
      return;
    }
    
    const cronExpr = settings.autoSyncCron || "0 9 * * *";
    if (currentTask) {
      currentTask.stop();
    }
    currentTask = cron.schedule(cronExpr, async () => {
      try {
        // Only push to sheets if auto-push is enabled AND export destination is google_sheets
        // The sync function will handle the export destination check, but we pass the flag
        // based on both conditions here for clarity
        const shouldPush = settings.autoPushToSheets && settings.exportDestination === "google_sheets";
        await performSync({ pushToSheets: shouldPush });
      } catch (err) {
        await prisma.auditLog.create({
          data: { eventType: "cron_error", payload: { message: (err as Error).message } },
        });
      }
    });
  }
  
  setupCron();
  // Re-check settings every minute to pick up changes
  setInterval(setupCron, 60000);
}

