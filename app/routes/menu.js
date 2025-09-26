const express = require("express");
const router = express.Router();

const {
  getFullMenu,
  getMenuByCategory,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  searchMenuItems,
} = require("../controllers/menuController");

const { validateMenuItem, validateId } = require("../middleware/validation");

/**
 * @route   GET /api/menu
 * @desc    Get full menu grouped by categories
 * @access  Public
 * @params  ?available=true (filter only available items)
 */
router.get("/", getFullMenu);

/**
 * @route   GET /api/menu/search
 * @desc    Search menu items
 * @access  Public
 * @params  ?q=search&category=drinks&vegetarian=true&max_price=100
 */
router.get("/search", searchMenuItems);

/**
 * @route   GET /api/menu/category/:categoryId
 * @desc    Get menu items by category
 * @access  Public
 * @params  ?available=true
 */
router.get("/category/:categoryId", validateId, getMenuByCategory);

/**
 * @route   GET /api/menu/item/:id
 * @desc    Get single menu item by ID
 * @access  Public
 */
router.get("/item/:id", validateId, getMenuItem);

/**
 * @route   POST /api/menu/item
 * @desc    Create new menu item
 * @access  Admin only (should be protected)
 * @body    { category_id, name, description, price, ... }
 */
router.post("/item", validateMenuItem, createMenuItem);

/**
 * @route   PUT /api/menu/item/:id
 * @desc    Update menu item
 * @access  Admin only (should be protected)
 * @body    { name?, description?, price?, is_available?, ... }
 */
router.put("/item/:id", validateId, updateMenuItem);

/**
 * @route   PUT /api/menu/item/:id/availability
 * @desc    Toggle menu item availability
 * @access  Staff (should be protected)
 */
router.put("/item/:id/availability", validateId, toggleAvailability);

/**
 * @route   DELETE /api/menu/item/:id
 * @desc    Delete menu item
 * @access  Admin only (should be protected)
 */
router.delete("/item/:id", validateId, deleteMenuItem);

module.exports = router;
