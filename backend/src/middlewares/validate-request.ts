import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { ValidationError } from "../types/errors";

/**
 * Middleware to validate request using express-validator
 */
export const validateRequest = (
  req: Request,
  _: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.error({ errors: errors.array() });
    // Convert errors to a more user-friendly format
    const errorDetails: Record<string, string> = {};

    errors.array().forEach((error) => {
      if (error.type === "field") {
        errorDetails[error.path] = error.msg;
      }
    });

    throw new ValidationError("Validation failed", errorDetails);
  }

  next();
};
