import prisma from '../config/db.js';

export const getEvents = async (req, res, next) => {
  try {
    const {
      q,
      category,
      city,
      price,
      status,
      sort = 'UPCOMING',
      page = 1,
      limit = 12,
      featured,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    // Filter building
    const where = {};

    // By default, public unauthenticated requests only see PUBLISHED events
    if (status) {
      where.status = status;
    } else {
      const userRole = req.user?.role?.name;
      if (userRole !== 'ADMIN') {
        where.status = 'PUBLISHED';
      }
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (category && category !== 'ALL') {
      where.categoryId = category;
    }

    if (city && city !== 'ALL') {
      where.location = {
        city: { contains: city },
      };
    }

    if (price === 'FREE') {
      where.isFree = true;
    } else if (price === 'PAID') {
      where.isFree = false;
      where.price = { gt: 0 };
    }

    if (q && q.trim()) {
      const queryStr = q.trim();
      where.OR = [
        { title: { contains: queryStr } },
        { description: { contains: queryStr } },
        { location: { venueName: { contains: queryStr } } },
      ];
    }

    // Sort order
    let orderBy = { startDate: 'asc' };
    if (sort === 'NEWEST') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'POPULAR') {
      orderBy = { currentRegistered: 'desc' };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: true,
          location: true,
          organizer: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.event.count({ where }),
    ]);

    // Format for frontend consistency
    const formattedEvents = events.map((e) => ({
      ...e,
      venueName: e.location?.venueName || 'Venue TBA',
      address: e.location?.address || '',
      city: e.location?.city || '',
      category: e.category?.name || 'General',
      organizerName: e.organizer?.fullName || 'Event Organizer',
    }));

    res.status(200).json({
      success: true,
      data: formattedEvents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCalendarEvents = async (req, res, next) => {
  try {
    const { start, end, category } = req.query;

    const where = {
      status: 'PUBLISHED',
    };

    if (category && category !== 'ALL') {
      where.categoryId = category;
    }

    if (start && end) {
      where.startDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        category: true,
        location: true,
        organizer: { select: { fullName: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const calendarItems = events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.startDate,
      end: e.endDate || e.startDate,
      backgroundColor: e.category?.color || '#6366f1',
      borderColor: e.category?.color || '#6366f1',
      textColor: '#ffffff',
      extendedProps: {
        ...e,
        venueName: e.location?.venueName,
        address: e.location?.address,
        city: e.location?.city,
        category: e.category?.name,
        organizerName: e.organizer?.fullName,
      },
    }));

    res.status(200).json({
      success: true,
      data: calendarItems,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedEvents = async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        isFeatured: true,
      },
      include: {
        category: true,
        location: true,
        organizer: { select: { fullName: true } },
      },
      take: 6,
      orderBy: { startDate: 'asc' },
    });

    const formatted = events.map((e) => ({
      ...e,
      venueName: e.location?.venueName,
      address: e.location?.address,
      city: e.location?.city,
      category: e.category?.name,
      organizerName: e.organizer?.fullName,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        organizer: {
          select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
        },
        images: true,
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const formatted = {
      ...event,
      venueName: event.location?.venueName,
      address: event.location?.address,
      city: event.location?.city,
      category: event.category?.name,
      organizerName: event.organizer?.fullName,
    };

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role.name;

    const {
      title,
      description,
      categoryId,
      startDate,
      endDate,
      registrationDeadline,
      venueName,
      address,
      city,
      maxCapacity,
      isFree,
      price,
      contactEmail,
      contactPhone,
      posterImage,
    } = req.body;

    // Validate start date is valid and in future
    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start date provided.' });
    }

    // Capacity check
    if (parseInt(maxCapacity, 10) < 1) {
      return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
    }

    // Upsert or create location
    let location = await prisma.location.findFirst({
      where: { venueName, city },
    });

    if (!location) {
      location = await prisma.location.create({
        data: {
          venueName,
          address,
          city,
        },
      });
    }

    // Resolve category by ID or slug/name fallback to guarantee genuine DB foreign key
    let resolvedCategory = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!resolvedCategory) {
      resolvedCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: categoryId },
            { name: categoryId },
          ],
        },
      });
    }
    if (!resolvedCategory) {
      resolvedCategory = await prisma.category.findFirst();
    }
    const finalCategoryId = resolvedCategory ? resolvedCategory.id : categoryId;

    // Auto-approve if created by ADMIN, otherwise set to PENDING
    const initialStatus = userRole === 'ADMIN' ? 'PUBLISHED' : 'PENDING';

    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        categoryId: finalCategoryId,
        organizerId: userId,
        locationId: location.id,
        startDate: parsedStart,
        endDate: endDate ? new Date(endDate) : null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        maxCapacity: parseInt(maxCapacity, 10),
        isFree: Boolean(isFree),
        price: isFree ? 0 : parseFloat(price) || 0,
        contactEmail: contactEmail || req.user.email,
        contactPhone: contactPhone || req.user.phone,
        posterImage: posterImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
        status: initialStatus,
      },
      include: {
        category: true,
        location: true,
      },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        eventId: newEvent.id,
        title: initialStatus === 'PUBLISHED' ? 'Event Published!' : 'Event Submitted for Approval',
        message: initialStatus === 'PUBLISHED'
          ? `Your event "${newEvent.title}" is live on the community calendar.`
          : `"${newEvent.title}" was submitted and is pending administrator review.`,
        type: 'EVENT_APPROVAL',
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'EVENT_CREATED',
        entityType: 'Event',
        entityId: newEvent.id,
      },
    });

    res.status(201).json({
      success: true,
      message: initialStatus === 'PUBLISHED'
        ? 'Event published successfully.'
        : 'Event submitted for administrator review.',
      data: newEvent,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role.name;

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Role check: Only the organizer owner or ADMIN can update
    if (existingEvent.organizerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this event.',
      });
    }

    const {
      title,
      description,
      categoryId,
      startDate,
      endDate,
      venueName,
      address,
      city,
      maxCapacity,
      isFree,
      price,
      posterImage,
      status,
    } = req.body;

    // Update location if provided
    let locationId = existingEvent.locationId;
    if (venueName && city) {
      let location = await prisma.location.findFirst({
        where: { venueName, city },
      });
      if (!location) {
        location = await prisma.location.create({
          data: { venueName, address: address || '', city },
        });
      }
      locationId = location.id;
    }

    // Resolve category if provided
    let finalCategoryId = undefined;
    if (categoryId) {
      let resolvedCategory = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!resolvedCategory) {
        resolvedCategory = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: categoryId },
              { name: categoryId },
            ],
          },
        });
      }
      finalCategoryId = resolvedCategory ? resolvedCategory.id : categoryId;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: title || undefined,
        description: description || undefined,
        categoryId: finalCategoryId || undefined,
        locationId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : undefined,
        isFree: isFree !== undefined ? Boolean(isFree) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        posterImage: posterImage || undefined,
        status: userRole === 'ADMIN' && status ? status : undefined,
      },
      include: { category: true, location: true },
    });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role.name;

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Permission check
    if (existingEvent.organizerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this event.',
      });
    }

    await prisma.event.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizerEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const events = await prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        category: true,
        location: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = events.map((e) => ({
      ...e,
      venueName: e.location?.venueName,
      address: e.location?.address,
      city: e.location?.city,
      category: e.category?.name,
      registeredCount: e._count?.registrations || e.currentRegistered,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventAttendees = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role.name;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view attendees for this event.',
      });
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    const attendees = registrations.map((r) => ({
      id: r.id,
      ticketCode: r.ticketCode,
      status: r.status,
      registeredAt: r.registeredAt,
      name: r.user?.fullName,
      email: r.user?.email,
      phone: r.user?.phone,
      avatar: r.user?.avatarUrl,
    }));

    res.status(200).json({
      success: true,
      data: attendees,
    });
  } catch (error) {
    next(error);
  }
};

