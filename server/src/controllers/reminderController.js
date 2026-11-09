import { processEventReminders } from '../services/reminderService.js';
import prisma from '../config/db.js';

export const triggerReminders = async (req, res, next) => {
  try {
    const summary = await processEventReminders();
    res.status(200).json({
      success: true,
      message: 'Automated event reminder processing complete.',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getRemindersHistory = async (req, res, next) => {
  try {
    const totalSent = await prisma.eventReminder.count({ where: { status: 'SENT' } });
    const recent = await prisma.eventReminder.findMany({
      take: 20,
      orderBy: { sentAt: 'desc' },
      include: {
        event: { select: { title: true, startDate: true } },
        user: { select: { fullName: true, email: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        totalSent,
        recent,
      },
    });
  } catch (error) {
    next(error);
  }
};

