import winston from "winston";

/**
 * Sanitize sensitive data from log messages
 * Removes passwords, tokens, and other sensitive information
 */
function sanitizeLogData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sensitiveKeys = [
    "password",
    "passwordHash",
    "password_hash",
    "token",
    "accessToken",
    "refreshToken",
    "jwt",
    "secret",
    "apiKey",
    "api_key",
    "apikey",
    "authorization",
    "auth",
    "credential",
    "credentials",
    "cardNumber",
    "card_number",
    "cvv",
    "ssn",
    "socialSecurityNumber",
  ];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitive) =>
      lowerKey.includes(sensitive)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Custom format to sanitize sensitive data
 */
const sanitizeFormat = winston.format((info) => {
  if (info.message && typeof info.message === "object") {
    info.message = sanitizeLogData(info.message);
  }
  if (info.meta) {
    info.meta = sanitizeLogData(info.meta);
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    sanitizeFormat(),
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "repair-business-api" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
  ],
});

// If we're not in production, also log to a file
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    })
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
    })
  );
}

export default logger;
