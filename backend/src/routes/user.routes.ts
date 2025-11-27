import express, { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
  UnauthorizedError,
} from "../config/errors";
import { validate } from "../middlewares/validation.middleware";
import userService from "../services/user.service";
import { generateNewJWTToken } from "../utils/auth";
import { loginValidation, registerValidation } from "../validators/user.validator";

const router = express.Router();

// Async handler wrapper to catch errors and pass to error middleware
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.get("/", (req: Request, res: Response) => {
  return res.json({ message: "Hello from API" });
});

router.post(
  "/login",
  validate(loginValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
      const user = await userService.authenticate(email, password);
      if (!user) {
        throw new UnauthorizedError("Invalid credentials");
      }
      const token = generateNewJWTToken(user);
      res.json({ user, token });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to authenticate user");
    }
  })
);

router.post(
  "/register",
  validate(registerValidation),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = await userService.create(req.body);
      if (!user) {
        throw new BadRequestError("Registration failed");
      }
      res.status(201).json({ user });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to register user");
    }
  })
);

export default router;
