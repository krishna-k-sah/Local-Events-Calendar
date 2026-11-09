import crypto from 'crypto';

/**
 * Generates a cryptographically secure, high-entropy ticket code.
 *
 * Entropy specification:
 * - 12 bytes from Node.js CSPRNG (crypto.randomBytes) => 96 bits of entropy.
 * - Format: EVT-XXXXXX-XXXXXX-XXXXXX-XXXXXX (24 uppercase hexadecimal characters)
 * - Search space: 2^96 = ~7.92 x 10^28 unique combinations.
 * - Does not embed internal database IDs, user IDs, or PII.
 *
 * Collision Handling:
 * - Verifies candidate ticket code against tx.registration.findUnique.
 * - In the rare event of a database collision, retries up to maxAttempts with fresh entropy.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx - Active Prisma transaction client
 * @param {number} maxAttempts - Maximum generation retry attempts (default: 5)
 * @returns {Promise<string>} The unique, verified ticket code
 */
export async function generateSecureTicketCode(tx, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rawBytes = crypto.randomBytes(12).toString('hex').toUpperCase();
    const candidate = `EVT-${rawBytes.slice(0, 6)}-${rawBytes.slice(6, 12)}-${rawBytes.slice(12, 18)}-${rawBytes.slice(18, 24)}`;

    // Ensure database uniqueness within transaction
    const existing = await tx.registration.findUnique({
      where: { ticketCode: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('TICKET_COLLISION_EXHAUSTED: Exceeded maximum attempts to generate a collision-free ticket code.');
}

