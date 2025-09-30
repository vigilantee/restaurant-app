const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const db = require("./config/database");

const app = express();

console.log("🚀 Starting Restaurant Order Management API...");
console.log("Environment:", process.env.NODE_ENV || "development");

// Security middleware - Modified for Electron
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for Electron
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// CORS configuration - Modified for Electron
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:8080",
    "file://*",
    "http://localhost:*",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for all routes
app.options("*", cors(corsOptions));

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Test database connection on startup
const connectToDatabase = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const client = await db.connect();
      console.log("✅ Successfully connected to PostgreSQL database");

      // Test the connection
      const result = await client.query(
        "SELECT NOW() as server_time, version() as version"
      );
      console.log("📅 Database time:", result.rows[0].server_time);
      console.log(
        "🗄️  PostgreSQL version:",
        result.rows[0].version.split(" ").slice(0, 2).join(" ")
      );

      client.release();
      break;
    } catch (err) {
      retries++;
      console.log(
        `❌ Database connection attempt ${retries}/${maxRetries} failed:`,
        err.message
      );

      if (retries >= maxRetries) {
        console.error("💥 Max retries reached. Could not connect to database.");
        console.error(
          "⚠️  Please ensure PostgreSQL is running on localhost:5432"
        );
        // Don't exit in Electron - let the app continue
        console.log(
          "⚠️  Application will continue without database connection"
        );
        break;
      } else {
        console.log(`🔄 Retrying in 3 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
};

// Connect to database
connectToDatabase();

// Routes
app.get("/api_detail", (req, res) => {
  res.json({
    message: "🍽️ Welcome to Restaurant Order Management API",
    status: "Server is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      categories: "/api/categories",
      menu: "/api/menu",
      tables: "/api/tables",
      orders: "/api/orders",
      customers: "/api/customers",
      staff: "/api/staff",
    },
  });
});

// API routes
app.use("/api", routes);

// Serve static files from React app
const frontendBuildPath = path.join(__dirname, "..", "frontend", "build");
console.log("Serving React build from:", frontendBuildPath);

// Static files middleware with proper configuration
app.use(express.static(frontendBuildPath));

// SPA fallback - send index.html for all non-API routes
app.get("*", (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
    return next();
  }

  const indexPath = path.join(frontendBuildPath, "index.html");
  console.log(`Serving ${req.path} -> index.html`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Error serving index.html:", err);
      res.status(500).send("Error loading application");
    }
  });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: {
      root: "/",
      health: "/health",
      api: "/api/*",
    },
  });
});
app.get("/health", async (req, res) => {
  try {
    const client = await db.connect();
    const dbResult = await client.query("SELECT 1 as status");
    const tablesResult = await client.query(
      "SELECT COUNT(*) as count FROM restaurant_tables WHERE is_available = true"
    );
    const ordersResult = await client.query(
      "SELECT COUNT(*) as count FROM orders WHERE order_status IN ('pending', 'confirmed', 'preparing')"
    );

    client.release();

    const poolInfo = db.totalCount
      ? {
          totalConnections: db.totalCount,
          idleConnections: db.idleCount,
          waitingClients: db.waitingCount,
        }
      : null;

    res.json({
      status: "healthy",
      database: "connected",
      connectionPool: poolInfo,
      timestamp: new Date().toISOString(),
      stats: {
        availableTables: parseInt(tablesResult.rows[0].count),
        activeOrders: parseInt(ordersResult.rows[0].count),
      },
    });
  } catch (err) {
    console.error("❌ Health check failed:", err);
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: {
      root: "/",
      health: "/health",
      api: "/api/*",
    },
  });
});

// Global error handler
app.use(errorHandler);

// Export app for use in Electron main.js
module.exports = app;

// Only start server if not required as module (for standalone testing)
if (require.main === module) {
  const port = process.env.PORT || 8080;

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
    console.log(`📊 Health check available at http://localhost:${port}/health`);
    console.log(`🍽️  Restaurant API available at http://localhost:${port}/api`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received SIGINT. Graceful shutdown...");
    server.close();
    await db.end();
    console.log("📊 Database connection closed.");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
    server.close();
    await db.end();
    console.log("📊 Database connection closed.");
    process.exit(0);
  });
}
