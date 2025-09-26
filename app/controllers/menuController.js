const db = require("../config/database");
const {
  success,
  error,
  notFound,
  created,
} = require("../utils/responseHelper");

/**
 * Get full menu grouped by categories
 */
const getFullMenu = async (req, res, next) => {
  try {
    const availableOnly = req.query.available === "true";

    let menuQuery = `
      SELECT 
        mi.id,
        mi.name as item_name,
        mi.description,
        mi.price,
        mi.is_available,
        mi.is_vegetarian,
        mi.is_vegan,
        mi.spice_level,
        mi.preparation_time,
        mi.calories,
        mi.image_url,
        c.id as category_id,
        c.name as category_name,
        c.display_order as category_order,
        mi.display_order as item_order
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      WHERE c.is_active = TRUE
    `;

    if (availableOnly) {
      menuQuery += " AND mi.is_available = TRUE";
    }

    menuQuery += " ORDER BY c.display_order, mi.display_order, mi.name";

    const result = await db.query(menuQuery);

    // Group items by category
    const categoriesMap = new Map();

    result.rows.forEach((item) => {
      const categoryId = item.category_id;

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: item.category_name,
          display_order: item.category_order,
          items: [],
        });
      }

      categoriesMap.get(categoryId).items.push({
        id: item.id,
        name: item.item_name,
        description: item.description,
        price: parseFloat(item.price),
        is_available: item.is_available,
        is_vegetarian: item.is_vegetarian,
        is_vegan: item.is_vegan,
        spice_level: item.spice_level,
        preparation_time: item.preparation_time,
        calories: item.calories,
        image_url: item.image_url,
        display_order: item.item_order,
      });
    });

    const menu = Array.from(categoriesMap.values()).sort(
      (a, b) => a.display_order - b.display_order
    );

    return success(res, menu);
  } catch (err) {
    next(err);
  }
};

/**
 * Get menu by category
 */
const getMenuByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const availableOnly = req.query.available === "true";

    let itemsQuery = `
      SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.is_available,
        mi.is_vegetarian,
        mi.is_vegan,
        mi.spice_level,
        mi.preparation_time,
        mi.calories,
        mi.image_url,
        c.name as category_name
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      WHERE mi.category_id = $1 AND c.is_active = TRUE
    `;

    const queryParams = [categoryId];

    if (availableOnly) {
      itemsQuery += " AND mi.is_available = TRUE";
    }

    itemsQuery += " ORDER BY mi.display_order, mi.name";

    const result = await db.query(itemsQuery, queryParams);

    if (result.rows.length === 0) {
      return notFound(res, "Category or menu items");
    }

    const menuItems = result.rows.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      is_available: item.is_available,
      is_vegetarian: item.is_vegetarian,
      is_vegan: item.is_vegan,
      spice_level: item.spice_level,
      preparation_time: item.preparation_time,
      calories: item.calories,
      image_url: item.image_url,
    }));

    return success(res, {
      category_name: result.rows[0].category_name,
      items: menuItems,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single menu item
 */
const getMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const itemQuery = `
      SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.is_available,
        mi.is_vegetarian,
        mi.is_vegan,
        mi.spice_level,
        mi.preparation_time,
        mi.calories,
        mi.image_url,
        mi.display_order,
        mi.created_at,
        mi.updated_at,
        c.id as category_id,
        c.name as category_name
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      WHERE mi.id = $1
    `;

    const result = await db.query(itemQuery, [id]);

    if (result.rows.length === 0) {
      return notFound(res, "Menu item");
    }

    const item = result.rows[0];
    const menuItem = {
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      is_available: item.is_available,
      is_vegetarian: item.is_vegetarian,
      is_vegan: item.is_vegan,
      spice_level: item.spice_level,
      preparation_time: item.preparation_time,
      calories: item.calories,
      image_url: item.image_url,
      display_order: item.display_order,
      category: {
        id: item.category_id,
        name: item.category_name,
      },
      created_at: item.created_at,
      updated_at: item.updated_at,
    };

    return success(res, menuItem);
  } catch (err) {
    next(err);
  }
};

/**
 * Create new menu item
 */
const createMenuItem = async (req, res, next) => {
  try {
    const {
      category_id,
      name,
      description,
      price,
      image_url,
      is_vegetarian = false,
      is_vegan = false,
      spice_level,
      preparation_time = 15,
      calories,
      display_order = 0,
    } = req.body;

    // Check if category exists
    const categoryCheck = await db.query(
      "SELECT id FROM categories WHERE id = $1 AND is_active = TRUE",
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return error(res, "Category not found or inactive", 400);
    }

    const insertQuery = `
      INSERT INTO menu_items (
        category_id, name, description, price, image_url,
        is_vegetarian, is_vegan, spice_level, preparation_time,
        calories, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      category_id,
      name,
      description,
      price,
      image_url,
      is_vegetarian,
      is_vegan,
      spice_level,
      preparation_time,
      calories,
      display_order,
    ]);

    return created(res, result.rows[0], "Menu item created successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Update menu item
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    // Remove undefined fields
    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] === undefined) {
        delete updateFields[key];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      return error(res, "No fields to update", 400);
    }

    // Build dynamic update query
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = ${index + 2}`)
      .join(", ");

    const updateQuery = `
      UPDATE menu_items 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const queryParams = [id, ...Object.values(updateFields)];

    const result = await db.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return notFound(res, "Menu item");
    }

    return success(res, result.rows[0], "Menu item updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Delete menu item
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM menu_items WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Menu item");
    }

    return success(res, null, "Menu item deleted successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle menu item availability
 */
const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "UPDATE menu_items SET is_available = NOT is_available WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Menu item");
    }

    const status = result.rows[0].is_available ? "available" : "unavailable";
    return success(res, result.rows[0], `Menu item marked as ${status}`);
  } catch (err) {
    next(err);
  }
};

/**
 * Search menu items
 */
const searchMenuItems = async (req, res, next) => {
  try {
    const { q, category, vegetarian, vegan, max_price, min_price } = req.query;

    let searchQuery = `
      SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.is_available,
        mi.is_vegetarian,
        mi.is_vegan,
        mi.spice_level,
        mi.preparation_time,
        c.name as category_name
      FROM menu_items mi
      JOIN categories c ON mi.category_id = c.id
      WHERE c.is_active = TRUE AND mi.is_available = TRUE
    `;

    const queryParams = [];
    let paramCount = 0;

    if (q) {
      paramCount++;
      searchQuery += ` AND (mi.name ILIKE ${paramCount} OR mi.description ILIKE ${paramCount})`;
      queryParams.push(`%${q}%`);
    }

    if (category) {
      paramCount++;
      searchQuery += ` AND c.name ILIKE ${paramCount}`;
      queryParams.push(`%${category}%`);
    }

    if (vegetarian === "true") {
      searchQuery += ` AND mi.is_vegetarian = TRUE`;
    }

    if (vegan === "true") {
      searchQuery += ` AND mi.is_vegan = TRUE`;
    }

    if (max_price) {
      paramCount++;
      searchQuery += ` AND mi.price <= ${paramCount}`;
      queryParams.push(parseFloat(max_price));
    }

    if (min_price) {
      paramCount++;
      searchQuery += ` AND mi.price >= ${paramCount}`;
      queryParams.push(parseFloat(min_price));
    }

    searchQuery += ` ORDER BY mi.name`;

    const result = await db.query(searchQuery, queryParams);

    return success(
      res,
      result.rows.map((item) => ({
        ...item,
        price: parseFloat(item.price),
      }))
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFullMenu,
  getMenuByCategory,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  searchMenuItems,
};
