-- Enhanced Restaurant Order Management System with Inventory
-- This script adds inventory management capabilities to the existing schema

-- Create database if it doesn't exist
-- Note: This script runs automatically when the PostgreSQL container starts

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- EXISTING TABLES (Enhanced with modifications)
-- =============================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email) VALUES 
    ('John Doe', 'john.doe@example.com'),
    ('Jane Smith', 'jane.smith@example.com'),
    ('Bob Johnson', 'bob.johnson@example.com')
ON CONFLICT (email) DO NOTHING;

-- Create index on email for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 1. CATEGORIES TABLE (Menu Sections)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NEW INVENTORY TABLES
-- =============================================

-- 2. UNITS TABLE (for ingredient measurements)
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'grams', 'liters', 'pieces', 'cups', 'tablespoons', etc.
    abbreviation VARCHAR(10) NOT NULL UNIQUE, -- 'g', 'l', 'pcs', 'cups', 'tbsp', etc.
    type VARCHAR(20) NOT NULL CHECK (type IN ('weight', 'volume', 'count')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. INGREDIENTS TABLE
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    unit_id INTEGER REFERENCES units(id) ON DELETE RESTRICT,
    cost_per_unit DECIMAL(10,4) DEFAULT 0.0000, -- Cost per unit for calculating food cost
    minimum_stock DECIMAL(10,2) DEFAULT 0.00, -- Minimum stock level for alerts
    current_stock DECIMAL(10,2) DEFAULT 0.00, -- Current available stock
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SUPPLIERS TABLE (for ingredient sourcing)
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. INVENTORY TRANSACTIONS TABLE (track all stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'adjustment', 'waste', 'return')),
    quantity DECIMAL(10,2) NOT NULL, -- Positive for additions, negative for usage
    unit_cost DECIMAL(10,4) DEFAULT 0.0000,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    reference_id INTEGER, -- Can reference order_id for usage transactions
    reference_type VARCHAR(50), -- 'order', 'purchase', 'adjustment', etc.
    notes TEXT,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ENHANCED MENU TABLES
-- =============================================

-- 6. MENU ITEMS TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    food_cost DECIMAL(10,2) DEFAULT 0.00, -- Calculated from ingredients
    profit_margin DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    spice_level INTEGER CHECK (spice_level >= 0 AND spice_level <= 5),
    preparation_time INTEGER DEFAULT 15, -- in minutes
    calories INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. RECIPES TABLE (Junction table for menu items and ingredients)
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_required DECIMAL(10,4) NOT NULL CHECK (quantity_required > 0),
    notes TEXT, -- Special preparation notes for this ingredient
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_item_id, ingredient_id)
);

-- =============================================
-- EXISTING TABLES CONTINUE
-- =============================================

-- 8. RESTAURANT TABLES
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. ORDERS TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE DEFAULT ('ORD-' || TO_CHAR(NOW(), 'YYYYMMDD-') || LPAD(nextval('orders_id_seq')::TEXT, 4, '0')),
    table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    order_status VARCHAR(20) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    order_type VARCHAR(20) DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    food_cost DECIMAL(10,2) DEFAULT 0.00, -- Total ingredient cost for this order
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'upi', 'wallet')),
    special_instructions TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_ready_time TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    inventory_updated BOOLEAN DEFAULT FALSE, -- Track if inventory has been deducted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. ORDER ITEMS TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    unit_food_cost DECIMAL(10,2) DEFAULT 0.00, -- Food cost per unit
    total_food_cost DECIMAL(10,2) DEFAULT 0.00, -- Total food cost for this line item
    special_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. STAFF TABLE
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(50) DEFAULT 'waiter' CHECK (role IN ('admin', 'manager', 'waiter', 'chef', 'cashier')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_active ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient ON inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON recipes(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_available ON restaurant_tables(is_available);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all relevant tables
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ingredients_updated_at ON ingredients;
CREATE TRIGGER update_ingredients_updated_at
    BEFORE UPDATE ON ingredients FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_tables_updated_at ON restaurant_tables;
CREATE TRIGGER update_restaurant_tables_updated_at
    BEFORE UPDATE ON restaurant_tables FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate food cost for a menu item
CREATE OR REPLACE FUNCTION calculate_menu_item_food_cost(menu_item_id_param INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_cost DECIMAL(10,2) := 0.00;
BEGIN
    SELECT COALESCE(SUM(r.quantity_required * i.cost_per_unit), 0.00)
    INTO total_cost
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.menu_item_id = menu_item_id_param;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update ingredient stock
CREATE OR REPLACE FUNCTION update_ingredient_stock(
    ingredient_id_param INTEGER,
    quantity_change DECIMAL(10,2),
    transaction_type_param VARCHAR(20),
    reference_id_param INTEGER DEFAULT NULL,
    reference_type_param VARCHAR(50) DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update the current stock
    UPDATE ingredients 
    SET current_stock = current_stock + quantity_change,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ingredient_id_param;
    
    -- Record the transaction
    INSERT INTO inventory_transactions (
        ingredient_id, 
        transaction_type, 
        quantity, 
        reference_id, 
        reference_type, 
        notes
    ) VALUES (
        ingredient_id_param,
        transaction_type_param,
        quantity_change,
        reference_id_param,
        reference_type_param,
        notes_param
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check ingredient availability for an order
CREATE OR REPLACE FUNCTION check_ingredient_availability(order_id_param INTEGER)
RETURNS TABLE(
    ingredient_name VARCHAR(100),
    required_quantity DECIMAL(10,2),
    available_quantity DECIMAL(10,2),
    unit_name VARCHAR(50),
    is_sufficient BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.name as ingredient_name,
        SUM(r.quantity_required * oi.quantity) as required_quantity,
        i.current_stock as available_quantity,
        u.name as unit_name,
        (i.current_stock >= SUM(r.quantity_required * oi.quantity)) as is_sufficient
    FROM order_items oi
    JOIN recipes r ON oi.menu_item_id = r.menu_item_id
    JOIN ingredients i ON r.ingredient_id = i.id
    JOIN units u ON i.unit_id = u.id
    WHERE oi.order_id = order_id_param
    GROUP BY i.id, i.name, i.current_stock, u.name
    ORDER BY is_sufficient ASC, i.name;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct ingredients for an order
CREATE OR REPLACE FUNCTION deduct_order_ingredients(order_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    ingredient_record RECORD;
    insufficient_stock BOOLEAN := FALSE;
    error_message TEXT := '';
BEGIN
    -- First check if all ingredients are available
    FOR ingredient_record IN
        SELECT 
            i.id as ingredient_id,
            i.name as ingredient_name,
            SUM(r.quantity_required * oi.quantity) as total_required,
            i.current_stock
        FROM order_items oi
        JOIN recipes r ON oi.menu_item_id = r.menu_item_id
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE oi.order_id = order_id_param
        GROUP BY i.id, i.name, i.current_stock
    LOOP
        IF ingredient_record.current_stock < ingredient_record.total_required THEN
            insufficient_stock := TRUE;
            error_message := error_message || 'Insufficient ' || ingredient_record.ingredient_name || 
                           ' (Required: ' || ingredient_record.total_required || 
                           ', Available: ' || ingredient_record.current_stock || '); ';
        END IF;
    END LOOP;
    
    -- If any ingredient is insufficient, raise an exception
    IF insufficient_stock THEN
        RAISE EXCEPTION 'Cannot process order due to insufficient ingredients: %', error_message;
    END IF;
    
    -- Deduct ingredients
    FOR ingredient_record IN
        SELECT 
            i.id as ingredient_id,
            SUM(r.quantity_required * oi.quantity) as total_required
        FROM order_items oi
        JOIN recipes r ON oi.menu_item_id = r.menu_item_id
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE oi.order_id = order_id_param
        GROUP BY i.id
    LOOP
        PERFORM update_ingredient_stock(
            ingredient_record.ingredient_id,
            -ingredient_record.total_required,
            'usage',
            order_id_param,
            'order',
            'Order ingredients deduction'
        );
    END LOOP;
    
    -- Mark order as inventory updated
    UPDATE orders 
    SET inventory_updated = TRUE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = order_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to restore ingredients for cancelled orders
CREATE OR REPLACE FUNCTION restore_cancelled_order_ingredients(order_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    ingredient_record RECORD;
    order_status_val VARCHAR(20);
BEGIN
    -- Check if order is cancelled and inventory was previously updated
    SELECT order_status INTO order_status_val
    FROM orders 
    WHERE id = order_id_param AND inventory_updated = TRUE;
    
    IF order_status_val = 'cancelled' THEN
        -- Restore ingredients
        FOR ingredient_record IN
            SELECT 
                i.id as ingredient_id,
                SUM(r.quantity_required * oi.quantity) as total_required
            FROM order_items oi
            JOIN recipes r ON oi.menu_item_id = r.menu_item_id
            JOIN ingredients i ON r.ingredient_id = i.id
            WHERE oi.order_id = order_id_param
            GROUP BY i.id
        LOOP
            PERFORM update_ingredient_stock(
                ingredient_record.ingredient_id,
                ingredient_record.total_required,
                'return',
                order_id_param,
                'cancelled_order',
                'Cancelled order ingredients restoration'
            );
        END LOOP;
        
        -- Update order total to 0 for cancelled orders
        UPDATE orders 
        SET total_amount = 0.00,
            subtotal = 0.00,
            tax_amount = 0.00,
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = order_id_param;
        
        UPDATE order_items 
        SET total_price = 0.00
        WHERE order_id = order_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate order totals (Enhanced)
CREATE OR REPLACE FUNCTION calculate_order_total(order_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    subtotal_calc DECIMAL(10,2);
    food_cost_calc DECIMAL(10,2);
    tax_rate DECIMAL(5,4) := 0.18; -- 18% GST
    discount_calc DECIMAL(10,2);
    tax_calc DECIMAL(10,2);
    total_calc DECIMAL(10,2);
    order_status_val VARCHAR(20);
BEGIN
    -- Get order status
    SELECT order_status INTO order_status_val FROM orders WHERE id = order_id_param;
    
    -- If order is cancelled, set everything to 0
    IF order_status_val = 'cancelled' THEN
        UPDATE orders 
        SET subtotal = 0.00,
            tax_amount = 0.00,
            total_amount = 0.00,
            food_cost = 0.00
        WHERE id = order_id_param;
        
        UPDATE order_items 
        SET total_price = 0.00,
            total_food_cost = 0.00
        WHERE order_id = order_id_param;
        
        RETURN;
    END IF;
    
    -- Calculate subtotal and food cost from order items
    SELECT 
        COALESCE(SUM(total_price), 0.00),
        COALESCE(SUM(total_food_cost), 0.00)
    INTO subtotal_calc, food_cost_calc
    FROM order_items
    WHERE order_id = order_id_param;
    
    -- Get existing discount (if any)
    SELECT COALESCE(discount_amount, 0.00)
    INTO discount_calc
    FROM orders
    WHERE id = order_id_param;
    
    -- Calculate tax on (subtotal - discount)
    tax_calc := (subtotal_calc - discount_calc) * tax_rate;
    
    -- Calculate total
    total_calc := subtotal_calc - discount_calc + tax_calc;
    
    -- Update order with calculated values
    UPDATE orders 
    SET 
        subtotal = subtotal_calc,
        tax_amount = tax_calc,
        total_amount = total_calc,
        food_cost = food_cost_calc
    WHERE id = order_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate order item food costs
CREATE OR REPLACE FUNCTION calculate_order_item_food_cost()
RETURNS TRIGGER AS $$
DECLARE
    unit_food_cost_calc DECIMAL(10,2);
BEGIN
    -- Calculate food cost for this menu item
    SELECT calculate_menu_item_food_cost(NEW.menu_item_id) INTO unit_food_cost_calc;
    
    -- Update the order item with food costs
    NEW.unit_food_cost := unit_food_cost_calc;
    NEW.total_food_cost := unit_food_cost_calc * NEW.quantity;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_food_cost ON order_items;
CREATE TRIGGER calculate_food_cost
    BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_item_food_cost();

-- Trigger to auto-calculate totals when order items are modified
CREATE OR REPLACE FUNCTION trigger_calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_order_total(OLD.order_id);
        RETURN OLD;
    ELSE
        PERFORM calculate_order_total(NEW.order_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_order_total ON order_items;
CREATE TRIGGER auto_calculate_order_total
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_order_total();
