import { UserAttributes } from "./models/user.model";

// Extending Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      currentUser?: UserAttributes;
    }
  }
}
