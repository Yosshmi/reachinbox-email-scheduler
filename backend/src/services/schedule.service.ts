export function calculateScheduledAt(
  startTime: Date,
  recipientIndex: number,
  delaySeconds: number,
): Date {
  return new Date(startTime.getTime() + recipientIndex * delaySeconds * 1_000);
}

export function queueDelay(scheduledAt: Date, now = new Date()): number {
  return Math.max(0, scheduledAt.getTime() - now.getTime());
}
