import prisma from '../config/db.js';

export const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        event: {
          include: { category: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const eventIds = favorites.map((f) => f.eventId);
    const events = favorites.map((f) => ({
      ...f.event,
      venueName: f.event.location?.venueName,
      address: f.event.location?.address,
      city: f.event.location?.city,
      category: f.event.category?.name,
    }));

    res.status(200).json({
      success: true,
      data: {
        favoriteIds: eventIds,
        events,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      return res.status(200).json({
        success: true,
        message: 'Event removed from saved favorites.',
        isFavorited: false,
      });
    } else {
      await prisma.favorite.create({
        data: { userId, eventId },
      });
      return res.status(200).json({
        success: true,
        message: 'Event saved to favorites.',
        isFavorited: true,
      });
    }
  } catch (error) {
    next(error);
  }
};

