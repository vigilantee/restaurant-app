/**
 * Standardized API response helpers
 */

const success = (res, data = null, message = "Success", statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== null) {
    if (Array.isArray(data)) {
      response.count = data.length;
      response.data = data;
    } else {
      response.data = data;
    }
  }

  return res.status(statusCode).json(response);
};

const error = (
  res,
  message = "Internal Server Error",
  statusCode = 500,
  details = null
) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  // Log error for debugging
  console.error(`API Error [${statusCode}]:`, message, details ? details : "");

  return res.status(statusCode).json(response);
};

const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors,
    timestamp: new Date().toISOString(),
  });
};

const notFound = (res, resource = "Resource") => {
  return error(res, `${resource} not found`, 404);
};

const unauthorized = (res, message = "Unauthorized access") => {
  return error(res, message, 401);
};

const forbidden = (res, message = "Access forbidden") => {
  return error(res, message, 403);
};

const conflict = (res, message = "Resource already exists") => {
  return error(res, message, 409);
};

const created = (res, data, message = "Resource created successfully") => {
  return success(res, data, message, 201);
};

module.exports = {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  created,
};
