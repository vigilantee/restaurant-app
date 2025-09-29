// Create a new file: middleware/requestLogger.js
const morgan = require("morgan");

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Skip logging for health checks and static assets in production
  const skipLogging =
    process.env.NODE_ENV === "production" &&
    (req.url === "/health" || req.url.startsWith("/static"));

  if (!skipLogging) {
    // Log incoming request
    console.log("\n📥 INCOMING REQUEST:", {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      contentType: req.get("Content-Type"),
      body: req.method !== "GET" ? sanitizeBody(req.body) : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      params: Object.keys(req.params).length > 0 ? req.params : undefined,
    });
  }

  // Capture original json method
  const originalJson = res.json;

  // Override res.json to log response
  res.json = function (data) {
    const duration = Date.now() - startTime;

    if (!skipLogging) {
      console.log("\n📤 OUTGOING RESPONSE:", {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: JSON.stringify(data).length + " bytes",
        response: sanitizeResponse(data),
      });
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

// Sanitize sensitive data from logs
const sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return body;

  const sanitized = { ...body };
  const sensitiveFields = ["password", "token", "secret", "key", "auth"];

  Object.keys(sanitized).forEach((key) => {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
    }
  });

  return sanitized;
};

// Sanitize response data (limit size in production)
const sanitizeResponse = (data) => {
  if (process.env.NODE_ENV === "production") {
    const str = JSON.stringify(data);
    if (str.length > 1000) {
      return {
        ...data,
        data: Array.isArray(data.data)
          ? `[Array with ${data.data.length} items]`
          : "[Large object - truncated]",
      };
    }
  }
  return data;
};

// Production-ready morgan logger
const productionLogger = morgan("combined", {
  skip: (req, res) => {
    // Skip logging successful health checks
    return req.url === "/health" && res.statusCode < 400;
  },
});

// Development morgan logger
const developmentLogger = morgan("dev");

module.exports = {
  requestLogger,
  productionLogger,
  developmentLogger,
};
