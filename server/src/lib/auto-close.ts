import prisma from "./prisma";

export function startAutoClosePoller() {
  const INTERVAL_MS = 5 * 60 * 1000;
  const THRESHOLD_MS = 24 * 60 * 60 * 1000;

  setInterval(async () => {
    const cutoff = new Date(Date.now() - THRESHOLD_MS);
    await prisma.ticket.updateMany({
      where: { status: "RESOLVED", resolvedAt: { lte: cutoff } },
      data: { status: "CLOSED" },
    });
  }, INTERVAL_MS);
}
