import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureCron } from "@/lib/cron";
import cron from "node-cron";
import { CronExpressionParser } from "cron-parser";
import { prisma } from "@/lib/prisma";
import { performSync } from "@/lib/sync";

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

vi.mock("cron-parser", () => ({
  CronExpressionParser: {
    parse: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    settings: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/sync", () => ({
  performSync: vi.fn(),
}));

describe("Cron Dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).__cronRegistered = false;
    vi.useFakeTimers();
  });

  it("should register a minute-by-minute cron task", () => {
    ensureCron();
    expect(cron.schedule).toHaveBeenCalledWith("* * * * *", expect.any(Function));
  });

  it("should trigger sync for a due user", async () => {
    const mockNow = new Date("2026-05-19T09:00:05Z");
    vi.setSystemTime(mockNow);

    const mockSettings = {
      id: "user1-settings",
      userId: "user1",
      autoSyncEnabled: true,
      autoSyncCron: "0 9 * * *", // Daily at 9 AM
      autoPushToSheets: true,
      exportDestination: "google_sheets",
      lastCronRunAt: new Date("2026-05-18T09:00:00Z"),
    };

    (prisma.settings.findMany as any).mockResolvedValue([mockSettings]);
    
    // Mock CronExpressionParser.parse to return an object with prev() method
    (CronExpressionParser.parse as any).mockReturnValue({
      prev: () => ({
        toDate: () => new Date("2026-05-19T09:00:00Z"),
      }),
    });

    ensureCron();
    const cronCallback = (cron.schedule as any).mock.calls[0][1];
    
    await cronCallback();

    expect(prisma.settings.update).toHaveBeenCalledWith({
      where: { id: "user1-settings" },
      data: { lastCronRunAt: expect.any(Date) },
    });
    expect(performSync).toHaveBeenCalledWith({
      userId: "user1",
      pushToSheets: true,
    });
  });

  it("should NOT trigger sync if already run recently", async () => {
    const mockNow = new Date("2026-05-19T09:00:05Z");
    vi.setSystemTime(mockNow);

    const mockSettings = {
      id: "user1-settings",
      userId: "user1",
      autoSyncEnabled: true,
      autoSyncCron: "0 9 * * *",
      lastCronRunAt: new Date("2026-05-19T09:00:01Z"), // Already run this minute
    };

    (prisma.settings.findMany as any).mockResolvedValue([mockSettings]);
    
    (CronExpressionParser.parse as any).mockReturnValue({
      prev: () => ({
        toDate: () => new Date("2026-05-19T09:00:00Z"),
      }),
    });

    ensureCron();
    const cronCallback = (cron.schedule as any).mock.calls[0][1];
    
    await cronCallback();

    expect(performSync).not.toHaveBeenCalled();
  });
});
