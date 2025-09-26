/**
 * Global error handler middleware
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(`Error: ${error.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    params: req.params,
    body: req.body,
    query: req.query,
  });

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case "23505": // Unique violation
        error.message = "Resource already exists";
        error.statusCode = 409;
        break;
      case "23503": // Foreign key violation
        error.message = "Invalid reference to related resource";
        error.statusCode = 400;
        break;
      case "23502": // Not null violation
        error.message = "Required field is missing";
        error.statusCode = 400;
        break;
      case "22P02": // Invalid input syntax
        error.message = "Invalid input format";
        error.statusCode = 400;
        break;
      case "08006": // Connection failure
        error.message = "Database connection failed";
        error.statusCode = 503;
        break;
      default:
        error.message = "Database operation failed";
        error.statusCode = 500;
    }
  }

  // Validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error.message = message;
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token";
    error.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    error.message = "Token expired";
    error.statusCode = 401;
  }

  // Cast errors (invalid ObjectId, etc.)
  if (err.name === "CastError") {
    error.message = "Invalid resource ID";
    error.statusCode = 400;
  }

  const response = {
    success: false,
    message: error.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.details = error;
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = errorHandler;
