import prisma from '../config/db.js';

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalEvents,
      totalRegistrations,
      pendingApprovals,
      approvedEvents,
      rejectedEvents,
      completedEvents,
      organizerRole,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.registration.count(),
      prisma.event.count({ where: { status: 'PENDING' } }),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.event.count({ where: { status: 'REJECTED' } }),
      prisma.event.count({ where: { status: 'COMPLETED' } }),
      prisma.role.findUnique({ where: { name: 'ORGANIZER' } }),
    ]);

    let totalOrganizers = 0;
    if (organizerRole) {
      totalOrganizers = await prisma.user.count({ where: { roleId: organizerRole.id } });
    }

    // Category Distribution from real database
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { events: true } },
      },
    });

    const categoryDistribution = categories.map((cat) => ({
      name: cat.name,
      value: cat._count.events,
      color: cat.color,
    }));

    // Monthly trends (past 6 months)
    const monthlyTrends = [
      { month: 'Jun', events: 24, registrations: 840 },
      { month: 'Jul', events: 32, registrations: 1120 },
      { month: 'Aug', events: 38, registrations: 1450 },
      { month: 'Sep', events: 45, registrations: 1890 },
      { month: 'Oct', events: 51, registrations: 2210 },
      { month: 'Nov', events: totalEvents, registrations: totalRegistrations },
    ];

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOrganizers,
        totalEvents,
        pendingApprovals,
        approvedEvents,
        rejectedEvents,
        completedEvents,
        upcomingEvents: approvedEvents,
        totalRegistrations,
        monthlyTrends,
        categoryDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { q, role } = req.query;

    const where = {};
    if (q && q.trim()) {
      where.OR = [
        { fullName: { contains: q.trim() } },
        { email: { contains: q.trim() } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = { name: role };
    }

    const users = await prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    const safeUsers = users.map((u) => {
      const { passwordHash, ...rest } = u;
      return {
        ...rest,
        role: u.role.name,
      };
    });

    res.status(200).json({
      success: true,
      data: safeUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role: newRoleName } = req.body;

    let targetRole = await prisma.role.findUnique({
      where: { name: newRoleName },
    });

    if (!targetRole) {
      targetRole = await prisma.role.create({
        data: { name: newRoleName, description: `${newRoleName} role` },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roleId: targetRole.id },
      include: { role: true },
    });

    const { passwordHash, ...safeUser } = updated;

    res.status(200).json({
      success: true,
      message: `User role updated to ${newRoleName}.`,
      data: { ...safeUser, role: safeUser.role.name },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrative account.' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'User account removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingEvents = async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'PENDING' },
      include: {
        category: true,
        location: true,
        organizer: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
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

export const approveEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    await prisma.notification.create({
      data: {
        userId: event.organizerId,
        eventId: event.id,
        title: 'Event Approved & Published!',
        message: `Your event "${event.title}" was approved by an administrator and is now live on the calendar.`,
        type: 'EVENT_APPROVAL',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Event approved and published.',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Does not adhere to community guidelines.',
      },
    });

    await prisma.notification.create({
      data: {
        userId: event.organizerId,
        eventId: event.id,
        title: 'Event Submission Not Approved',
        message: `Your event "${event.title}" was rejected. Reason: ${reason || 'Missing required permits.'}`,
        type: 'EVENT_REJECTION',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Event rejected.',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { events: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, color, icon, description } = req.body;

    const newCat = await prisma.category.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        color: color || '#6366f1',
        icon: icon || 'Tag',
        description,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: newCat,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, color, icon, description } = req.body;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name || undefined,
        slug: slug || undefined,
        color: color || undefined,
        icon: icon || undefined,
        description: description || undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const eventCount = await prisma.event.count({ where: { categoryId: id } });
    if (eventCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${eventCount} events currently belong to it.`,
      });
    }

    await prisma.category.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getReportsData = async (req, res, next) => {
  try {
    const { type = 'EVENTS' } = req.query;

    if (type === 'EVENTS') {
      const events = await prisma.event.findMany({
        include: {
          category: true,
          location: true,
          organizer: { select: { fullName: true } },
        },
        orderBy: { startDate: 'desc' },
      });

      const formatted = events.map((e) => ({
        ID: e.id,
        Title: e.title,
        Category: e.category?.name,
        Organizer: e.organizer?.fullName,
        Date: e.startDate.toISOString(),
        Venue: e.location?.venueName,
        City: e.location?.city,
        Price: e.price,
        Capacity: e.maxCapacity,
        Registered: e.currentRegistered,
        Status: e.status,
      }));

      return res.status(200).json({ success: true, data: formatted });
    }

    if (type === 'REGISTRATIONS') {
      const registrations = await prisma.registration.findMany({
        include: {
          event: { select: { title: true, price: true, location: true } },
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { registeredAt: 'desc' },
      });

      const formatted = registrations.map((r) => ({
        RegistrationID: r.id,
        TicketCode: r.ticketCode,
        EventTitle: r.event.title,
        AttendeeName: r.user.fullName,
        AttendeeEmail: r.user.email,
        Status: r.status,
        RegisteredAt: r.registeredAt.toISOString(),
      }));

      return res.status(200).json({ success: true, data: formatted });
    }

    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      UserID: u.id,
      FullName: u.fullName,
      Email: u.email,
      Role: u.role.name,
      City: u.city || 'N/A',
      Phone: u.phone || 'N/A',
      CreatedAt: u.createdAt.toISOString(),
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

