import type { AuthUser } from "../modules/auth/auth.types";

declare global {
  namespace Express {
    interface Request {
      // Set by the requireAuth middleware once a valid session is found.
      user?: AuthUser;
    }
  }
}

export {};
