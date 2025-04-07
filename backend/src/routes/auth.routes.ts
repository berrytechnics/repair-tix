import express, { Router } from "express";
import { body } from "express-validator";
import {
  getCurrentUser,
  loginUser,
  refreshToken,
  registerUser,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/required-auth";
import { validateRequest } from "../middlewares/validate-request";

const router: Router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  "/register",
  [
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("role")
      .optional()
      .isIn(["admin", "technician", "frontdesk"])
      .withMessage("Role must be admin, technician, or frontdesk"),
  ],
  validateRequest,
  registerUser
);

/**
 * @route POST /api/auth/login
 * @desc Login user and return JWT token
 * @access Public
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  loginUser
);

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get("/me", requireAuth, getCurrentUser);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (with refresh token)
 */
router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  validateRequest,
  refreshToken
);

export default router;
