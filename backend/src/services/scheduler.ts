import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendReminder } from './mailer';

/**
 * Schedule daily jobs for sending borrower reminders:
 * - 24 hours before due date
 * - On due date
 */
export function scheduleJobs(prisma: PrismaClient) {
    // Run every day at 06:00 AM Toronto time
    cron.schedule(
        '0 6 * * *',
        async () => {
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);

            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            const tomorrowStart = new Date(tomorrow);
            tomorrowStart.setHours(0, 0, 0, 0);
            const tomorrowEnd = new Date(tomorrow);
            tomorrowEnd.setHours(23, 59, 59, 999);

            try {
                // 24h reminder: dueDate within tomorrow
                const upcoming = await prisma.borrow.findMany({
                    where: {
                        returned: false,
                        dueDate: {
                            gte: tomorrowStart,
                            lte: tomorrowEnd,
                        },
                    },
                    include: { user: true, item: true },
                });

                for (const rec of upcoming) {
                    await sendReminder(
                        rec.user.email,
                        rec.user.name || rec.user.email,
                        rec.item.name,
                        rec.dueDate
                    );
                }

                // Same-day reminder: dueDate within today
                const dueToday = await prisma.borrow.findMany({
                    where: {
                        returned: false,
                        dueDate: {
                            gte: todayStart,
                            lte: todayEnd,
                        },
                    },
                    include: { user: true, item: true },
                });

                for (const rec of dueToday) {
                    await sendReminder(
                        rec.user.email,
                        rec.user.name || rec.user.email,
                        rec.item.name,
                        rec.dueDate
                    );
                }
            } catch (err) {
                console.error('Error running scheduled reminder jobs:', err);
            }
        },
        {
            timezone: 'America/Toronto',
        }
    );
}
