import prisma from '../config/db.js';

export const joinWaitlist = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Event is not active.' });
    }

    // Check if user is already registered with confirmed status
    const existingReg = await prisma.registration.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existingReg && existingReg.status === 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: 'You already have a confirmed registration for this event.',
      });
    }

    // Only allow waitlist if event is at capacity
    if (event.currentRegistered < event.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Seats are still available for this event. You can register directly!',
      });
    }

    // Check if already on active waitlist
    const existingWaitlist = await prisma.waitlist.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existingWaitlist && (existingWaitlist.status === 'PENDING' || existingWaitlist.status === 'OFFERED')) {
      return res.status(400).json({
        success: false,
        message: `You are already on the waitlist at position #${existingWaitlist.position}.`,
      });
    }

    // Atomic Transaction: Compute position and create waitlist record safely
    const { waitlistEntry, newPosition } = await prisma.$transaction(async (tx) => {
      const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');
      if (isPostgres) {
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      }

      const activeWaitlistCount = await tx.waitlist.count({
        where: {
          eventId,
          status: { in: ['PENDING', 'OFFERED'] },
        },
      });

      const nextPos = activeWaitlistCount + 1;

      let entry;
      if (existingWaitlist) {
        entry = await tx.waitlist.update({
          where: { id: existingWaitlist.id },
          data: {
            status: 'PENDING',
            position: nextPos,
            offeredAt: null,
            expiresAt: null,
          },
        });
      } else {
        entry = await tx.waitlist.create({
          data: {
            eventId,
            userId,
            status: 'PENDING',
            position: nextPos,
          },
        });
      }

      // Send in-app notification
      await tx.notification.create({
        data: {
          userId,
          eventId,
          title: 'Joined Event Waitlist',
          message: `You have joined the waitlist for "${event.title}" at position #${nextPos}. We'll notify you if a seat opens!`,
          type: 'REMINDER',
        },
      });

      // Activity log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'WAITLIST_JOINED',
          entityType: 'Waitlist',
          entityId: entry.id,
        },
      });

      return { waitlistEntry: entry, newPosition: nextPos };
    });

    res.status(201).json({
      success: true,
      message: `You have been added to the waitlist at position #${newPosition}.`,
      data: {
        waitlistId: waitlistEntry.id,
        position: newPosition,
        totalWaitlist: newPosition,
        status: 'PENDING',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const leaveWaitlist = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (!waitlistEntry || waitlistEntry.status !== 'PENDING') {
      return res.status(404).json({
        success: false,
        message: 'No active waitlist entry found for this event.',
      });
    }

    const vacatedPosition = waitlistEntry.position;

    await prisma.$transaction(async (tx) => {
      await tx.waitlist.update({
        where: { id: waitlistEntry.id },
        data: { status: 'CANCELLED' },
      });

      // Shift subsequent positions down by 1
      await tx.waitlist.updateMany({
        where: {
          eventId,
          status: 'PENDING',
          position: { gt: vacatedPosition },
        },
        data: {
          position: { decrement: 1 },
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'You have left the waitlist.',
    });
  } catch (error) {
    next(error);
  }
};

export const getWaitlistStatus = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user ? req.user.id : null;

    const totalWaitlist = await prisma.waitlist.count({
      where: { eventId, status: { in: ['PENDING', 'OFFERED'] } },
    });

    if (!userId) {
      return res.status(200).json({
        success: true,
        data: { onWaitlist: false, totalWaitlist },
      });
    }

    const entry = await prisma.waitlist.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    const onWaitlist = Boolean(entry && (entry.status === 'PENDING' || entry.status === 'OFFERED'));

    res.status(200).json({
      success: true,
      data: {
        onWaitlist,
        position: onWaitlist ? entry.position : null,
        status: entry?.status || null,
        totalWaitlist,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEventWaitlist = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this waitlist.',
      });
    }

    const entries = await prisma.waitlist.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    res.status(200).json({
      success: true,
      data: {
        eventId,
        eventTitle: event.title,
        totalWaitlist: entries.filter((e) => e.status === 'PENDING' || e.status === 'OFFERED').length,
        entries,
      },
    });
  } catch (error) {
    next(error);
  }
};
