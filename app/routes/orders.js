const express = require("express");
const router = express.Router();

const {
  getAllOrders,
  getOrderById,
  createOrder,
  addOrderItems,
  updateOrderStatus,
  applyDiscount,
  getTodaysSummary,
} = require("../controllers/orderController");

const {
  validateOrder,
  validateOrderItem,
  validateId,
  validatePagination,
  validateOrderStatus,
} = require("../middleware/validation");

/**
 * @route   GET /api/orders
 * @desc    Get all orders with pagination and filtering
 * @access  Public (should be protected in production)
 * @params  ?page=1&limit=10&status=pending&order_type=dine_in
 */
router.get("/", validatePagination, validateOrderStatus, getAllOrders);

/**
 * @route   GET /api/orders/summary/today
 * @desc    Get today's orders summary and statistics
 * @access  Public (should be protected in production)
 */
router.get("/summary/today", getTodaysSummary);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID with all items
 * @access  Public (should be protected in production)
 */
router.get("/:id", validateId, getOrderById);

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Public (should be protected in production)
 * @body    { table_id?, customer_id?, order_type?, special_instructions? }
 */
router.post("/", validateOrder, createOrder);

/**
 * @route   POST /api/orders/:id/items
 * @desc    Add items to an existing order
 * @access  Public (should be protected in production)
 * @body    { items: [{ menu_item_id, quantity, special_notes? }] }
 */
router.post("/:id/items", validateId, addOrderItems);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Public (should be protected in production)
 * @body    { status, estimated_ready_time?, payment_method? }
 */
router.put("/:id/status", validateId, updateOrderStatus);

/**
 * @route   PUT /api/orders/:id/discount
 * @desc    Apply discount to order
 * @access  Public (should be protected in production)
 * @body    { discount_amount }
 */
router.put("/:id/discount", validateId, applyDiscount);

module.exports = router;
