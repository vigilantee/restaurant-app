const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

// Import logging middleware
const {
  requestLogger,
  productionLogger,
  developmentLogger,
} = require("../middleware/requestLogger");

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "myapp",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "password123",
  // Add connection pool settings for production
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Enhanced logging middleware
if (process.env.NODE_ENV === "production") {
  app.use(productionLogger); // Standard access logs for production
  app.use(requestLogger); // Detailed request/response logging (with truncation)
} else {
  app.use(developmentLogger); // Colorful dev logs
  app.use(requestLogger); // Full detailed logging for development
}

// Add request ID for better tracking in production
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  res.setHeader("X-Request-ID", req.requestId);
  next();
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("Successfully connected to PostgreSQL database");
    release();
  }
});

// Add database connection monitoring
setInterval(async () => {
  if (process.env.NODE_ENV === "production") {
    console.log("Database pool status:", {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  }
}, 300000); // Every 5 minutes

// Memory monitoring for production
if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    const used = process.memoryUsage();
    console.log("Memory usage:", {
      rss: Math.round(used.rss / 1024 / 1024) + " MB",
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + " MB",
    });
  }, 300000); // Every 5 minutes
}

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Express + PostgreSQL Docker App is running!",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    console.log(`[${req.requestId}] Fetching all users`);
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    console.log(`[${req.requestId}] Found ${result.rows.length} users`);

    res.json({
      success: true,
      data: result.rows,
      requestId: req.requestId,
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error fetching users:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
      requestId: req.requestId,
    });
  }
});

// Create a new user
app.post("/api/users", async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    console.log(`[${req.requestId}] Validation failed: missing name or email`);
    return res.status(400).json({
      success: false,
      error: "Name and email are required",
      requestId: req.requestId,
    });
  }

  try {
    console.log(`[${req.requestId}] Creating user: ${name} (${email})`);
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );
    console.log(
      `[${req.requestId}] User created with ID: ${result.rows[0].id}`
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      requestId: req.requestId,
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error creating user:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to create user",
      requestId: req.requestId,
    });
  }
});

// Get user by ID
app.get("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`[${req.requestId}] Fetching user ID: ${id}`);
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      console.log(`[${req.requestId}] User not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: "User not found",
        requestId: req.requestId,
      });
    }

    console.log(`[${req.requestId}] User found: ${result.rows[0].name}`);
    res.json({
      success: true,
      data: result.rows[0],
      requestId: req.requestId,
    });
  } catch (error) {
    console.error(`[${req.requestId}] Error fetching user:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user",
      requestId: req.requestId,
    });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const dbResponseTime = Date.now() - start;

    res.json({
      status: "healthy",
      database: "connected",
      dbResponseTime: `${dbResponseTime}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      requestId: req.requestId,
    });
  } catch (error) {
    console.error(`[${req.requestId}] Health check failed:`, error);
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }
});

// Handle 404 errors
app.use("*", (req, res) => {
  console.log(`[${req.requestId}] 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Route not found",
    requestId: req.requestId,
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(`[${req.requestId}] Unhandled error:`, error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    requestId: req.requestId,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `Database: ${process.env.DB_HOST || "localhost"}:${
      process.env.DB_PORT || 5432
    }`
  );
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});
