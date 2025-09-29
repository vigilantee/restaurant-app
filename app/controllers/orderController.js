const db = require("../config/database");
const {
  success,
  error,
  notFound,
  created,
} = require("../utils/responseHelper");

/**
 * Get all orders with pagination and filtering
 */
const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const orderType = req.query.order_type;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    let whereClause = "";
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += `WHERE o.order_status = $${paramCount}`;
      queryParams.push(status);
    }

    if (orderType) {
      paramCount++;
      whereClause += status
        ? ` AND o.order_type = $${paramCount}`
        : `WHERE o.order_type = $${paramCount}`;
      queryParams.push(orderType);
    }

    if (dateFrom) {
      paramCount++;
      whereClause +=
        status || orderType
          ? ` AND DATE(o.order_date) >= $${paramCount}`
          : `WHERE DATE(o.order_date) >= $${paramCount}`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      whereClause +=
        status || orderType || dateFrom
          ? ` AND DATE(o.order_date) <= $${paramCount}`
          : `WHERE DATE(o.order_date) <= $${paramCount}`;
      queryParams.push(dateTo);
    }

    const ordersQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.order_status,
        o.order_type,
        o.subtotal,
        o.tax_amount,
        o.discount_amount,
        o.total_amount,
        o.food_cost,
        o.payment_status,
        o.payment_method,
        o.special_instructions,
        o.order_date,
        o.estimated_ready_time,
        o.completed_at,
        o.cancelled_at,
        o.inventory_updated,
        rt.table_number,
        rt.location as table_location,
        c.name as customer_name,
        c.phone as customer_phone
      FROM orders o
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.order_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `;

    const countParams = queryParams.slice(0, paramCount);

    const [ordersResult, countResult] = await Promise.all([
      db.query(ordersQuery, queryParams),
      db.query(countQuery, countParams),
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);

    return success(res, {
      orders: ordersResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get order by ID with items
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get order details
    const orderQuery = `
      SELECT 
        o.*,
        rt.table_number,
        rt.location as table_location,
        rt.capacity,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email
      FROM orders o
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `;

    // Get order items with food cost
    const itemsQuery = `
      SELECT 
        oi.id,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
        oi.unit_food_cost,
        oi.total_food_cost,
        oi.special_notes,
        mi.name as item_name,
        mi.description,
        mi.preparation_time,
        c.name as category_name
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN categories c ON mi.category_id = c.id
      WHERE oi.order_id = $1
      ORDER BY c.display_order, mi.name
    `;

    const [orderResult, itemsResult] = await Promise.all([
      db.query(orderQuery, [id]),
      db.query(itemsQuery, [id]),
    ]);

    if (orderResult.rows.length === 0) {
      return notFound(res, "Order");
    }

    const orderData = {
      ...orderResult.rows[0],
      items: itemsResult.rows,
    };

    return success(res, orderData);
  } catch (err) {
    next(err);
  }
};

/**
 * Create new order - CORRECTED VERSION
 */
/**
 * Create new order
 */
const createOrder = async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const {
      table_id,
      customer_id,
      order_type = "dine_in",
      special_instructions,
      items = [], // Add items array to request body
    } = req.body;

    // Check if table exists and is available (if table_id provided)
    if (table_id) {
      const tableCheck = await client.query(
        "SELECT id, is_available FROM restaurant_tables WHERE id = $1",
        [table_id]
      );

      if (tableCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return notFound(res, "Table");
      }

      if (!tableCheck.rows[0].is_available) {
        await client.query("ROLLBACK");
        return error(res, "Table is not available", 400);
      }

      // Mark table as occupied
      await client.query(
        "UPDATE restaurant_tables SET is_available = false WHERE id = $1",
        [table_id]
      );
    }

    // Create order
    const orderQuery = `
      INSERT INTO orders (table_id, customer_id, order_type, special_instructions)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const orderResult = await client.query(orderQuery, [
      table_id || null,
      customer_id || null,
      order_type,
      special_instructions || null,
    ]);

    const orderId = orderResult.rows[0].id;

    // Add order items if provided
    if (items.length > 0) {
      // Get menu item IDs from the items array
      const menuItemIds = items.map((item) => item.menu_item_id);

      // Fetch menu items with prices from database
      const menuItemsResult = await client.query(
        `SELECT id, price, is_available 
         FROM menu_items 
         WHERE id = ANY($1::int[])`,
        [menuItemIds]
      );

      // Create a map for quick lookup
      const menuItemsMap = {};
      menuItemsResult.rows.forEach((item) => {
        menuItemsMap[item.id] = item;
      });

      // Validate and insert order items
      for (const item of items) {
        const menuItem = menuItemsMap[item.menu_item_id];

        if (!menuItem) {
          await client.query("ROLLBACK");
          return error(
            res,
            `Menu item with ID ${item.menu_item_id} not found`,
            404
          );
        }

        if (!menuItem.is_available) {
          await client.query("ROLLBACK");
          return error(
            res,
            `Menu item with ID ${item.menu_item_id} is not available`,
            400
          );
        }

        await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            orderId,
            item.menu_item_id,
            item.quantity,
            menuItem.price, // Use price from database
            menuItem.price * item.quantity,
            item.special_notes || null,
          ]
        );
      }

      // Re-fetch order to get calculated totals after items are added
      const updatedOrderResult = await client.query(
        "SELECT * FROM orders WHERE id = $1",
        [orderId]
      );

      await client.query("COMMIT");
      return created(
        res,
        updatedOrderResult.rows[0],
        "Order created successfully"
      );
    }

    await client.query("COMMIT");
    return created(res, orderResult.rows[0], "Order created successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// Add this to your routes
// app.get('/api/test-menu', testMenuItems);

/**
 * Add items to order
 */
const addOrderItems = async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { items } = req.body; // Array of {menu_item_id, quantity, special_notes}

    if (!items || !Array.isArray(items) || items.length === 0) {
      await client.query("ROLLBACK");
      return error(res, "Items array is required", 400);
    }

    // Check if order exists and is not completed
    const orderCheck = await client.query(
      "SELECT id, order_status, inventory_updated FROM orders WHERE id = $1",
      [id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return notFound(res, "Order");
    }

    const order = orderCheck.rows[0];

    if (["completed", "cancelled"].includes(order.order_status)) {
      await client.query("ROLLBACK");
      return error(res, "Cannot modify completed or cancelled orders", 400);
    }

    if (order.inventory_updated) {
      await client.query("ROLLBACK");
      return error(
        res,
        "Cannot modify order after inventory has been updated",
        400
      );
    }

    // Validate menu items and get prices
    const menuItemIds = items.map((item) => item.menu_item_id);
    const menuItemsQuery = `
      SELECT id, name, price, is_available
      FROM menu_items
      WHERE id = ANY($1::int[])
    `;

    const menuItemsResult = await client.query(menuItemsQuery, [menuItemIds]);
    const menuItems = new Map();

    menuItemsResult.rows.forEach((item) => {
      menuItems.set(item.id, item);
    });

    // Validate all items exist and are available
    for (const item of items) {
      const menuItem = menuItems.get(item.menu_item_id);
      if (!menuItem) {
        await client.query("ROLLBACK");
        return error(
          res,
          `Menu item with ID ${item.menu_item_id} not found`,
          400
        );
      }
      if (!menuItem.is_available) {
        await client.query("ROLLBACK");
        return error(res, `Menu item "${menuItem.name}" is not available`, 400);
      }
    }

    // Insert order items (food costs will be calculated by trigger)
    const orderItemsData = [];
    for (const item of items) {
      const menuItem = menuItems.get(item.menu_item_id);
      const totalPrice = menuItem.price * item.quantity;

      const orderItemQuery = `
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const orderItemResult = await client.query(orderItemQuery, [
        id,
        item.menu_item_id,
        item.quantity,
        menuItem.price,
        totalPrice,
        item.special_notes || null,
      ]);

      orderItemsData.push({
        ...orderItemResult.rows[0],
        item_name: menuItem.name,
      });
    }

    // Order totals will be updated automatically by trigger
    await client.query("COMMIT");

    return created(res, orderItemsData, "Items added to order successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Check ingredient availability for an order
 */
const checkIngredientAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "SELECT * FROM check_ingredient_availability($1)",
      [id]
    );

    const availability = result.rows;
    const hasInsufficientStock = availability.some(
      (item) => !item.is_sufficient
    );

    return success(res, {
      order_id: id,
      ingredients: availability,
      can_fulfill: !hasInsufficientStock,
      insufficient_ingredients: availability.filter(
        (item) => !item.is_sufficient
      ),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm order and deduct ingredients
 */
const confirmOrder = async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { estimated_ready_time } = req.body;

    // Check if order exists and is in pending status
    const orderCheck = await client.query(
      "SELECT id, order_status, inventory_updated FROM orders WHERE id = $1",
      [id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return notFound(res, "Order");
    }

    const order = orderCheck.rows[0];

    if (order.order_status !== "pending") {
      await client.query("ROLLBACK");
      return error(
        res,
        `Order cannot be confirmed. Current status: ${order.order_status}`,
        400
      );
    }

    if (order.inventory_updated) {
      await client.query("ROLLBACK");
      return error(res, "Order inventory already updated", 400);
    }

    // Deduct ingredients using the stored function
    await client.query("SELECT deduct_order_ingredients($1)", [id]);

    // Update order status to confirmed
    const updateQuery = `
      UPDATE orders 
      SET order_status = 'confirmed', 
          estimated_ready_time = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      id,
      estimated_ready_time || null,
    ]);

    await client.query("COMMIT");

    return success(
      res,
      result.rows[0],
      "Order confirmed and ingredients deducted"
    );
  } catch (err) {
    await client.query("ROLLBACK");

    // Handle insufficient ingredients error specifically
    if (err.message && err.message.includes("insufficient ingredients")) {
      return error(
        res,
        "Cannot confirm order due to insufficient ingredients: " + err.message,
        400
      );
    }
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { status, estimated_ready_time, payment_method } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "served",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      await client.query("ROLLBACK");
      return error(res, "Invalid order status", 400);
    }

    // Get current order status
    const currentOrder = await client.query(
      "SELECT order_status, inventory_updated, table_id FROM orders WHERE id = $1",
      [id]
    );

    if (currentOrder.rows.length === 0) {
      await client.query("ROLLBACK");
      return notFound(res, "Order");
    }

    const oldStatus = currentOrder.rows[0].order_status;
    const inventoryUpdated = currentOrder.rows[0].inventory_updated;
    const tableId = currentOrder.rows[0].table_id;

    let updateQuery = "UPDATE orders SET order_status = $1";
    let queryParams = [status];
    let paramCount = 1;

    if (estimated_ready_time) {
      paramCount++;
      updateQuery += `, estimated_ready_time = $${paramCount}`;
      queryParams.push(estimated_ready_time);
    }

    if (status === "completed") {
      paramCount++;
      updateQuery += `, completed_at = $${paramCount}`;
      queryParams.push(new Date());
    }

    if (status === "cancelled") {
      paramCount++;
      updateQuery += `, cancelled_at = $${paramCount}`;
      queryParams.push(new Date());
    }

    if (payment_method) {
      paramCount++;
      updateQuery += `, payment_method = $${paramCount}, payment_status = 'paid'`;
      queryParams.push(payment_method);
    }

    paramCount++;
    updateQuery += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    queryParams.push(id);

    const result = await client.query(updateQuery, queryParams);

    // If order is being cancelled and inventory was updated, restore ingredients
    if (status === "cancelled" && inventoryUpdated) {
      await client.query("SELECT restore_cancelled_order_ingredients($1)", [
        id,
      ]);
    }

    // If order is completed or cancelled, make table available
    // Also make table available if order is served (customer may still be at table but order is done)
    if (["completed", "cancelled"].includes(status) && tableId) {
      await client.query(
        "UPDATE restaurant_tables SET is_available = true WHERE id = $1",
        [tableId]
      );
    }

    await client.query("COMMIT");

    return success(res, result.rows[0], "Order status updated successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Apply discount to order
 */
const applyDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { discount_amount, discount_percentage } = req.body;

    if (!discount_amount && !discount_percentage) {
      return error(
        res,
        "Either discount_amount or discount_percentage is required",
        400
      );
    }

    // Get order details
    const orderResult = await db.query(
      "SELECT id, subtotal, order_status FROM orders WHERE id = $1",
      [id]
    );

    if (orderResult.rows.length === 0) {
      return notFound(res, "Order");
    }

    const order = orderResult.rows[0];

    if (!["pending", "confirmed", "preparing"].includes(order.order_status)) {
      return error(
        res,
        "Cannot apply discount to order in current status",
        400
      );
    }

    let finalDiscountAmount = 0;

    if (discount_amount) {
      finalDiscountAmount = parseFloat(discount_amount);
    } else if (discount_percentage) {
      finalDiscountAmount =
        (order.subtotal * parseFloat(discount_percentage)) / 100;
    }

    // Validate discount
    if (finalDiscountAmount < 0 || finalDiscountAmount > order.subtotal) {
      return error(res, "Invalid discount amount", 400);
    }

    const result = await db.query(
      "UPDATE orders SET discount_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [finalDiscountAmount, id]
    );

    // Order totals will be recalculated by trigger
    return success(res, result.rows[0], "Discount applied successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Get today's orders summary
 */
const getTodaysSummary = async (req, res, next) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE order_status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE order_status = 'preparing') as preparing_orders,
        COUNT(*) FILTER (WHERE order_status = 'ready') as ready_orders,
        COUNT(*) FILTER (WHERE order_status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE order_status = 'cancelled') as cancelled_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE order_status NOT IN ('cancelled')), 0) as total_revenue,
        COALESCE(SUM(food_cost) FILTER (WHERE order_status NOT IN ('cancelled')), 0) as total_food_cost,
        COALESCE(AVG(total_amount) FILTER (WHERE order_status = 'completed'), 0) as avg_order_value,
        COALESCE(SUM(total_amount) - SUM(food_cost) FILTER (WHERE order_status NOT IN ('cancelled')), 0) as gross_profit
      FROM orders
      WHERE DATE(order_date) = CURRENT_DATE
    `;

    const result = await db.query(summaryQuery);

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * Get order analytics/reports
 */
const getOrderAnalytics = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;

    let dateFilter = "";
    const params = [];

    if (date_from && date_to) {
      dateFilter = "WHERE DATE(order_date) BETWEEN $1 AND $2";
      params.push(date_from, date_to);
    } else if (date_from) {
      dateFilter = "WHERE DATE(order_date) >= $1";
      params.push(date_from);
    } else if (date_to) {
      dateFilter = "WHERE DATE(order_date) <= $1";
      params.push(date_to);
    }

    // Sales summary
    const salesQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(food_cost), 0) as total_food_cost,
        COALESCE(AVG(total_amount), 0) as average_order_value,
        COALESCE(SUM(total_amount) - SUM(food_cost), 0) as gross_profit
      FROM orders 
      ${dateFilter} AND order_status NOT IN ('cancelled')
    `;

    // Status breakdown
    const statusQuery = `
      SELECT 
        order_status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      ${dateFilter}
      GROUP BY order_status
      ORDER BY count DESC
    `;

    // Order type breakdown
    const typeQuery = `
      SELECT 
        order_type,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      ${dateFilter} AND order_status NOT IN ('cancelled')
      GROUP BY order_type
      ORDER BY count DESC
    `;

    const [salesResult, statusResult, typeResult] = await Promise.all([
      db.query(salesQuery, params),
      db.query(statusQuery, params),
      db.query(typeQuery, params),
    ]);

    return success(res, {
      summary: salesResult.rows[0],
      order_status_breakdown: statusResult.rows,
      order_type_breakdown: typeResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  addOrderItems,
  checkIngredientAvailability,
  confirmOrder,
  updateOrderStatus,
  applyDiscount,
  getTodaysSummary,
  getOrderAnalytics,
};
