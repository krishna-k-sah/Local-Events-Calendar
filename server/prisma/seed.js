import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.eventReminder.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.eventImage.deleteMany();
  await prisma.event.deleteMany();
  await prisma.location.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // 2. Roles
  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'System Administrator with full governance privileges' },
  });
  const organizerRole = await prisma.role.create({
    data: { name: 'ORGANIZER', description: 'Event host capable of managing listings and attendees' },
  });
  const attendeeRole = await prisma.role.create({
    data: { name: 'ATTENDEE', description: 'Registered user attending and discovering events' },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  // 3. Administrator
  const admin = await prisma.user.create({
    data: {
      fullName: 'Alexander Wright',
      email: 'admin@eventhub.com',
      passwordHash,
      roleId: adminRole.id,
      city: 'San Francisco, CA',
      phone: '+1 (555) 019-2834',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 4. Organizers
  const organizer1 = await prisma.user.create({
    data: {
      fullName: 'Elena Rostova',
      email: 'elena@novatech.io',
      passwordHash,
      roleId: organizerRole.id,
      city: 'San Francisco, CA',
      phone: '+1 (555) 234-8910',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      fullName: 'Marcus Sterling',
      email: 'marcus@soundwave.live',
      passwordHash,
      roleId: organizerRole.id,
      city: 'Seattle, WA',
      phone: '+1 (555) 987-6543',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  const organizer3 = await prisma.user.create({
    data: {
      fullName: 'Sophia Rivera',
      email: 'sophia@summitcreators.com',
      passwordHash,
      roleId: organizerRole.id,
      city: 'Austin, TX',
      phone: '+1 (555) 345-6789',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 5. 10 Attendees
  const attendeeData = [
    { fullName: 'Sarah Jenkins', email: 'sarah.j@gmail.com', city: 'San Francisco, CA' },
    { fullName: 'David Chen', email: 'david.chen@berkeley.edu', city: 'Berkeley, CA' },
    { fullName: 'Alicia Morales', email: 'alicia.m@stripe.com', city: 'San Francisco, CA' },
    { fullName: 'Michael Chang', email: 'm.chang@openai.com', city: 'San Francisco, CA' },
    { fullName: 'Liam O\'Connor', email: 'liam.o@gmail.com', city: 'San Jose, CA' },
    { fullName: 'Emma Watson', email: 'emma.w@outlook.com', city: 'Oakland, CA' },
    { fullName: 'Noah Patel', email: 'noah.patel@gmail.com', city: 'Palo Alto, CA' },
    { fullName: 'Olivia Taylor', email: 'olivia.t@gmail.com', city: 'San Francisco, CA' },
    { fullName: 'James Wilson', email: 'james.w@gmail.com', city: 'Austin, TX' },
    { fullName: 'Ava Martinez', email: 'ava.m@gmail.com', city: 'Seattle, WA' },
  ];

  const attendees = [];
  for (const att of attendeeData) {
    const user = await prisma.user.create({
      data: {
        fullName: att.fullName,
        email: att.email,
        passwordHash,
        roleId: attendeeRole.id,
        city: att.city,
        phone: '+1 (555) 000-' + Math.floor(1000 + Math.random() * 9000),
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
      },
    });
    attendees.push(user);
  }

  // 6. Categories
  const categoriesData = [
    { name: 'Technology & AI', slug: 'tech-ai', color: '#6366f1', icon: 'Cpu' },
    { name: 'Music & Concerts', slug: 'music-concerts', color: '#ec4899', icon: 'Music' },
    { name: 'Business & Networking', slug: 'business-networking', color: '#0ea5e9', icon: 'Briefcase' },
    { name: 'Arts & Culture', slug: 'arts-culture', color: '#f59e0b', icon: 'Palette' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', color: '#10b981', icon: 'Activity' },
    { name: 'Food & Culinary', slug: 'food-culinary', color: '#ef4444', icon: 'Utensils' },
    { name: 'Community & Charity', slug: 'community-charity', color: '#8b5cf6', icon: 'Heart' },
    { name: 'Workshops & Education', slug: 'workshops-education', color: '#14b8a6', icon: 'BookOpen' },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    categories[cat.slug] = await prisma.category.create({ data: cat });
  }

  // 7. Locations
  const locationsData = [
    { venueName: 'Moscone Convention Center', address: '747 Howard St', city: 'San Francisco', state: 'CA', postalCode: '94103' },
    { venueName: 'Pier 39 Amphitheater', address: 'The Embarcadero & Beach St', city: 'San Francisco', state: 'CA', postalCode: '94133' },
    { venueName: 'The Canopy Co-Working Loft', address: '595 Pacific Ave', city: 'San Francisco', state: 'CA', postalCode: '94133' },
    { venueName: 'Museum of Craft & Modern Design', address: '2569 Third St', city: 'San Francisco', state: 'CA', postalCode: '94107' },
    { venueName: 'Crissy Field East Beach', address: '1199 E Beach', city: 'San Francisco', state: 'CA', postalCode: '94129' },
  ];

  const locations = [];
  for (const loc of locationsData) {
    locations.push(await prisma.location.create({ data: loc }));
  }

  // 8. 20 Sample Events
  const rawEvents = [
    {
      title: 'Global AI & Deep Learning Summit 2026',
      description: 'Join world-leading researchers, engineers, and tech founders for three days of deep technical breakthroughs, workshops, and high-impact networking in generative AI and robotics.',
      categorySlug: 'tech-ai',
      organizer: organizer1,
      location: locations[0],
      startDate: new Date('2026-11-18T09:00:00Z'),
      endDate: new Date('2026-11-20T17:00:00Z'),
      registrationDeadline: new Date('2026-11-16T23:59:59Z'),
      maxCapacity: 600,
      currentRegistered: 4,
      price: 299,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: true,
      posterImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Downtown Indie Jazz & Sunset Sessions',
      description: 'An open-air evening celebrating contemporary jazz quartets, soul improvisations, craft beverages, and artisan food trucks right by the marina waterfront.',
      categorySlug: 'music-concerts',
      organizer: organizer2,
      location: locations[1],
      startDate: new Date('2026-11-22T18:00:00Z'),
      endDate: new Date('2026-11-22T23:00:00Z'),
      registrationDeadline: new Date('2026-11-21T18:00:00Z'),
      maxCapacity: 250,
      currentRegistered: 3,
      price: 35,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: true,
      posterImage: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Founders & Angel Investors Networking Breakfast',
      description: 'Curated morning mastermind bringing together pre-seed and Series A founders with prominent angel syndicates, venture partners, and operators.',
      categorySlug: 'business-networking',
      organizer: organizer1,
      location: locations[2],
      startDate: new Date('2026-11-15T08:30:00Z'),
      endDate: new Date('2026-11-15T11:30:00Z'),
      registrationDeadline: new Date('2026-11-14T20:00:00Z'),
      maxCapacity: 80,
      currentRegistered: 2,
      price: 0,
      isFree: true,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Contemporary Glass Sculpture & Ceramic Exhibition',
      description: 'Explore breathtaking light refractions and avant-garde ceramic forms created by 30 renowned contemporary Pacific Rim artists.',
      categorySlug: 'arts-culture',
      organizer: organizer2,
      location: locations[3],
      startDate: new Date('2026-11-25T10:00:00Z'),
      endDate: new Date('2026-11-28T19:00:00Z'),
      registrationDeadline: new Date('2026-11-24T23:59:59Z'),
      maxCapacity: 400,
      currentRegistered: 1,
      price: 15,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Metro 10K Charity Run & Wellness Festival',
      description: 'Scenic community run across the Golden Gate approach followed by a wellness fair featuring recovery lounges, nutrition bars, and family activities.',
      categorySlug: 'sports-fitness',
      organizer: organizer3,
      location: locations[4],
      startDate: new Date('2026-11-29T07:00:00Z'),
      endDate: new Date('2026-11-29T13:00:00Z'),
      registrationDeadline: new Date('2026-11-27T18:00:00Z'),
      maxCapacity: 1200,
      currentRegistered: 2,
      price: 25,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: true,
      posterImage: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Artisan Sourdough & Pastry Masterclass',
      description: 'Hands-on bread baking workshop teaching wild yeast management, high-hydration sourdough folding techniques, and stone-deck hearth baking.',
      categorySlug: 'food-culinary',
      organizer: organizer2,
      location: locations[2],
      startDate: new Date('2026-12-05T11:00:00Z'),
      endDate: new Date('2026-12-05T15:30:00Z'),
      registrationDeadline: new Date('2026-12-01T23:59:59Z'),
      maxCapacity: 20,
      currentRegistered: 0,
      price: 85,
      isFree: false,
      status: 'PENDING',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'NextGen Cloud Architecture & Microservices',
      description: 'Technical deep dive into event-driven serverless architectures, distributed tracing, and zero-trust security postures.',
      categorySlug: 'tech-ai',
      organizer: organizer1,
      location: locations[0],
      startDate: new Date('2026-12-10T10:00:00Z'),
      endDate: new Date('2026-12-10T16:00:00Z'),
      registrationDeadline: new Date('2026-12-08T18:00:00Z'),
      maxCapacity: 300,
      currentRegistered: 0,
      price: 49,
      isFree: false,
      status: 'PENDING',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Community Tree Planting & Green Park Initiative',
      description: 'Help revitalize city parks by planting 500 indigenous trees. Shovels, gloves, water, and lunch provided for all volunteers.',
      categorySlug: 'community-charity',
      organizer: organizer3,
      location: locations[4],
      startDate: new Date('2026-12-12T08:30:00Z'),
      endDate: new Date('2026-12-12T13:00:00Z'),
      registrationDeadline: new Date('2026-12-11T12:00:00Z'),
      maxCapacity: 150,
      currentRegistered: 0,
      price: 0,
      isFree: true,
      status: 'PUBLISHED',
      isFeatured: true,
      posterImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Full-Stack TypeScript & React 19 Bootcamp',
      description: 'Intensive weekend code lab covering React Server Components, Next.js App Router, Prisma ORM, and automated end-to-end testing.',
      categorySlug: 'workshops-education',
      organizer: organizer1,
      location: locations[2],
      startDate: new Date('2026-12-14T09:00:00Z'),
      endDate: new Date('2026-12-15T17:00:00Z'),
      registrationDeadline: new Date('2026-12-12T23:59:59Z'),
      maxCapacity: 45,
      currentRegistered: 0,
      price: 120,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Winter Chamber Music Festival: Vivaldi & Bach',
      description: 'Acoustic concert performed by the Pacific Virtuosi string ensemble in an intimate historic hall with candlelight ambiance.',
      categorySlug: 'music-concerts',
      organizer: organizer2,
      location: locations[3],
      startDate: new Date('2026-12-18T19:30:00Z'),
      endDate: new Date('2026-12-18T22:00:00Z'),
      registrationDeadline: new Date('2026-12-17T20:00:00Z'),
      maxCapacity: 180,
      currentRegistered: 0,
      price: 45,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Bay Area Youth Soccer Cup Finals',
      description: 'Championship matches across youth divisions featuring local league teams, trophy ceremonies, and food truck stands.',
      categorySlug: 'sports-fitness',
      organizer: organizer3,
      location: locations[4],
      startDate: new Date('2026-12-19T09:00:00Z'),
      endDate: new Date('2026-12-19T16:00:00Z'),
      registrationDeadline: new Date('2026-12-18T18:00:00Z'),
      maxCapacity: 500,
      currentRegistered: 0,
      price: 10,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Craft Beer & Artisan Cheese Tasting Fair',
      description: 'Sample over 40 award-winning craft ales paired with aged farmstead cheeses curated by certified cheese mongers and brewmasters.',
      categorySlug: 'food-culinary',
      organizer: organizer2,
      location: locations[1],
      startDate: new Date('2026-12-20T14:00:00Z'),
      endDate: new Date('2026-12-20T19:00:00Z'),
      registrationDeadline: new Date('2026-12-19T12:00:00Z'),
      maxCapacity: 300,
      currentRegistered: 0,
      price: 55,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: true,
      posterImage: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Venture Capital Demo Day & Pitch Competition',
      description: 'Ten selected seed-stage tech ventures pitch on stage in front of 40 active venture capital partners for $250k in prize investment capital.',
      categorySlug: 'business-networking',
      organizer: organizer1,
      location: locations[0],
      startDate: new Date('2026-12-21T13:00:00Z'),
      endDate: new Date('2026-12-21T18:00:00Z'),
      registrationDeadline: new Date('2026-12-19T23:59:59Z'),
      maxCapacity: 250,
      currentRegistered: 0,
      price: 0,
      isFree: true,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Live Street Art & Mural Showcase',
      description: 'Watch renowned street artists transform industrial shipping containers into vibrant public art murals in real-time with DJ sets and live music.',
      categorySlug: 'arts-culture',
      organizer: organizer3,
      location: locations[1],
      startDate: new Date('2026-12-22T12:00:00Z'),
      endDate: new Date('2026-12-22T18:00:00Z'),
      registrationDeadline: new Date('2026-12-21T12:00:00Z'),
      maxCapacity: 600,
      currentRegistered: 0,
      price: 0,
      isFree: true,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Holiday Charity Toy Drive & Gift Wrapping',
      description: 'Annual volunteer celebration wrapping toys and books for local children shelters and hospitals before Christmas morning.',
      categorySlug: 'community-charity',
      organizer: organizer3,
      location: locations[2],
      startDate: new Date('2026-12-23T10:00:00Z'),
      endDate: new Date('2026-12-23T15:00:00Z'),
      registrationDeadline: new Date('2026-12-22T18:00:00Z'),
      maxCapacity: 100,
      currentRegistered: 0,
      price: 0,
      isFree: true,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'New Year Eve Community Drone Light Spectacle',
      description: 'Count down to 2027 with 1,000 synchronized illuminated drones performing geometric choreographies over the bay waters.',
      categorySlug: 'community-charity',
      organizer: organizer2,
      location: locations[1],
      startDate: new Date('2026-12-31T21:00:00Z'),
      endDate: new Date('2027-01-01T00:30:00Z'),
      registrationDeadline: new Date('2026-12-30T23:59:59Z'),
      maxCapacity: 2000,
      currentRegistered: 0,
      price: 0,
      isFree: true,
      status: 'PUBLISHED',
      isFeatured: true,
      posterImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Mindfulness Meditation & Sound Bath Experience',
      description: 'Restorative 90-minute immersion with Tibetan singing bowls, gong resonances, and guided breathwork designed for deep nervous system relaxation.',
      categorySlug: 'sports-fitness',
      organizer: organizer3,
      location: locations[3],
      startDate: new Date('2027-01-03T10:00:00Z'),
      endDate: new Date('2027-01-03T11:30:00Z'),
      registrationDeadline: new Date('2027-01-02T18:00:00Z'),
      maxCapacity: 40,
      currentRegistered: 0,
      price: 30,
      isFree: false,
      status: 'PUBLISHED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Product Design & UX Research Sprint',
      description: 'Collaborative workshop on usability testing methodologies, design heuristics, user interviews, and rapid Figma prototyping.',
      categorySlug: 'workshops-education',
      organizer: organizer1,
      location: locations[2],
      startDate: new Date('2027-01-08T09:30:00Z'),
      endDate: new Date('2027-01-08T16:30:00Z'),
      registrationDeadline: new Date('2027-01-06T20:00:00Z'),
      maxCapacity: 50,
      currentRegistered: 0,
      price: 75,
      isFree: false,
      status: 'DRAFT',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Neon Nights Electro Synthwave Dance Party',
      description: 'Retro 80s synthwave DJs, laser mapping, neon face paint, and craft cocktails celebrating electronic retro-futurism.',
      categorySlug: 'music-concerts',
      organizer: organizer2,
      location: locations[1],
      startDate: new Date('2027-01-09T21:00:00Z'),
      endDate: new Date('2027-01-10T02:00:00Z'),
      registrationDeadline: new Date('2027-01-09T18:00:00Z'),
      maxCapacity: 350,
      currentRegistered: 0,
      price: 20,
      isFree: false,
      status: 'REJECTED',
      rejectionReason: 'Sound permit not verified by venue city authority.',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Past Community Hackathon 2026',
      description: 'Historical 48-hour civic hackathon building open data tools for local transportation and homeless outreach services.',
      categorySlug: 'tech-ai',
      organizer: organizer1,
      location: locations[0],
      startDate: new Date('2026-10-01T09:00:00Z'),
      endDate: new Date('2026-10-02T18:00:00Z'),
      registrationDeadline: new Date('2026-09-28T23:59:59Z'),
      maxCapacity: 200,
      currentRegistered: 180,
      price: 0,
      isFree: true,
      status: 'COMPLETED',
      isFeatured: false,
      posterImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
    },
  ];

  const createdEvents = [];
  for (const item of rawEvents) {
    const evt = await prisma.event.create({
      data: {
        title: item.title,
        description: item.description,
        categoryId: categories[item.categorySlug].id,
        organizerId: item.organizer.id,
        locationId: item.location.id,
        startDate: item.startDate,
        endDate: item.endDate,
        registrationDeadline: item.registrationDeadline,
        maxCapacity: item.maxCapacity,
        currentRegistered: item.currentRegistered,
        price: item.price,
        isFree: item.isFree,
        status: item.status,
        rejectionReason: item.rejectionReason || null,
        isFeatured: item.isFeatured,
        posterImage: item.posterImage,
        contactEmail: item.organizer.email,
        contactPhone: item.organizer.phone,
      },
    });
    createdEvents.push(evt);
  }

  // 9. Sample Registrations
  const firstEvent = createdEvents[0];
  const secondEvent = createdEvents[1];
  const thirdEvent = createdEvents[2];

  for (let i = 0; i < 4; i++) {
    await prisma.registration.create({
      data: {
        eventId: firstEvent.id,
        userId: attendees[i].id,
        ticketCode: `EVT-${firstEvent.id.substring(0, 4).toUpperCase()}-${1000 + i}`,
        status: 'CONFIRMED',
      },
    });
  }

  for (let i = 0; i < 3; i++) {
    await prisma.registration.create({
      data: {
        eventId: secondEvent.id,
        userId: attendees[i].id,
        ticketCode: `EVT-${secondEvent.id.substring(0, 4).toUpperCase()}-${2000 + i}`,
        status: 'CONFIRMED',
      },
    });
  }

  for (let i = 0; i < 2; i++) {
    await prisma.registration.create({
      data: {
        eventId: thirdEvent.id,
        userId: attendees[i].id,
        ticketCode: `EVT-${thirdEvent.id.substring(0, 4).toUpperCase()}-${3000 + i}`,
        status: 'CONFIRMED',
      },
    });
  }

  // 10. Sample Favorites
  await prisma.favorite.create({
    data: {
      userId: attendees[0].id,
      eventId: firstEvent.id,
    },
  });
  await prisma.favorite.create({
    data: {
      userId: attendees[0].id,
      eventId: secondEvent.id,
    },
  });

  // 11. Sample Notifications
  await prisma.notification.create({
    data: {
      userId: attendees[0].id,
      eventId: firstEvent.id,
      title: 'Registration Confirmed!',
      message: `Your reservation for "${firstEvent.title}" has been issued. Ticket #${firstEvent.id.substring(0, 4).toUpperCase()}-1000.`,
      type: 'REGISTRATION_SUCCESS',
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: organizer1.id,
      eventId: firstEvent.id,
      title: 'Event Approved by Administrator',
      message: `Your event "${firstEvent.title}" has been approved and published to the live public calendar.`,
      type: 'EVENT_APPROVAL',
      isRead: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: attendees[0].id,
      eventId: thirdEvent.id,
      title: 'Event Reminder: Upcoming in 6 Days',
      message: `Reminder: "${thirdEvent.title}" starts soon at ${locations[2].venueName}.`,
      type: 'REMINDER',
      isRead: false,
    },
  });

  console.log('✅ Database successfully seeded with 1 Admin, 3 Organizers, 10 Attendees, 8 Categories, 5 Locations, and 20 Events!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

