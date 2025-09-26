const express = require("express");
const router = express.Router();
const db = require("../config/database");
const {
  success,
  error,
  notFound,
  created,
} = require("../utils/responseHelper");
const { validateTable, validateId } = require("../middleware/validation");

// Get all tables
router.get("/", async (req, res, next) => {
  try {
    const available = req.query.available;
    let query = "SELECT * FROM restaurant_tables";
    let params = [];

    if (available !== undefined) {
      query += " WHERE is_available = $1";
      params.push(available === "true");
    }

    query += " ORDER BY table_number";

    const result = await db.query(query, params);
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
});

// Get available tables
router.get("/available", async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM restaurant_tables WHERE is_available = TRUE ORDER BY table_number"
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
});

// Get table by ID
router.get("/:id", validateId, async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM restaurant_tables WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Table");
    }

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create new table
router.post("/", validateTable, async (req, res, next) => {
  try {
    const { table_number, capacity, location } = req.body;

    const result = await db.query(
      "INSERT INTO restaurant_tables (table_number, capacity, location) VALUES ($1, $2, $3) RETURNING *",
      [table_number, capacity, location || null]
    );

    return created(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update table
router.put("/:id", validateId, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] === undefined) delete updateFields[key];
    });

    if (Object.keys(updateFields).length === 0) {
      return error(res, "No fields to update", 400);
    }

    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(", ");

    const result = await db.query(
      `UPDATE restaurant_tables SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updateFields)]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Table");
    }

    return success(res, result.rows[0], "Table updated successfully");
  } catch (err) {
    next(err);
  }
});

// Toggle table availability
router.put("/:id/availability", validateId, async (req, res, next) => {
  try {
    const result = await db.query(
      "UPDATE restaurant_tables SET is_available = NOT is_available WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Table");
    }

    const status = result.rows[0].is_available ? "available" : "occupied";
    return success(res, result.rows[0], `Table marked as ${status}`);
  } catch (err) {
    next(err);
  }
});

// Delete table
router.delete("/:id", validateId, async (req, res, next) => {
  try {
    // Check if table has active orders
    const ordersCheck = await db.query(
      "SELECT COUNT(*) as count FROM orders WHERE table_id = $1 AND order_status NOT IN ('completed', 'cancelled')",
      [req.params.id]
    );

    if (parseInt(ordersCheck.rows[0].count) > 0) {
      return error(res, "Cannot delete table with active orders", 400);
    }

    const result = await db.query(
      "DELETE FROM restaurant_tables WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Table");
    }

    return success(res, null, "Table deleted successfully");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
