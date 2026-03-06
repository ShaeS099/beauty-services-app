import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Augment Express.Request with the Firebase decoded auth token.
 *
 * Keeping this in a dedicated `.d.ts` file ensures the type is available
 * everywhere without requiring a runtime import.
 */
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

export {};
