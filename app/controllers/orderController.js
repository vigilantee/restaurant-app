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
        o.payment_status,
        o.payment_method,
        o.special_instructions,
        o.order_date,
        o.estimated_ready_time,
        o.completed_at,
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

    // Get order items
    const itemsQuery = `
      SELECT 
        oi.id,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
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

    await client.query("COMMIT");

    return created(res, orderResult.rows[0], "Order created successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

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
      "SELECT id, order_status FROM orders WHERE id = $1",
      [id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return notFound(res, "Order");
    }

    if (["completed", "cancelled"].includes(orderCheck.rows[0].order_status)) {
      await client.query("ROLLBACK");
      return error(res, "Cannot modify completed or cancelled orders", 400);
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

    // Insert order items
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

    // Update order totals (this will be handled by the trigger)
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
 * Update order status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
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
      return error(res, "Invalid order status", 400);
    }

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

    if (payment_method) {
      paramCount++;
      updateQuery += `, payment_method = $${paramCount}, payment_status = 'paid'`;
      queryParams.push(payment_method);
    }

    paramCount++;
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    queryParams.push(id);

    const result = await db.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return notFound(res, "Order");
    }

    // If order is completed or cancelled, make table available
    if (
      ["completed", "cancelled"].includes(status) &&
      result.rows[0].table_id
    ) {
      await db.query(
        "UPDATE restaurant_tables SET is_available = true WHERE id = $1",
        [result.rows[0].table_id]
      );
    }

    return success(res, result.rows[0], "Order status updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Apply discount to order
 */
const applyDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { discount_amount } = req.body;

    if (!discount_amount || discount_amount < 0) {
      return error(res, "Valid discount amount is required", 400);
    }

    const result = await db.query(
      "UPDATE orders SET discount_amount = $1 WHERE id = $2 RETURNING *",
      [discount_amount, id]
    );

    if (result.rows.length === 0) {
      return notFound(res, "Order");
    }

    // Recalculate totals (will be done by trigger)
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
        COALESCE(SUM(total_amount) FILTER (WHERE order_status = 'completed'), 0) as total_revenue,
        COALESCE(AVG(total_amount) FILTER (WHERE order_status = 'completed'), 0) as avg_order_value
      FROM orders
      WHERE DATE(order_date) = CURRENT_DATE
    `;

    const result = await db.query(summaryQuery);

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  addOrderItems,
  updateOrderStatus,
  applyDiscount,
  getTodaysSummary,
};
