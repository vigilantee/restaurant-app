const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
require("dotenv").config();

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const db = require("./config/database");

const app = express();
const port = process.env.PORT || 8080;

console.log("🚀 Starting Restaurant Order Management API...");
console.log("Environment:", process.env.NODE_ENV || "development");

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10000, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// CORS configuration

// only for dev
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000", // React dev URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for all routes
app.options("*", cors(corsOptions));

// for production
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "*",
//     credentials: true,
//   })
// );

// Logging
app.use(morgan("combined"));

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
        process.exit(1);
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
app.get("/", (req, res) => {
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

// Health check endpoint
const poolInfo = db.totalCount
  ? {
      totalConnections: db.totalCount,
      idleConnections: db.idleCount,
      waitingClients: db.waitingCount,
    }
  : null;
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

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT. Graceful shutdown...");
  await db.end();
  console.log("📊 Database connection closed.");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
  await db.end();
  console.log("📊 Database connection closed.");
  process.exit(0);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
  console.log(`📊 Health check available at http://localhost:${port}/health`);
  console.log(`🍽️  Restaurant API available at http://localhost:${port}/api`);
  console.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
});
