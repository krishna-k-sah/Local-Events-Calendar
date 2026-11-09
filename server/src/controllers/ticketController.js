import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { JWT_SECRET } from '../config/jwt.js';

export const TICKET_ISSUER = 'EventHub-Ticketing';
export const TICKET_AUDIENCE = 'EventHub-Attendance';

export const generateTicketToken = (ticketCode, eventId) => {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be configured with at least 32 characters in production.');
  }

  const jti = crypto.randomUUID();

  // Data Minimization: Avoid embedding user database IDs in client-facing QR tokens.
  // Verification uses cryptographic signature, ticketCode, and eventId against the database.
  return jwt.sign(
    {
      ticketCode,
      eventId,
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: TICKET_ISSUER,
      audience: TICKET_AUDIENCE,
      subject: ticketCode,
      jwtid: jti,
      expiresIn: '30d',
    }
  );
};

export const verifyTicketToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: TICKET_ISSUER,
      audience: TICKET_AUDIENCE,
    });
  } catch (err) {
    return null;
  }
};

export const getTicketDetails = async (req, res, next) => {
  try {
    const { ticketCode } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;

    const registration = await prisma.registration.findUnique({
      where: { ticketCode },
      include: {
        event: {
          include: {
            location: true,
            category: true,
            organizer: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        attendance: {
          include: {
            scannedBy: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    // Access check: User must be ticket owner, event organizer, or Admin
    const isOwner = registration.userId === userId;
    const isOrganizer = registration.event.organizerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isOrganizer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this ticket.',
      });
    }

    // Determine status
    let computedStatus = 'VALID';
    const now = new Date();
    const eventEnd = registration.event.endDate
      ? new Date(registration.event.endDate)
      : new Date(new Date(registration.event.startDate).getTime() + 4 * 60 * 60 * 1000);

    if (registration.status === 'CANCELLED' || registration.event.status === 'CANCELLED' || registration.event.status === 'REJECTED') {
      computedStatus = 'CANCELLED';
    } else if (registration.attendance || registration.status === 'ATTENDED') {
      computedStatus = 'USED';
    } else if (now > eventEnd) {
      computedStatus = 'EXPIRED';
    }

    const signedToken = generateTicketToken(
      registration.ticketCode,
      registration.eventId
    );

    res.status(200).json({
      success: true,
      data: {
        ticketCode: registration.ticketCode,
        ticketStatus: computedStatus,
        registrationStatus: registration.status,
        signedToken,
        registeredAt: registration.registeredAt,
        attendee: {
          fullName: registration.user.fullName,
          email: registration.user.email,
          phone: registration.user.phone,
        },
        event: {
          id: registration.event.id,
          title: registration.event.title,
          description: registration.event.description,
          startDate: registration.event.startDate,
          endDate: registration.event.endDate,
          venueName: registration.event.location?.venueName,
          address: registration.event.location?.address,
          city: registration.event.location?.city,
          category: registration.event.category?.name,
          categoryColor: registration.event.category?.color,
          posterImage: registration.event.posterImage,
          organizer: registration.event.organizer?.fullName,
        },
        attendance: registration.attendance
          ? {
              scannedAt: registration.attendance.scannedAt,
              method: registration.attendance.method,
              scannedBy: registration.attendance.scannedBy?.fullName,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
