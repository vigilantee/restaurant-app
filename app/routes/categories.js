const express = require("express");
const router = express.Router();
const db = require("../config/database");
const {
  success,
  error,
  notFound,
  created,
} = require("../utils/responseHelper");
const { validateCategory, validateId } = require("../middleware/validation");

// Get all categories
router.get("/", async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT * FROM categories WHERE is_active = TRUE ORDER BY display_order, name"
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
});

// Get category by ID
router.get("/:id", validateId, async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM categories WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return notFound(res, "Category");
    }

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create new category
router.post("/", validateCategory, async (req, res, next) => {
  try {
    const { name, description, display_order, is_active } = req.body;

    const result = await db.query(
      "INSERT INTO categories (name, description, display_order, is_active) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, description || null, display_order || 0, is_active !== false]
    );

    return created(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update category
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
      `UPDATE categories SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updateFields)]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Category");
    }

    return success(res, result.rows[0], "Category updated successfully");
  } catch (err) {
    next(err);
  }
});

// Delete category
router.delete("/:id", validateId, async (req, res, next) => {
  try {
    // Check if category has menu items
    const itemsCheck = await db.query(
      "SELECT COUNT(*) as count FROM menu_items WHERE category_id = $1",
      [req.params.id]
    );

    if (parseInt(itemsCheck.rows[0].count) > 0) {
      return error(res, "Cannot delete category with existing menu items", 400);
    }

    const result = await db.query(
      "DELETE FROM categories WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Category");
    }

    return success(res, null, "Category deleted successfully");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
