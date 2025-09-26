const express = require("express");
const router = express.Router();

// Import route modules
const categoryRoutes = require("./categories");
const menuRoutes = require("./menu");
const tableRoutes = require("./tables");
// const customerRoutes = require("./customers");
const orderRoutes = require("./orders");
// const staffRoutes = require("./staff");

// API Documentation endpoint
router.get("/", (req, res) => {
  res.json({
    message: "🍽️ Restaurant Order Management API",
    version: "1.0.0",
    endpoints: {
      categories: {
        base: "/api/categories",
        description: "Manage menu categories",
        methods: ["GET", "POST", "PUT", "DELETE"],
      },
      menu: {
        base: "/api/menu",
        description: "Manage menu items and full menu",
        methods: ["GET", "POST", "PUT", "DELETE"],
        features: ["search", "filter by category", "availability toggle"],
      },
      tables: {
        base: "/api/tables",
        description: "Manage restaurant tables",
        methods: ["GET", "POST", "PUT", "DELETE"],
        features: ["availability status", "capacity management"],
      },
      customers: {
        base: "/api/customers",
        description: "Manage customer information",
        methods: ["GET", "POST", "PUT", "DELETE"],
      },
      orders: {
        base: "/api/orders",
        description: "Manage orders and order items",
        methods: ["GET", "POST", "PUT", "DELETE"],
        features: ["status tracking", "billing", "item management", "reports"],
      },
      staff: {
        base: "/api/staff",
        description: "Manage staff and authentication",
        methods: ["GET", "POST", "PUT", "DELETE"],
      },
    },
    commonQueryParams: {
      pagination: "?page=1&limit=10",
      filtering: "?available=true&status=active",
      search: "?q=search_term",
    },
    responseFormat: {
      success: {
        success: true,
        message: "Operation successful",
        data: "Response data",
        timestamp: "ISO date string",
      },
      error: {
        success: false,
        message: "Error description",
        timestamp: "ISO date string",
      },
    },
  });
});

// Mount route modules
router.use("/categories", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/tables", tableRoutes);
// router.use("/customers", customerRoutes);
router.use("/orders", orderRoutes);
// router.use("/staff", staffRoutes);

// API status endpoint
router.get("/status", (req, res) => {
  res.json({
    status: "API is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: process.version,
  });
});

module.exports = router;
