const { Pool } = require("pg");

// Database configuration
const pool = new Pool({
  user: process.env.POSTGRES_USER || "postgres",
  host: process.env.POSTGRES_HOST || "postgres",
  database: process.env.POSTGRES_DB || "myapp",
  password: process.env.POSTGRES_PASSWORD || "password",
  port: process.env.POSTGRES_PORT || 5432,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Error handling for pool
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms`, { text, params });
    }

    return res;
  } catch (err) {
    console.error("Database query error:", {
      text,
      params,
      error: err.message,
    });
    throw err;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  query,
  getClient,
  connect: () => pool.connect(),
  end: () => pool.end(),
  pool,
};
