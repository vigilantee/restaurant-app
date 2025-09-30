const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const express = require("express");
const findFreePort = require("find-free-port");
const fs = require("fs");

let mainWindow;
let serverInstance;
let backendPort = 8080;

// Create the Express server
function createExpressServer() {
  return new Promise((resolve, reject) => {
    // Find a free port for the backend
    findFreePort(8080, 9000, (err, freePort) => {
      if (err) {
        backendPort = 8080;
      } else {
        backendPort = freePort;
      }

      // Set environment variables
      process.env.NODE_ENV = process.env.NODE_ENV || "production";
      process.env.PORT = backendPort;
      process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || "localhost";
      process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || "5432";
      process.env.POSTGRES_USER = process.env.POSTGRES_USER || "postgres";
      process.env.POSTGRES_PASSWORD =
        process.env.POSTGRES_PASSWORD || "password";
      process.env.POSTGRES_DB = process.env.POSTGRES_DB || "myapp";

      // Import and start the Express server
      const server = require("./app/server.js");

      serverInstance = server
        .listen(backendPort, () => {
          console.log(`✅ Backend server running on port ${backendPort}`);
          resolve(backendPort);
        })
        .on("error", (error) => {
          console.error("❌ Failed to start backend server:", error);
          reject(error);
        });
    });
  });
}

// Populate database if needed
async function populateDatabase() {
  try {
    const populateScriptPath = path.join(
      __dirname,
      "postgres",
      "init",
      "populate-db.js"
    );
    const dataJsonPath = path.join(__dirname, "postgres", "init", "data.json");
    const prependSqlPath = path.join(
      __dirname,
      "postgres",
      "init",
      "prepend.sql"
    );
    const outputSqlPath = path.join(
      __dirname,
      "postgres",
      "init",
      "generated_init.sql"
    );

    // Check if files exist
    if (!fs.existsSync(populateScriptPath) || !fs.existsSync(dataJsonPath)) {
      console.log(
        "⚠️ Populate script or data file not found, skipping database population"
      );
      return;
    }

    console.log("📊 Checking database status...");

    // Check if database needs population
    const { Pool } = require("pg");
    const pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    });

    try {
      // Check if tables exist and have data
      const result = await pool.query("SELECT COUNT(*) FROM menu_items");
      const count = parseInt(result.rows[0].count);

      if (count === 0) {
        console.log("📊 Database is empty, populating with sample data...");
        await populateDatabaseWithSQL(
          populateScriptPath,
          dataJsonPath,
          prependSqlPath,
          outputSqlPath,
          pool
        );
        console.log("✅ Database populated successfully!");
      } else {
        console.log(`✅ Database already has ${count} menu items`);
      }
    } catch (error) {
      if (error.code === "42P01") {
        // Table doesn't exist, populate
        console.log("📊 Tables not found, populating database...");
        await populateDatabaseWithSQL(
          populateScriptPath,
          dataJsonPath,
          prependSqlPath,
          outputSqlPath,
          pool
        );
        console.log("✅ Database populated successfully!");
      } else {
        console.error("⚠️ Error checking database:", error.message);
      }
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error("⚠️ Error in database population:", error.message);
    console.log("⚠️ Continuing without sample data...");
  }
}

// Helper function to populate database using SQL file
async function populateDatabaseWithSQL(
  populateScriptPath,
  dataJsonPath,
  prependSqlPath,
  outputSqlPath,
  pool
) {
  // Generate SQL file using your original populate-db.js
  const PopulateDB = require(populateScriptPath);
  const populator = new PopulateDB(dataJsonPath, prependSqlPath);

  // Validate data
  populator.validateData();

  // Generate SQL file
  populator.writeToFile(outputSqlPath);

  // Read the generated SQL file
  const sqlContent = fs.readFileSync(outputSqlPath, "utf8");

  // Execute the SQL
  console.log("📊 Executing SQL script...");
  await pool.query(sqlContent);

  console.log("✅ SQL script executed successfully");
}

// Create the Electron browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    title: "Restaurant Manager",
    autoHideMenuBar: true,
  });

  // Load the React app from Express server or dev server
  const isDev = process.env.NODE_ENV === "development";
  const loadURL = isDev
    ? "http://localhost:3000"
    : `http://localhost:${backendPort}`;

  console.log(`Loading React app from: ${loadURL}`);
  mainWindow.loadURL(loadURL);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App ready event
app.whenReady().then(async () => {
  try {
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev) {
      // Only start Express server in production mode
      // In dev mode, nodemon is running the server separately
      await createExpressServer();

      // Populate database if needed
      await populateDatabase();
    } else {
      console.log(
        "🔧 Development mode: Using external backend server on port 8080"
      );
      backendPort = 8080; // Default dev port
    }

    // Create Electron window
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    app.quit();
  }
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Clean up before quit
app.on("before-quit", () => {
  if (serverInstance) {
    serverInstance.close();
    console.log("🛑 Backend server stopped");
  }
});

// IPC handlers
ipcMain.handle("get-backend-port", () => {
  return backendPort;
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});
