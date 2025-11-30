import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  release: process.env.SENTRY_RELEASE,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Filter out known/expected errors
  ignoreErrors: [
    // Validation errors (handled gracefully)
    "ValidationError",
    // 404s (not real errors)
    "NotFoundError",
    // Rate limiting (expected behavior)
    "TooManyRequests",
  ],
  
  // Don't send errors in development unless explicitly enabled
  enabled: process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_DSN !== undefined,
  
  // Capture unhandled promise rejections
  captureUnhandledRejections: true,
  
  // Set beforeSend to filter sensitive data
  beforeSend(event, hint) {
    // Don't send events if DSN is not configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }
    
    // Filter out sensitive data from error messages
    if (event.request?.data) {
      // Remove potential sensitive fields
      const sensitiveFields = ["password", "token", "secret", "authorization"];
      if (typeof event.request.data === "object") {
        sensitiveFields.forEach((field) => {
          if (field in event.request.data) {
            delete event.request.data[field];
          }
        });
      }
    }
    
    return event;
  },
});

