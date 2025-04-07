import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { ForbiddenError, UnauthorizedError } from "../types/errors";

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Middleware to authenticate JWT token
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authorization token is required");
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_jwt_secret_key"
      ) as UserPayload;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedError("Invalid or expired token");
    }

    // Attach user to request
    req.user = decoded;

    // Fetch user from database (optional, depending on your needs)
    const user = await User.findByPk(decoded.id);

    if (!user || !user.get("active")) {
      throw new UnauthorizedError("User not found or inactive");
    }

    req.currentUser = user.get();

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError("Not authorized to access this resource");
    }

    next();
  };
};
