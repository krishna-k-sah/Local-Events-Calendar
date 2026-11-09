import prisma from '../config/db.js';

export const registerForEvent = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    // Use Prisma transaction to ensure atomic execution and prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Row-level lock on PostgreSQL for serialized concurrency safety
      const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');
      if (isPostgres) {
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      }

      // 1. Fetch event
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { location: true },
      });

      if (!event) {
        throw new Error('EVENT_NOT_FOUND');
      }

      // 2. Status check
      if (event.status !== 'PUBLISHED') {
        throw new Error('EVENT_NOT_ACTIVE');
      }

      // 3. Deadline check
      if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
        throw new Error('DEADLINE_PASSED');
      }

      // 4. Duplicate registration check
      const existingRegistration = await tx.registration.findUnique({
        where: {
          userId_eventId: { userId, eventId },
        },
      });

      if (existingRegistration && existingRegistration.status !== 'CANCELLED') {
        throw new Error('ALREADY_REGISTERED');
      }

      // 5. Capacity check
      if (event.currentRegistered >= event.maxCapacity) {
        throw new Error('CAPACITY_FULL');
      }

      // 6. Generate unique ticket code
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `EVT-${event.id.substring(0, 4).toUpperCase()}-${randDigits}`;

      // 7. Upsert registration
      let registration;
      if (existingRegistration) {
        registration = await tx.registration.update({
          where: { id: existingRegistration.id },
          data: {
            status: 'CONFIRMED',
            ticketCode,
            registeredAt: new Date(),
            cancelledAt: null,
          },
        });
      } else {
        registration = await tx.registration.create({
          data: {
            eventId,
            userId,
            ticketCode,
            status: 'CONFIRMED',
          },
        });
      }

      // 8. Atomically increment participant count
      await tx.event.update({
        where: { id: eventId },
        data: { currentRegistered: { increment: 1 } },
      });

      // 9. Dispatch in-app notification
      await tx.notification.create({
        data: {
          userId,
          eventId,
          title: 'Registration Confirmed!',
          message: `Your reservation for "${event.title}" is confirmed. Pass #${ticketCode}.`,
          type: 'REGISTRATION_SUCCESS',
        },
      });

      // 10. Log Activity & Status Transition Audit
      await tx.activityLog.create({
        data: {
          userId,
          action: 'EVENT_REGISTERED',
          entityType: 'Registration',
          entityId: registration.id,
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: 'REGISTRATION_STATUS_TRANSITION',
          entityType: 'Registration',
          entityId: registration.id,
          detailsJson: JSON.stringify({
            fromStatus: existingRegistration ? existingRegistration.status : 'NONE',
            toStatus: 'CONFIRMED',
            eventId,
            ticketCode,
          }),
        },
      });

      return { registration, event, ticketCode };
    });

    res.status(201).json({
      success: true,
      message: 'Event registration confirmed.',
      data: {
        registrationId: result.registration.id,
        ticketCode: result.ticketCode,
        eventTitle: result.event.title,
        status: result.registration.status,
      },
    });
  } catch (error) {
    if (error.message === 'EVENT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    if (error.message === 'EVENT_NOT_ACTIVE') {
      return res.status(400).json({ success: false, message: 'This event is not currently open for public registration.' });
    }
    if (error.message === 'DEADLINE_PASSED') {
      return res.status(400).json({ success: false, message: 'Registration has closed for this event.' });
    }
    if (error.message === 'ALREADY_REGISTERED') {
      return res.status(400).json({ success: false, message: 'You are already registered for this event.' });
    }
    if (error.message === 'CAPACITY_FULL') {
      return res.status(400).json({ success: false, message: 'Registration is full. No seats remaining.' });
    }
    // Concurrency conflict handling (P2002 unique constraint, P2034 transaction conflict or database lock)
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'You are already registered for this event.' });
    }
    if (error.code === 'P2034' || error.message?.includes('write conflict') || error.message?.includes('locked')) {
      try {
        const freshEvent = await prisma.event.findUnique({ where: { id: eventId } });
        if (freshEvent && freshEvent.currentRegistered >= freshEvent.maxCapacity) {
          return res.status(400).json({ success: false, message: 'Registration is full. No seats remaining.' });
        }
      } catch (checkErr) {
        // Fall through to next
      }
    }
    next(error);
  }
};

export const cancelRegistration = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    await prisma.$transaction(async (tx) => {
      const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');
      if (isPostgres) {
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
      }

      const registration = await tx.registration.findUnique({
        where: {
          userId_eventId: { userId, eventId },
        },
        include: { event: true },
      });

      if (!registration || registration.status === 'CANCELLED') {
        throw new Error('REGISTRATION_NOT_FOUND');
      }

      await tx.registration.update({
        where: { id: registration.id },
        data: {
          status: 'CANCELLED',
          ticketStatus: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Audit status transition: CONFIRMED -> CANCELLED
      await tx.activityLog.create({
        data: {
          userId,
          action: 'REGISTRATION_STATUS_TRANSITION',
          entityType: 'Registration',
          entityId: registration.id,
          detailsJson: JSON.stringify({
            fromStatus: registration.status,
            toStatus: 'CANCELLED',
            eventId,
            ticketCode: registration.ticketCode,
          }),
        },
      });

      // Auto-promotion: Check if there is an attendee waiting on the waitlist
      const nextWaitlist = await tx.waitlist.findFirst({
        where: { eventId, status: 'PENDING' },
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        include: { user: true },
      });

      if (nextWaitlist) {
        // Promote waitlist entry to confirmed registration
        const randDigits = Math.floor(1000 + Math.random() * 9000);
        const ticketCode = `EVT-${registration.event.id.substring(0, 4).toUpperCase()}-${randDigits}`;

        const prevReg = await tx.registration.findUnique({
          where: { userId_eventId: { userId: nextWaitlist.userId, eventId } },
        });

        let promotedReg;
        if (prevReg) {
          promotedReg = await tx.registration.update({
            where: { id: prevReg.id },
            data: {
              status: 'CONFIRMED',
              ticketStatus: 'VALID',
              ticketCode,
              registeredAt: new Date(),
              cancelledAt: null,
            },
          });
        } else {
          promotedReg = await tx.registration.create({
            data: {
              eventId,
              userId: nextWaitlist.userId,
              ticketCode,
              status: 'CONFIRMED',
              ticketStatus: 'VALID',
            },
          });
        }

        await tx.waitlist.update({
          where: { id: nextWaitlist.id },
          data: { status: 'ACCEPTED' },
        });

        // Audit status transition: Waitlist auto-promotion
        await tx.activityLog.create({
          data: {
            userId: nextWaitlist.userId,
            action: 'REGISTRATION_STATUS_TRANSITION',
            entityType: 'Registration',
            entityId: promotedReg.id,
            detailsJson: JSON.stringify({
              fromStatus: prevReg ? prevReg.status : 'NONE',
              toStatus: 'CONFIRMED',
              eventId,
              ticketCode,
              source: 'WAITLIST_AUTO_PROMOTION',
              waitlistId: nextWaitlist.id,
            }),
          },
        });

        // Re-index remaining waitlist positions
        await tx.waitlist.updateMany({
          where: {
            eventId,
            status: 'PENDING',
            position: { gt: nextWaitlist.position },
          },
          data: {
            position: { decrement: 1 },
          },
        });

        // Send confirmation notification to promoted user
        await tx.notification.create({
          data: {
            userId: nextWaitlist.userId,
            eventId,
            title: 'Promoted from Waitlist!',
            message: `A seat opened up for "${registration.event.title}" and your registration has been automatically confirmed! Pass #${ticketCode}.`,
            type: 'REGISTRATION_SUCCESS',
          },
        });
      } else {
        // No waitlist, safely decrement registered seat count
        await tx.event.update({
          where: { id: eventId },
          data: { currentRegistered: { decrement: 1 } },
        });
      }

      await tx.notification.create({
        data: {
          userId,
          eventId,
          title: 'Registration Cancelled',
          message: `Your reservation for "${registration.event.title}" has been cancelled.`,
          type: 'REGISTRATION_CANCELLED',
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully.',
    });
  } catch (error) {
    if (error.message === 'REGISTRATION_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Active registration not found for this event.' });
    }
    next(error);
  }
};

export const getUserRegistrations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const registrations = await prisma.registration.findMany({
      where: { userId },
      include: {
        event: {
          include: { location: true, category: true },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    const formatted = registrations.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.event.title,
      eventDate: r.event.startDate,
      venueName: r.event.location?.venueName || 'Venue TBA',
      city: r.event.location?.city || '',
      ticketCode: r.ticketCode,
      status: r.status,
      price: r.event.price,
      registeredAt: r.registeredAt,
      posterImage: r.event.posterImage,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

