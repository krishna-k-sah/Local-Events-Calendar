import prisma from '../config/db.js';

export const getOrganizerAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;

    // Filter events by organizer unless Admin
    const whereEvent = userRole === 'ADMIN' ? {} : { organizerId: userId };

    const events = await prisma.event.findMany({
      where: whereEvent,
      include: {
        category: true,
        location: true,
        registrations: {
          include: { attendance: true },
        },
        waitlists: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEvents = events.length;
    let totalCapacity = 0;
    let totalConfirmedRegistrations = 0;
    let totalCancelledRegistrations = 0;
    let totalAllRegistrations = 0;
    let totalUniqueCheckins = 0;
    let totalActiveWaitlisted = 0;
    let totalEligibleWaitlist = 0;
    let totalWaitlistPromoted = 0;

    const categoryMap = {};
    const registrationTrendMap = {};

    const eventPerformance = events.map((evt) => {
      totalCapacity += Math.max(0, evt.maxCapacity || 0);

      const allRegs = evt.registrations || [];
      const confirmedRegs = allRegs.filter((r) => r.status === 'CONFIRMED' || r.status === 'ATTENDED');
      const cancelledRegs = allRegs.filter((r) => r.status === 'CANCELLED');
      const checkedInRegs = confirmedRegs.filter((r) => r.attendance || r.status === 'ATTENDED');

      const allWaitlist = evt.waitlists || [];
      const activeWaitlist = allWaitlist.filter((w) => w.status === 'PENDING' || w.status === 'OFFERED');
      // Eligible waitlisted users under immediate auto-confirmation model: users who were promoted (ACCEPTED) or currently waiting (PENDING)
      const eligibleWaitlist = allWaitlist.filter((w) => w.status === 'ACCEPTED' || w.status === 'PENDING');
      const promotedWaitlist = allWaitlist.filter((w) => w.status === 'ACCEPTED');

      const cohortTotalRegistrations = confirmedRegs.length + cancelledRegs.length;

      totalConfirmedRegistrations += confirmedRegs.length;
      totalCancelledRegistrations += cancelledRegs.length;
      totalAllRegistrations += cohortTotalRegistrations;
      totalUniqueCheckins += checkedInRegs.length;
      totalActiveWaitlisted += activeWaitlist.length;
      totalEligibleWaitlist += eligibleWaitlist.length;
      totalWaitlistPromoted += promotedWaitlist.length;

      // Group by category
      const catName = evt.category?.name || 'Uncategorized';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, events: 0, attendees: 0 };
      }
      categoryMap[catName].events += 1;
      categoryMap[catName].attendees += confirmedRegs.length;

      // Daily registration trend (last 30 days)
      confirmedRegs.forEach((r) => {
        const dateKey = new Date(r.registeredAt).toISOString().split('T')[0];
        registrationTrendMap[dateKey] = (registrationTrendMap[dateKey] || 0) + 1;
      });

      // Strict Zero-Division Guards & Formula Compliance
      const capacityUtilization =
        evt.maxCapacity > 0
          ? Math.round((confirmedRegs.length / evt.maxCapacity) * 100)
          : 0;

      const attendanceRate =
        confirmedRegs.length > 0
          ? Math.round((checkedInRegs.length / confirmedRegs.length) * 100)
          : 0;

      const cancellationRate =
        cohortTotalRegistrations > 0
          ? Math.round((cancelledRegs.length / cohortTotalRegistrations) * 100)
          : 0;

      const waitlistPromotionRate =
        eligibleWaitlist.length > 0
          ? Math.round((promotedWaitlist.length / eligibleWaitlist.length) * 100)
          : 0;

      return {
        id: evt.id,
        title: evt.title,
        startDate: evt.startDate,
        status: evt.status,
        maxCapacity: evt.maxCapacity,
        registeredCount: confirmedRegs.length,
        cancelledCount: cancelledRegs.length,
        attendedCount: checkedInRegs.length,
        waitlistCount: activeWaitlist.length,
        capacityUtilization,
        eventFillRate: capacityUtilization,
        attendanceRate,
        cancellationRate,
        waitlistPromotionRate,
        waitlistConversionRate: waitlistPromotionRate,
        category: evt.category?.name,
      };
    });

    // Overall Aggregate Metrics with Strict Zero-Division Protection
    const overallCapacityUtilization =
      totalCapacity > 0
        ? Math.round((totalConfirmedRegistrations / totalCapacity) * 100)
        : 0;

    const overallAttendanceRate =
      totalConfirmedRegistrations > 0
        ? Math.round((totalUniqueCheckins / totalConfirmedRegistrations) * 100)
        : 0;

    const overallCancellationRate =
      totalAllRegistrations > 0
        ? Math.round((totalCancelledRegistrations / totalAllRegistrations) * 100)
        : 0;

    const overallWaitlistPromotionRate =
      totalEligibleWaitlist > 0
        ? Math.round((totalWaitlistPromoted / totalEligibleWaitlist) * 100)
        : 0;

    // Convert trend map to array
    const registrationTrends = Object.entries(registrationTrendMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Category distribution array
    const categoryDistribution = Object.values(categoryMap);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEvents,
          totalCapacity,
          totalRegistered: totalConfirmedRegistrations,
          totalCancelled: totalCancelledRegistrations,
          totalAttended: totalUniqueCheckins,
          totalWaitlisted: totalActiveWaitlisted,
          capacityUtilization: overallCapacityUtilization,
          eventFillRate: overallCapacityUtilization,
          attendanceRate: overallAttendanceRate,
          cancellationRate: overallCancellationRate,
          waitlistPromotionRate: overallWaitlistPromotionRate,
          waitlistConversionRate: overallWaitlistPromotionRate,
          registrationConversionRate: {
            available: false,
            value: null,
            reason: 'Requires page-level unique visitor tracking telemetry.',
          },
        },
        eventPerformance,
        registrationTrends,
        categoryDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};
