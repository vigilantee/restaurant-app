const { body, param, query, validationResult } = require("express-validator");
const { validationError } = require("../utils/responseHelper");

/**
 * Handle validation results
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }
  next();
};

/**
 * Category validation rules
 */
const validateCategory = [
  body("name")
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("display_order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a non-negative integer"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
  handleValidation,
];

/**
 * Menu item validation rules
 */
const validateMenuItem = [
  body("category_id")
    .isInt({ min: 1 })
    .withMessage("Valid category ID is required"),
  body("name")
    .notEmpty()
    .withMessage("Item name is required")
    .isLength({ min: 2, max: 150 })
    .withMessage("Item name must be between 2 and 150 characters"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number"),
  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
  body("is_vegetarian")
    .optional()
    .isBoolean()
    .withMessage("is_vegetarian must be a boolean"),
  body("is_vegan")
    .optional()
    .isBoolean()
    .withMessage("is_vegan must be a boolean"),
  body("spice_level")
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage("Spice level must be between 0 and 5"),
  body("preparation_time")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Preparation time must be a positive integer"),
  handleValidation,
];

/**
 * Table validation rules
 */
const validateTable = [
  body("table_number")
    .notEmpty()
    .withMessage("Table number is required")
    .isLength({ min: 1, max: 10 })
    .withMessage("Table number must be between 1 and 10 characters"),
  body("capacity")
    .isInt({ min: 1, max: 20 })
    .withMessage("Capacity must be between 1 and 20"),
  body("location")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Location cannot exceed 100 characters"),
  handleValidation,
];

/**
 * Customer validation rules
 */
const validateCustomer = [
  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Invalid phone number format"),
  body("email").optional().isEmail().withMessage("Invalid email format"),
  handleValidation,
];

/**
 * Order validation rules
 */
const validateOrder = [
  body("table_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid table ID is required"),
  body("customer_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid customer ID is required"),
  body("order_type")
    .optional()
    .isIn(["dine_in", "takeaway", "delivery"])
    .withMessage("Order type must be dine_in, takeaway, or delivery"),
  body("special_instructions")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Special instructions cannot exceed 500 characters"),
  handleValidation,
];

/**
 * Order item validation rules
 */
const validateOrderItem = [
  body("order_id").isInt({ min: 1 }).withMessage("Valid order ID is required"),
  body("menu_item_id")
    .isInt({ min: 1 })
    .withMessage("Valid menu item ID is required"),
  body("quantity")
    .isInt({ min: 1, max: 50 })
    .withMessage("Quantity must be between 1 and 50"),
  body("special_notes")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Special notes cannot exceed 200 characters"),
  handleValidation,
];

/**
 * Staff validation rules
 */
const validateStaff = [
  body("name")
    .notEmpty()
    .withMessage("Staff name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("role")
    .optional()
    .isIn(["admin", "manager", "waiter", "chef", "cashier"])
    .withMessage("Role must be admin, manager, waiter, chef, or cashier"),
  handleValidation,
];

/**
 * Parameter validation rules
 */
const validateId = [
  param("id").isInt({ min: 1 }).withMessage("Valid ID parameter is required"),
  handleValidation,
];

/**
 * Query parameter validation rules
 */
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  handleValidation,
];

const validateOrderStatus = [
  query("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "served",
      "completed",
      "cancelled",
    ])
    .withMessage("Invalid order status"),
  handleValidation,
];

module.exports = {
  handleValidation,
  validateCategory,
  validateMenuItem,
  validateTable,
  validateCustomer,
  validateOrder,
  validateOrderItem,
  validateStaff,
  validateId,
  validatePagination,
  validateOrderStatus,
};
