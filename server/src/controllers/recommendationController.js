import prisma from '../config/db.js';

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_RECOMMENDATION_DISTANCE_KM = 50;

/**
 * Calculates great-circle distance between two geographic coordinates using Haversine formula.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Computes normalized recommendation score S in range [0, 100]
 * Formula: S = 0.40*C + 0.25*G + 0.20*P + 0.15*T
 */
export const computeRecommendationScore = ({
  categoryBookings = 0,
  categoryFavorites = 0,
  userLat = null,
  userLng = null,
  venueLat = null,
  venueLng = null,
  userCity = null,
  venueCity = null,
  confirmedRegistrations = 0,
  maxCapacity = 100,
  startDate = new Date(),
  now = new Date(),
  maxDistanceKm = DEFAULT_MAX_RECOMMENDATION_DISTANCE_KM,
}) => {
  // 1. Category Affinity Score C = min(100, 3*B + 2*F)
  const rawC = 3 * categoryBookings + 2 * categoryFavorites;
  const C = Math.min(100, Math.max(0, rawC));

  // 2. Geographic Relevance Score G
  let G = 0;
  let distanceKm = null;
  if (
    userLat !== null &&
    userLng !== null &&
    venueLat !== null &&
    venueLng !== null &&
    !isNaN(userLat) &&
    !isNaN(userLng) &&
    !isNaN(venueLat) &&
    !isNaN(venueLng)
  ) {
    distanceKm = calculateHaversineDistance(userLat, userLng, venueLat, venueLng);
    G = 100 * Math.max(0, 1 - distanceKm / maxDistanceKm);
  } else if (userCity && venueCity && userCity.trim().toLowerCase() === venueCity.trim().toLowerCase()) {
    // Explicitly documented City Fallback
    G = 100;
  }

  // 3. Popularity Score P = min(100, Fill Ratio)
  let P = 0;
  if (maxCapacity > 0) {
    const fillRatio = (confirmedRegistrations / maxCapacity) * 100;
    P = Math.min(100, Math.max(0, fillRatio));
  }

  // 4. Temporal Relevance Score T = 100 * max(0, 1 - deltaDays / 10)
  const eventStartTime = new Date(startDate).getTime();
  const currentTime = new Date(now).getTime();
  const deltaDays = (eventStartTime - currentTime) / (1000 * 86400);

  let T = 0;
  if (deltaDays >= 0 && deltaDays <= 10) {
    T = 100 * Math.max(0, 1 - deltaDays / 10);
  }

  // Final Weighted Total Score S in [0, 100]
  const totalScore = 0.4 * C + 0.25 * G + 0.2 * P + 0.15 * T;
  const normalizedS = Math.round(Math.min(100, Math.max(0, totalScore)));

  return {
    S: normalizedS,
    C: Math.round(C),
    G: Math.round(G),
    P: Math.round(P),
    T: Math.round(T),
    distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
    deltaDays: Math.max(0, Math.round(deltaDays * 10) / 10),
  };
};

export const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const now = new Date();

    // 1. Fetch upcoming published events (strictly excluding cancelled or expired events)
    const candidateEvents = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gte: now },
      },
      include: {
        category: true,
        location: true,
        organizer: { select: { fullName: true } },
        _count: { select: { registrations: true, favorites: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    if (!userId) {
      // Unauthenticated visitor: Normalized composite based on Popularity (55%) and Temporal (45%)
      const scored = candidateEvents
        .map((evt) => {
          const registered = evt._count.registrations || evt.currentRegistered;
          const { P, T } = computeRecommendationScore({
            confirmedRegistrations: registered,
            maxCapacity: evt.maxCapacity,
            startDate: evt.startDate,
            now,
          });

          const unauthScore = Math.round(0.55 * P + 0.45 * T);
          let reason = 'Trending in Community';
          if (P >= 80) reason = 'Almost Full!';
          else if (evt.isFeatured) reason = 'Featured Staff Pick';
          else if (T >= 70) reason = 'Happening This Week';

          return {
            ...evt,
            registeredCount: registered,
            venueName: evt.location?.venueName,
            address: evt.location?.address,
            city: evt.location?.city,
            category: evt.category?.name,
            recommendationScore: unauthScore,
            recommendationReason: reason,
          };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 6);

      return res.status(200).json({
        success: true,
        data: scored,
      });
    }

    // 2. Authenticated user profile and historical affinity
    const [user, userRegistrations, userFavorites] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.registration.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        include: { event: { select: { categoryId: true } } },
      }),
      prisma.favorite.findMany({
        where: { userId },
        include: { event: { select: { categoryId: true } } },
      }),
    ]);

    const registeredEventIds = new Set(userRegistrations.map((r) => r.eventId));
    const userCity = user?.city?.trim() || null;

    // Build category booking and favorite count dictionaries
    const categoryBookingsMap = {};
    const categoryFavoritesMap = {};

    for (const r of userRegistrations) {
      const cId = r.event?.categoryId;
      if (cId) categoryBookingsMap[cId] = (categoryBookingsMap[cId] || 0) + 1;
    }
    for (const f of userFavorites) {
      const cId = f.event?.categoryId;
      if (cId) categoryFavoritesMap[cId] = (categoryFavoritesMap[cId] || 0) + 1;
    }

    // Score and filter eligible candidates
    const scoredCandidates = candidateEvents
      .filter((e) => !registeredEventIds.has(e.id) && e.organizerId !== userId)
      .map((e) => {
        const catBookings = categoryBookingsMap[e.categoryId] || 0;
        const catFavorites = categoryFavoritesMap[e.categoryId] || 0;
        const registered = e._count?.registrations || e.currentRegistered;

        const breakdown = computeRecommendationScore({
          categoryBookings: catBookings,
          categoryFavorites: catFavorites,
          userCity,
          venueCity: e.location?.city || null,
          venueLat: e.location?.latitude || null,
          venueLng: e.location?.longitude || null,
          confirmedRegistrations: registered,
          maxCapacity: e.maxCapacity,
          startDate: e.startDate,
          now,
        });

        // Determine honest explainable reason based on highest weighted contributor
        const weightedC = 0.4 * breakdown.C;
        const weightedG = 0.25 * breakdown.G;
        const weightedP = 0.2 * breakdown.P;
        const weightedT = 0.15 * breakdown.T;

        let bestReason = 'Recommended for you';
        const maxContribution = Math.max(weightedC, weightedG, weightedP, weightedT);

        if (maxContribution === weightedC && breakdown.C > 0) {
          bestReason = `Because you like ${e.category?.name || 'this category'}`;
        } else if (maxContribution === weightedG && breakdown.G > 0) {
          bestReason = `Popular near you in ${e.location?.city || 'your area'}`;
        } else if (maxContribution === weightedP && breakdown.P >= 60) {
          bestReason = 'Fast Selling & Highly Anticipated';
        } else if (maxContribution === weightedT && breakdown.T > 0) {
          bestReason = breakdown.deltaDays <= 2 ? 'Starting Soon' : 'Happening This Week';
        }

        return {
          ...e,
          registeredCount: registered,
          venueName: e.location?.venueName,
          address: e.location?.address,
          city: e.location?.city,
          category: e.category?.name,
          recommendationScore: breakdown.S,
          recommendationReason: bestReason,
          scoringBreakdown: breakdown,
        };
      });

    scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);

    res.status(200).json({
      success: true,
      data: scoredCandidates.slice(0, 6),
    });
  } catch (error) {
    next(error);
  }
};
