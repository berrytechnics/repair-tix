import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { HttpError, ValidationError } from "./config/errors";
import customerRoutes from "./routes/customer.routes";
import userRoutes from "./routes/user.routes";

// Import routes

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/user", userRoutes);
app.use("/customer", customerRoutes);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handling middleware
app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  const errorResponse: {
    success: false;
    error: {
      message: string;
      errors?: Record<string, string>;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      message,
      ...(err instanceof ValidationError && { errors: err.errors }),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  };
  
  res.status(statusCode).json(errorResponse);
});

export default app;
