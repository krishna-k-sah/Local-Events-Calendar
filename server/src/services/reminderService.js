import prisma from '../config/db.js';

let schedulerInterval = null;
const CLAIM_TTL_MS = 5 * 60 * 1000; // 5 minute claim lock for worker failure recovery

/**
 * Atomically claim and dispatch a reminder to prevent duplicate notifications
 * across horizontally scaled backend worker instances.
 */
export async function claimAndDispatchReminder({ event, reg, reminderType, title, message }) {
  const now = new Date();

  // 1. Atomic claim check & set inside transaction
  let claimed = null;
  try {
    claimed = await prisma.$transaction(async (tx) => {
      const existing = await tx.eventReminder.findUnique({
        where: {
          eventId_userId_reminderType: {
            eventId: event.id,
            userId: reg.userId,
            reminderType,
          },
        },
      });

      if (existing) {
        if (existing.status === 'SENT') {
          return null; // Already completed
        }
        if (
          existing.status === 'CLAIMED' &&
          existing.lastAttempt &&
          now.getTime() - new Date(existing.lastAttempt).getTime() < CLAIM_TTL_MS
        ) {
          return null; // Currently being handled by another worker under active TTL
        }
        if (existing.status === 'FAILED' && existing.attemptCount >= 3) {
          return null; // Retry threshold reached
        }

        // Claim existing failed/expired record
        return await tx.eventReminder.update({
          where: { id: existing.id },
          data: {
            status: 'CLAIMED',
            lastAttempt: now,
            attemptCount: { increment: 1 },
            failureReason: null,
          },
        });
      }

      // Create new claim
      return await tx.eventReminder.create({
        data: {
          eventId: event.id,
          userId: reg.userId,
          reminderType,
          scheduledFor: event.startDate,
          status: 'CLAIMED',
          attemptCount: 1,
          lastAttempt: now,
        },
      });
    });
  } catch (claimErr) {
    // If a unique constraint race occurs, another concurrent process won the claim
    return { status: 'SKIPPED' };
  }

  if (!claimed) {
    return { status: 'SKIPPED' };
  }

  // 2. Dispatch notification and transition status to SENT
  try {
    await prisma.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          userId: reg.userId,
          eventId: event.id,
          title,
          message,
          type: 'REMINDER',
        },
      });

      await tx.eventReminder.update({
        where: { id: claimed.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    });

    return { status: 'SENT' };
  } catch (dispatchErr) {
    await prisma.eventReminder.update({
      where: { id: claimed.id },
      data: {
        status: 'FAILED',
        failureReason: dispatchErr.message,
      },
    });
    return { status: 'FAILED', error: dispatchErr.message };
  }
}

export const processEventReminders = async () => {
  const now = new Date();
  const summary = {
    evaluatedEvents: 0,
    reminders24hSent: 0,
    reminders2hSent: 0,
    failedAttempts: 0,
    errors: [],
  };

  try {
    // 1. Find all published events happening in the next 30 hours
    // Explicitly excluding cancelled or draft events
    const upcomingEvents = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: {
          gt: now,
          lte: new Date(now.getTime() + 30 * 60 * 60 * 1000),
        },
      },
      include: {
        location: true,
        registrations: {
          where: {
            status: { in: ['CONFIRMED', 'ATTENDED'] },
          },
          include: { user: true },
        },
      },
    });

    summary.evaluatedEvents = upcomingEvents.length;

    for (const event of upcomingEvents) {
      const hoursUntilEvent = (new Date(event.startDate).getTime() - now.getTime()) / (1000 * 60 * 60);
      const venueStr = event.location?.venueName || event.location?.city || 'the venue';
      const timeStr = new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Check 24H window: between 22 and 26 hours
      const is24hWindow = hoursUntilEvent >= 22 && hoursUntilEvent <= 26;
      // Check 2H window: between 0.5 and 3.0 hours
      const is2hWindow = hoursUntilEvent >= 0.5 && hoursUntilEvent <= 3.0;

      for (const reg of event.registrations) {
        // Process 24H Reminder
        if (is24hWindow) {
          const res = await claimAndDispatchReminder({
            event,
            reg,
            reminderType: '24H',
            title: `24-Hour Reminder: ${event.title}`,
            message: `"${event.title}" is happening tomorrow at ${timeStr} at ${venueStr}. Ensure your QR pass is ready in My Registrations.`,
          });

          if (res.status === 'SENT') {
            summary.reminders24hSent++;
          } else if (res.status === 'FAILED') {
            summary.failedAttempts++;
            if (res.error) summary.errors.push(res.error);
          }
        }

        // Process 2H Reminder
        if (is2hWindow) {
          const res = await claimAndDispatchReminder({
            event,
            reg,
            reminderType: '2H',
            title: `Starting in 2 Hours: ${event.title}`,
            message: `"${event.title}" starts in 2 hours at ${venueStr}. Please have your ticket ready for fast-track door check-in.`,
          });

          if (res.status === 'SENT') {
            summary.reminders2hSent++;
          } else if (res.status === 'FAILED') {
            summary.failedAttempts++;
            if (res.error) summary.errors.push(res.error);
          }
        }
      }
    }

    return summary;
  } catch (error) {
    summary.errors.push(error.message);
    return summary;
  }
};

export const startReminderScheduler = (intervalMs = 15 * 60 * 1000) => {
  if (schedulerInterval) return;
  // Trigger initial check
  processEventReminders().catch((err) => console.error('Initial reminder check error:', err));
  schedulerInterval = setInterval(() => {
    processEventReminders().catch((err) => console.error('Periodic reminder worker error:', err));
  }, intervalMs);
};

export const stopReminderScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
};
