import { z } from 'zod';

export const createEventSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    categoryId: z.string().min(1, 'Category is required'),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Valid start date is required',
    }),
    endDate: z.string().optional().nullable().refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid end date',
    }),
    registrationDeadline: z.string().optional().nullable().refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid registration deadline date',
    }),
    venueName: z.string().min(2, 'Venue name is required'),
    address: z.string().min(2, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    maxCapacity: z.coerce.number().int('Capacity must be an integer').min(1, 'Capacity must be at least 1').default(100),
    isFree: z.coerce.boolean().default(true),
    price: z.coerce.number().min(0, 'Price cannot be negative').default(0),
    contactEmail: z.string().email('Invalid contact email').optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    posterImage: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // Validate start date is not in the past (allowing 5 min grace period for clock drift)
      const now = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(data.startDate) >= now;
    },
    {
      message: 'Event start date cannot be in the past',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: 'Event end date must be on or after the start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (!data.registrationDeadline) return true;
      return new Date(data.registrationDeadline) <= new Date(data.startDate);
    },
    {
      message: 'Registration deadline cannot be after the event start date',
      path: ['registrationDeadline'],
    }
  )
  .refine(
    (data) => {
      if (!data.isFree && Number(data.price) <= 0) {
        return false;
      }
      return true;
    },
    {
      message: 'Paid events must have a ticket price greater than 0',
      path: ['price'],
    }
  );

export const updateEventSchema = z
  .object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).optional(),
    categoryId: z.string().min(1).optional(),
    startDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid start date' }).optional(),
    endDate: z.string().optional().nullable().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid end date' }),
    registrationDeadline: z.string().optional().nullable().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid deadline' }),
    venueName: z.string().min(2).optional(),
    address: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    maxCapacity: z.coerce.number().int().min(1).optional(),
    isFree: z.coerce.boolean().optional(),
    price: z.coerce.number().min(0).optional(),
    contactEmail: z.string().email().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    posterImage: z.string().optional().nullable(),
    status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'Event end date must be on or after start date',
      path: ['endDate'],
    }
  );
