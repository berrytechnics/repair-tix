import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { UserModel } from "../models/user.model";
import { BadRequestError, UnauthorizedError } from "../types/errors";

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT tokens for authentication
 */
const generateTokens = (user: UserModel): TokenPair => {
  const accessToken = jwt.sign(
    {
      id: user.get("id"),
      email: user.get("email"),
      role: user.get("role"),
    } as UserPayload,
    process.env.JWT_SECRET || "your_jwt_secret_key",
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id: user.get("id") } as Pick<UserPayload, "id">,
    process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret_key",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestError("User with this email already exists");
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // Will be hashed by model hook
      role: role || "technician",
    });

    // Generate tokens
    const tokens = generateTokens(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.get("id"),
          firstName: user.get("firstName"),
          lastName: user.get("lastName"),
          email: user.get("email"),
          role: user.get("role"),
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Check if user is active
    if (!user.get("active")) {
      throw new UnauthorizedError("Account is disabled");
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Generate tokens
    const tokens = generateTokens(user);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.get("id"),
          firstName: user.get("firstName"),
          lastName: user.get("lastName"),
          email: user.get("email"),
          role: user.get("role"),
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User is already attached to req by the requireAuth middleware
    const user = req.currentUser;

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret_key"
      ) as { id: string };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.get("active")) {
      throw new UnauthorizedError("User not found or inactive");
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};
