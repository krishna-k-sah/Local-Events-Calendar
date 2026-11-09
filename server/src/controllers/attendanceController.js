import prisma from '../config/db.js';
import { verifyTicketToken } from './ticketController.js';

export const scanTicket = async (req, res, next) => {
  try {
    const { ticketCodeOrToken, eventId, method = 'QR', notes } = req.body;
    const scannerId = req.user.id;
    const scannerRole = req.user.role?.name || req.user.role;

    if (!ticketCodeOrToken || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Both ticketCodeOrToken and eventId are required.',
      });
    }

    // 1. Verify Event & Permissions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (event.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This event has been cancelled. Check-in is not permitted.',
      });
    }

    const isOrganizer = event.organizerId === scannerId;
    const isAdmin = scannerRole === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the event organizer or an administrator can scan attendance tickets.',
      });
    }

    // 2. Resolve Ticket Code
    let resolvedTicketCode = ticketCodeOrToken.trim();
    if (resolvedTicketCode.split('.').length === 3) {
      // Looks like a signed JWT token
      const decoded = verifyTicketToken(resolvedTicketCode);
      if (!decoded || !decoded.ticketCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid, expired, or forged QR ticket token signature.',
        });
      }
      if (decoded.eventId !== eventId) {
        return res.status(400).json({
          success: false,
          message: 'Ticket is for a different event.',
        });
      }
      resolvedTicketCode = decoded.ticketCode;
    }

    // 3. Find Registration
    const registration = await prisma.registration.findUnique({
      where: { ticketCode: resolvedTicketCode },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
        },
        attendance: {
          include: {
            scannedBy: { select: { fullName: true } },
          },
        },
      },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: `No registration found for ticket code "${resolvedTicketCode}".`,
      });
    }

    if (registration.eventId !== eventId) {
      return res.status(400).json({
        success: false,
        message: 'This ticket belongs to another event.',
      });
    }

    if (registration.status === 'CANCELLED' || registration.ticketStatus === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This registration was cancelled and is no longer valid.',
      });
    }

    // 4. Duplicate Check-in Prevention (Pre-transaction check)
    if (registration.attendance || registration.status === 'ATTENDED' || registration.ticketStatus === 'USED') {
      const priorScan = registration.attendance;
      const priorTime = priorScan?.scannedAt
        ? new Date(priorScan.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'earlier';
      const priorScanner = priorScan?.scannedBy?.fullName || 'Staff';

      return res.status(409).json({
        success: false,
        duplicate: true,
        message: `DUPLICATE SCAN: Ticket already used. Checked in at ${priorTime} by ${priorScanner}.`,
        data: {
          attendee: registration.user,
          scannedAt: priorScan?.scannedAt,
          scannedBy: priorScanner,
          ticketCode: resolvedTicketCode,
        },
      });
    }

    // 5. Atomic Check-in Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify registration inside transaction
      const liveReg = await tx.registration.findUnique({
        where: { id: registration.id },
      });

      if (!liveReg || liveReg.status === 'ATTENDED' || liveReg.ticketStatus === 'USED') {
        throw new Error('DUPLICATE_CHECKIN_DETECTED');
      }

      const attendance = await tx.attendance.create({
        data: {
          eventId,
          registrationId: registration.id,
          userId: registration.userId,
          ticketCode: resolvedTicketCode,
          scannedById: scannerId,
          method: method.toUpperCase() === 'MANUAL' ? 'MANUAL' : 'QR',
          notes: notes || null,
        },
        include: {
          scannedBy: { select: { fullName: true } },
        },
      });

      await tx.registration.update({
        where: { id: registration.id },
        data: {
          ticketStatus: 'USED',
          status: 'ATTENDED',
        },
      });

      // Notification to attendee
      await tx.notification.create({
        data: {
          userId: registration.userId,
          eventId,
          title: 'Welcome to the Event!',
          message: `Your check-in for "${event.title}" has been confirmed at the door. Enjoy the event!`,
          type: 'REMINDER',
        },
      });

      // Activity log
      await tx.activityLog.create({
        data: {
          userId: scannerId,
          action: 'ATTENDANCE_CHECKIN',
          entityType: 'Attendance',
          entityId: attendance.id,
          detailsJson: JSON.stringify({
            ticketCode: resolvedTicketCode,
            attendeeId: registration.userId,
            method: attendance.method,
          }),
        },
      });

      return attendance;
    });

    res.status(200).json({
      success: true,
      message: `Check-in confirmed for ${registration.user.fullName}!`,
      data: {
        attendanceId: result.id,
        ticketCode: resolvedTicketCode,
        attendee: registration.user,
        scannedAt: result.scannedAt,
        method: result.method,
        scannedBy: result.scannedBy?.fullName,
      },
    });
  } catch (error) {
    // Catch concurrent duplicate collision at database constraint level
    if (
      error.code === 'P2002' ||
      error.message === 'DUPLICATE_CHECKIN_DETECTED' ||
      error.message?.includes('Unique constraint')
    ) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: 'DUPLICATE SCAN DETECTED: This ticket was already checked in simultaneously.',
      });
    }
    next(error);
  }
};

export const getEventAttendanceRoster = async (req, res, next) => {
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
        message: 'Forbidden: You do not have permission to view attendance for this event.',
      });
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
        },
        attendance: {
          include: {
            scannedBy: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    const totalRegistered = registrations.filter((r) => r.status !== 'CANCELLED').length;
    const totalAttended = registrations.filter((r) => r.attendance || r.status === 'ATTENDED').length;
    const attendanceRate = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

    const roster = registrations.map((r) => ({
      registrationId: r.id,
      ticketCode: r.ticketCode,
      registrationStatus: r.status,
      ticketStatus: r.ticketStatus,
      registeredAt: r.registeredAt,
      attendee: r.user,
      isCheckedIn: Boolean(r.attendance || r.status === 'ATTENDED'),
      checkInDetails: r.attendance
        ? {
            scannedAt: r.attendance.scannedAt,
            method: r.attendance.method,
            scannedBy: r.attendance.scannedBy?.fullName || 'Staff',
            notes: r.attendance.notes,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        eventId,
        eventTitle: event.title,
        totalRegistered,
        totalAttended,
        attendanceRate,
        roster,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportAttendanceCsv = async (req, res, next) => {
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
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        attendance: {
          include: { scannedBy: { select: { fullName: true } } },
        },
      },
      orderBy: { registeredAt: 'asc' },
    });

    const headers = [
      'Ticket Code',
      'Attendee Name',
      'Email',
      'Phone',
      'Registration Status',
      'Registered At',
      'Checked In',
      'Check-in Time',
      'Check-in Method',
      'Scanned By',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = registrations.map((r) => [
      escapeCsv(r.ticketCode),
      escapeCsv(r.user?.fullName),
      escapeCsv(r.user?.email),
      escapeCsv(r.user?.phone || 'N/A'),
      escapeCsv(r.status),
      escapeCsv(r.registeredAt?.toISOString()),
      escapeCsv(r.attendance ? 'YES' : 'NO'),
      escapeCsv(r.attendance?.scannedAt?.toISOString() || 'N/A'),
      escapeCsv(r.attendance?.method || 'N/A'),
      escapeCsv(r.attendance?.scannedBy?.fullName || 'N/A'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance-${event.id}-${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
