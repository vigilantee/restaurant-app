-- Schema initialization from prepend.sql
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


-- End of schema initialization
-- =====================================


-- Restaurant Database Complete Setup and Population Script
-- Generated dynamically from JSON data
-- Includes schema initialization and sample data population

BEGIN;


-- Insert Users
INSERT INTO users (name, email) VALUES 
    ('john doe', 'john.doe@example.com'),
    ('jane smith', 'jane.smith@example.com'),
    ('bob johnson', 'bob.johnson@example.com')
ON CONFLICT (email) DO NOTHING;

-- Insert Units
INSERT INTO units (name, abbreviation, type) VALUES 
    ('grams', 'g', 'weight'),
    ('kilograms', 'kg', 'weight'),
    ('liters', 'l', 'volume'),
    ('milliliters', 'ml', 'volume'),
    ('pieces', 'pcs', 'count'),
    ('cups', 'cups', 'volume'),
    ('tablespoons', 'tbsp', 'volume'),
    ('teaspoons', 'tsp', 'volume')
ON CONFLICT (name) DO NOTHING;

-- Insert Suppliers
INSERT INTO suppliers (name, contact_person, phone, email) VALUES 
    ('fresh fruits supplier', 'raj kumar', '9876543210', 'raj@freshfruits.com'),
    ('dairy products co.', 'sita devi', '9876543211', 'sita@dairy.com'),
    ('spices & more', 'arjun singh', '9876543212', 'arjun@spices.com'),
    ('vegetables direct', 'priya sharma', '9876543213', 'priya@vegetables.com'),
    ('grains & cereals', 'mohan lal', '9876543214', 'mohan@grains.com')
ON CONFLICT DO NOTHING;

-- Insert Ingredients
INSERT INTO ingredients (name, description, unit_id, cost_per_unit, minimum_stock, current_stock) VALUES 
    ('mango', 'fresh mango for shakes and desserts', (SELECT id FROM units WHERE name = 'grams'), 0.012, 2000, 5000),
    ('banana', 'fresh bananas', (SELECT id FROM units WHERE name = 'grams'), 0.008, 1000, 2500),
    ('strawberry', 'fresh strawberries', (SELECT id FROM units WHERE name = 'grams'), 0.015, 500, 800),
    ('milk', 'fresh dairy milk', (SELECT id FROM units WHERE name = 'milliliters'), 0.001, 5000, 15000),
    ('yogurt', 'fresh yogurt', (SELECT id FROM units WHERE name = 'grams'), 0.004, 1000, 3000),
    ('ghee', 'pure clarified butter', (SELECT id FROM units WHERE name = 'milliliters'), 0.012, 500, 2000),
    ('vanilla ice cream', 'premium vanilla ice cream', (SELECT id FROM units WHERE name = 'grams'), 0.008, 1000, 2000),
    ('sugar', 'white granulated sugar', (SELECT id FROM units WHERE name = 'grams'), 0.002, 1000, 3000),
    ('chocolate syrup', 'rich chocolate syrup', (SELECT id FROM units WHERE name = 'milliliters'), 0.005, 500, 1200),
    ('salt', 'table salt', (SELECT id FROM units WHERE name = 'grams'), 0.001, 500, 2000),
    ('basmati rice', 'premium basmati rice', (SELECT id FROM units WHERE name = 'grams'), 0.003, 5000, 15000),
    ('regular rice', 'regular white rice', (SELECT id FROM units WHERE name = 'grams'), 0.002, 3000, 10000),
    ('chicken', 'fresh chicken pieces', (SELECT id FROM units WHERE name = 'grams'), 0.025, 2000, 8000),
    ('mutton', 'fresh mutton pieces', (SELECT id FROM units WHERE name = 'grams'), 0.045, 1000, 3000),
    ('paneer', 'fresh cottage cheese', (SELECT id FROM units WHERE name = 'grams'), 0.02, 500, 1500),
    ('eggs', 'fresh chicken eggs', (SELECT id FROM units WHERE name = 'pieces'), 0.5, 50, 200),
    ('onions', 'fresh onions', (SELECT id FROM units WHERE name = 'grams'), 0.002, 2000, 10000),
    ('tomatoes', 'fresh tomatoes', (SELECT id FROM units WHERE name = 'grams'), 0.003, 2000, 8000),
    ('mixed vegetables', 'seasonal mixed vegetables', (SELECT id FROM units WHERE name = 'grams'), 0.005, 2000, 5000),
    ('potatoes', 'fresh potatoes', (SELECT id FROM units WHERE name = 'grams'), 0.002, 3000, 8000),
    ('cauliflower', 'fresh cauliflower', (SELECT id FROM units WHERE name = 'grams'), 0.004, 1000, 3000),
    ('ginger-garlic paste', 'fresh ginger garlic paste', (SELECT id FROM units WHERE name = 'grams'), 0.008, 500, 1500),
    ('biryani masala', 'special biryani spice mix', (SELECT id FROM units WHERE name = 'grams'), 0.02, 200, 800),
    ('garam masala', 'mixed spice powder', (SELECT id FROM units WHERE name = 'grams'), 0.015, 200, 600),
    ('turmeric powder', 'pure turmeric powder', (SELECT id FROM units WHERE name = 'grams'), 0.01, 200, 500),
    ('red chili powder', 'red chili powder', (SELECT id FROM units WHERE name = 'grams'), 0.012, 200, 600),
    ('cumin powder', 'ground cumin seeds', (SELECT id FROM units WHERE name = 'grams'), 0.018, 100, 300),
    ('coriander powder', 'ground coriander seeds', (SELECT id FROM units WHERE name = 'grams'), 0.015, 100, 400),
    ('cashews', 'premium cashew nuts', (SELECT id FROM units WHERE name = 'grams'), 0.08, 200, 500),
    ('raisins', 'dry grapes/raisins', (SELECT id FROM units WHERE name = 'grams'), 0.06, 100, 300),
    ('almonds', 'whole almonds', (SELECT id FROM units WHERE name = 'grams'), 0.1, 100, 250),
    ('cooking oil', 'refined cooking oil', (SELECT id FROM units WHERE name = 'milliliters'), 0.002, 2000, 8000),
    ('butter', 'fresh butter', (SELECT id FROM units WHERE name = 'grams'), 0.008, 500, 1500),
    ('wheat flour', 'all-purpose wheat flour', (SELECT id FROM units WHERE name = 'grams'), 0.002, 5000, 15000),
    ('rice flour', 'fine rice flour', (SELECT id FROM units WHERE name = 'grams'), 0.003, 1000, 3000),
    ('urad dal', 'black gram lentils', (SELECT id FROM units WHERE name = 'grams'), 0.008, 1000, 3000),
    ('chana dal', 'split chickpea lentils', (SELECT id FROM units WHERE name = 'grams'), 0.006, 1000, 2500),
    ('black lentils', 'whole black lentils for dal makhani', (SELECT id FROM units WHERE name = 'grams'), 0.009, 1000, 2000),
    ('kidney beans', 'rajma for curry', (SELECT id FROM units WHERE name = 'grams'), 0.007, 1000, 2000),
    ('soy sauce', 'dark soy sauce', (SELECT id FROM units WHERE name = 'milliliters'), 0.004, 500, 1500),
    ('vinegar', 'white vinegar', (SELECT id FROM units WHERE name = 'milliliters'), 0.003, 500, 1200),
    ('noodles', 'hakka noodles', (SELECT id FROM units WHERE name = 'grams'), 0.004, 2000, 5000),
    ('cornflour', 'corn starch', (SELECT id FROM units WHERE name = 'grams'), 0.005, 500, 1500),
    ('green chili sauce', 'spicy green chili sauce', (SELECT id FROM units WHERE name = 'milliliters'), 0.006, 300, 800),
    ('tomato ketchup', 'tomato sauce', (SELECT id FROM units WHERE name = 'milliliters'), 0.004, 500, 1200),
    ('tea leaves', 'black tea leaves', (SELECT id FROM units WHERE name = 'grams'), 0.02, 200, 800),
    ('coffee powder', 'ground coffee', (SELECT id FROM units WHERE name = 'grams'), 0.03, 200, 600),
    ('lime', 'fresh lime for drinks', (SELECT id FROM units WHERE name = 'pieces'), 0.3, 20, 100),
    ('khoya', 'milk solids for sweets', (SELECT id FROM units WHERE name = 'grams'), 0.025, 500, 1000),
    ('rose water', 'rose essence', (SELECT id FROM units WHERE name = 'milliliters'), 0.01, 200, 500),
    ('cardamom', 'green cardamom pods', (SELECT id FROM units WHERE name = 'grams'), 0.2, 50, 150)
ON CONFLICT (name) DO NOTHING;

-- Insert Categories
INSERT INTO categories (name, description, display_order) VALUES 
    ('beverages', 'hot and cold drinks', 1),
    ('shakes', 'fresh fruit shakes and smoothies', 2),
    ('north indian', 'traditional north indian cuisine', 3),
    ('south indian', 'authentic south indian dishes', 4),
    ('chinese', 'indo-chinese specialties', 5),
    ('desserts', 'sweet treats and ice creams', 6),
    ('starters', 'appetizers and snacks', 7),
    ('breads', 'freshly baked indian breads', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert Menu Items
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, spice_level, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'beverages'), 'masala tea', 'traditional indian spiced tea', 25, true, NULL, 5),
    ((SELECT id FROM categories WHERE name = 'beverages'), 'coffee', 'hot filter coffee', 30, true, NULL, 5),
    ((SELECT id FROM categories WHERE name = 'beverages'), 'cold coffee', 'iced coffee with milk', 45, true, NULL, 8),
    ((SELECT id FROM categories WHERE name = 'beverages'), 'fresh lime water', 'sweet/salt lime water', 35, true, NULL, 3),
    ((SELECT id FROM categories WHERE name = 'beverages'), 'lassi', 'traditional yogurt drink', 40, true, NULL, 5),
    ((SELECT id FROM categories WHERE name = 'shakes'), 'banana shake', 'fresh banana blended with milk', 60, true, NULL, 5),
    ((SELECT id FROM categories WHERE name = 'shakes'), 'mango shake', 'fresh mango shake with cream', 75, true, NULL, 7),
    ((SELECT id FROM categories WHERE name = 'shakes'), 'chocolate shake', 'rich chocolate milkshake', 70, true, NULL, 6),
    ((SELECT id FROM categories WHERE name = 'shakes'), 'strawberry shake', 'fresh strawberry milkshake', 80, true, NULL, 6),
    ((SELECT id FROM categories WHERE name = 'shakes'), 'mixed fruit shake', 'seasonal fruits blended together', 85, true, NULL, 8),
    ((SELECT id FROM categories WHERE name = 'north indian'), 'chicken biryani', 'aromatic basmati rice with tender chicken', 180, false, 3, 25),
    ((SELECT id FROM categories WHERE name = 'north indian'), 'mutton biryani', 'royal mutton biryani with boiled egg', 220, false, 3, 30),
    ((SELECT id FROM categories WHERE name = 'north indian'), 'veg biryani', 'mixed vegetable biryani with raita', 150, true, 2, 20),
    ((SELECT id FROM categories WHERE name = 'north indian'), 'butter chicken', 'creamy tomato-based chicken curry', 200, false, 2, 20),
    ((SELECT id FROM categories WHERE name = 'north indian'), 'dal makhani', 'rich black lentils in butter and cream', 140, true, 1, 15),
    ((SELECT id FROM categories WHERE name = 'north indian'), 'paneer butter masala', 'cottage cheese in rich tomato gravy', 160, true, 2, 15),
    ((SELECT id FROM categories WHERE name = 'north indian'), 'rajma rice', 'kidney beans curry with steamed rice', 120, true, 2, 18),
    ((SELECT id FROM categories WHERE name = 'south indian'), 'masala dosa', 'crispy crepe with spiced potato filling', 80, true, 2, 12),
    ((SELECT id FROM categories WHERE name = 'south indian'), 'plain dosa', 'simple crispy rice and lentil crepe', 60, true, 1, 10),
    ((SELECT id FROM categories WHERE name = 'south indian'), 'idli sambar', '3 steamed rice cakes with lentil curry', 70, true, 2, 8),
    ((SELECT id FROM categories WHERE name = 'south indian'), 'vada sambar', '2 fried lentil donuts with sambar', 75, true, 2, 10),
    ((SELECT id FROM categories WHERE name = 'south indian'), 'uthappam', 'thick pancake with vegetables', 85, true, 2, 15),
    ((SELECT id FROM categories WHERE name = 'chinese'), 'veg fried rice', 'wok-tossed rice with mixed vegetables', 110, true, 2, 12),
    ((SELECT id FROM categories WHERE name = 'chinese'), 'chicken fried rice', 'fried rice with chicken and vegetables', 130, false, 2, 15),
    ((SELECT id FROM categories WHERE name = 'chinese'), 'veg noodles', 'stir-fried noodles with vegetables', 120, true, 2, 12),
    ((SELECT id FROM categories WHERE name = 'chinese'), 'chicken noodles', 'hakka noodles with chicken', 140, false, 2, 15),
    ((SELECT id FROM categories WHERE name = 'chinese'), 'gobi manchurian', 'crispy cauliflower in spicy sauce', 135, true, 3, 18),
    ((SELECT id FROM categories WHERE name = 'chinese'), 'chicken manchurian', 'chicken balls in tangy sauce', 155, false, 3, 20),
    ((SELECT id FROM categories WHERE name = 'starters'), 'samosa', 'crispy pastry with spiced potato filling', 20, true, 2, 5),
    ((SELECT id FROM categories WHERE name = 'starters'), 'pakoda', 'mixed vegetable fritters', 60, true, 2, 8),
    ((SELECT id FROM categories WHERE name = 'starters'), 'chicken tikka', 'grilled marinated chicken pieces', 180, false, 3, 20),
    ((SELECT id FROM categories WHERE name = 'starters'), 'paneer tikka', 'grilled cottage cheese with spices', 160, true, 2, 18),
    ((SELECT id FROM categories WHERE name = 'breads'), 'roti', 'plain wheat flatbread', 15, true, NULL, 3),
    ((SELECT id FROM categories WHERE name = 'breads'), 'butter roti', 'roti brushed with butter', 20, true, NULL, 3),
    ((SELECT id FROM categories WHERE name = 'breads'), 'naan', 'soft leavened bread', 25, true, NULL, 5),
    ((SELECT id FROM categories WHERE name = 'breads'), 'garlic naan', 'naan topped with garlic', 35, true, NULL, 6),
    ((SELECT id FROM categories WHERE name = 'breads'), 'butter naan', 'naan brushed with butter', 30, true, NULL, 5),
    ((SELECT id FROM categories WHERE name = 'desserts'), 'gulab jamun', 'sweet milk dumplings in sugar syrup', 60, true, NULL, 2),
    ((SELECT id FROM categories WHERE name = 'desserts'), 'rasmalai', 'cottage cheese balls in sweetened milk', 80, true, NULL, 2),
    ((SELECT id FROM categories WHERE name = 'desserts'), 'ice cream', 'vanilla/chocolate/strawberry', 50, true, NULL, 2),
    ((SELECT id FROM categories WHERE name = 'desserts'), 'kulfi', 'traditional indian ice cream', 45, true, NULL, 2);

-- Insert Recipes
-- Recipe for masala tea
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'masala tea'), (SELECT id FROM ingredients WHERE name = 'tea leaves'), 5),
    ((SELECT id FROM menu_items WHERE name = 'masala tea'), (SELECT id FROM ingredients WHERE name = 'milk'), 100),
    ((SELECT id FROM menu_items WHERE name = 'masala tea'), (SELECT id FROM ingredients WHERE name = 'sugar'), 10);

-- Recipe for coffee
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'coffee'), (SELECT id FROM ingredients WHERE name = 'coffee powder'), 8),
    ((SELECT id FROM menu_items WHERE name = 'coffee'), (SELECT id FROM ingredients WHERE name = 'milk'), 80),
    ((SELECT id FROM menu_items WHERE name = 'coffee'), (SELECT id FROM ingredients WHERE name = 'sugar'), 12);

-- Recipe for cold coffee
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'cold coffee'), (SELECT id FROM ingredients WHERE name = 'coffee powder'), 10),
    ((SELECT id FROM menu_items WHERE name = 'cold coffee'), (SELECT id FROM ingredients WHERE name = 'milk'), 150),
    ((SELECT id FROM menu_items WHERE name = 'cold coffee'), (SELECT id FROM ingredients WHERE name = 'sugar'), 20),
    ((SELECT id FROM menu_items WHERE name = 'cold coffee'), (SELECT id FROM ingredients WHERE name = 'vanilla ice cream'), 30);

-- Recipe for fresh lime water
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'fresh lime water'), (SELECT id FROM ingredients WHERE name = 'lime'), 1),
    ((SELECT id FROM menu_items WHERE name = 'fresh lime water'), (SELECT id FROM ingredients WHERE name = 'sugar'), 15),
    ((SELECT id FROM menu_items WHERE name = 'fresh lime water'), (SELECT id FROM ingredients WHERE name = 'salt'), 2);

-- Recipe for lassi
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'lassi'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 150),
    ((SELECT id FROM menu_items WHERE name = 'lassi'), (SELECT id FROM ingredients WHERE name = 'sugar'), 20);

-- Recipe for banana shake
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'banana shake'), (SELECT id FROM ingredients WHERE name = 'banana'), 120),
    ((SELECT id FROM menu_items WHERE name = 'banana shake'), (SELECT id FROM ingredients WHERE name = 'milk'), 200),
    ((SELECT id FROM menu_items WHERE name = 'banana shake'), (SELECT id FROM ingredients WHERE name = 'sugar'), 20);

-- Recipe for mango shake
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'mango shake'), (SELECT id FROM ingredients WHERE name = 'mango'), 150),
    ((SELECT id FROM menu_items WHERE name = 'mango shake'), (SELECT id FROM ingredients WHERE name = 'milk'), 200),
    ((SELECT id FROM menu_items WHERE name = 'mango shake'), (SELECT id FROM ingredients WHERE name = 'sugar'), 25),
    ((SELECT id FROM menu_items WHERE name = 'mango shake'), (SELECT id FROM ingredients WHERE name = 'vanilla ice cream'), 30);

-- Recipe for chocolate shake
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'chocolate shake'), (SELECT id FROM ingredients WHERE name = 'milk'), 200),
    ((SELECT id FROM menu_items WHERE name = 'chocolate shake'), (SELECT id FROM ingredients WHERE name = 'chocolate syrup'), 30),
    ((SELECT id FROM menu_items WHERE name = 'chocolate shake'), (SELECT id FROM ingredients WHERE name = 'vanilla ice cream'), 50),
    ((SELECT id FROM menu_items WHERE name = 'chocolate shake'), (SELECT id FROM ingredients WHERE name = 'sugar'), 15);

-- Recipe for strawberry shake
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'strawberry shake'), (SELECT id FROM ingredients WHERE name = 'strawberry'), 100),
    ((SELECT id FROM menu_items WHERE name = 'strawberry shake'), (SELECT id FROM ingredients WHERE name = 'milk'), 200),
    ((SELECT id FROM menu_items WHERE name = 'strawberry shake'), (SELECT id FROM ingredients WHERE name = 'sugar'), 25),
    ((SELECT id FROM menu_items WHERE name = 'strawberry shake'), (SELECT id FROM ingredients WHERE name = 'vanilla ice cream'), 30);

-- Recipe for mixed fruit shake
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'mixed fruit shake'), (SELECT id FROM ingredients WHERE name = 'mango'), 75),
    ((SELECT id FROM menu_items WHERE name = 'mixed fruit shake'), (SELECT id FROM ingredients WHERE name = 'banana'), 60),
    ((SELECT id FROM menu_items WHERE name = 'mixed fruit shake'), (SELECT id FROM ingredients WHERE name = 'strawberry'), 50),
    ((SELECT id FROM menu_items WHERE name = 'mixed fruit shake'), (SELECT id FROM ingredients WHERE name = 'milk'), 200),
    ((SELECT id FROM menu_items WHERE name = 'mixed fruit shake'), (SELECT id FROM ingredients WHERE name = 'sugar'), 30),
    ((SELECT id FROM menu_items WHERE name = 'mixed fruit shake'), (SELECT id FROM ingredients WHERE name = 'vanilla ice cream'), 40);

-- Recipe for chicken biryani
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'basmati rice'), 200),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'chicken'), 250),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'onions'), 100),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'tomatoes'), 50),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 15),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'biryani masala'), 10),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 50),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'ghee'), 20),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'cashews'), 10),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'raisins'), 5),
    ((SELECT id FROM menu_items WHERE name = 'chicken biryani'), (SELECT id FROM ingredients WHERE name = 'eggs'), 1);

-- Recipe for mutton biryani
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'basmati rice'), 200),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'mutton'), 300),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'onions'), 120),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'tomatoes'), 60),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 20),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'biryani masala'), 15),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 80),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'ghee'), 25),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'cashews'), 15),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'raisins'), 8),
    ((SELECT id FROM menu_items WHERE name = 'mutton biryani'), (SELECT id FROM ingredients WHERE name = 'eggs'), 1);

-- Recipe for veg biryani
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'basmati rice'), 200),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 200),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'onions'), 80),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'tomatoes'), 40),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 10),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'biryani masala'), 8),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 40),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'ghee'), 15),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'cashews'), 8),
    ((SELECT id FROM menu_items WHERE name = 'veg biryani'), (SELECT id FROM ingredients WHERE name = 'raisins'), 5);

-- Recipe for butter chicken
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'butter chicken'), (SELECT id FROM ingredients WHERE name = 'chicken'), 300),
    ((SELECT id FROM menu_items WHERE name = 'butter chicken'), (SELECT id FROM ingredients WHERE name = 'butter'), 30),
    ((SELECT id FROM menu_items WHERE name = 'butter chicken'), (SELECT id FROM ingredients WHERE name = 'onions'), 100),
    ((SELECT id FROM menu_items WHERE name = 'butter chicken'), (SELECT id FROM ingredients WHERE name = 'tomatoes'), 120),
    ((SELECT id FROM menu_items WHERE name = 'butter chicken'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 15),
    ((SELECT id FROM menu_items WHERE name = 'butter chicken'), (SELECT id FROM ingredients WHERE name = 'garam masala'), 8),
    ((SELECT id FROM menu_items WHERE name = 'butter chicken'), (SELECT id FROM ingredients WHERE name = 'milk'), 100);

-- Recipe for dal makhani
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'dal makhani'), (SELECT id FROM ingredients WHERE name = 'black lentils'), 150),
    ((SELECT id FROM menu_items WHERE name = 'dal makhani'), (SELECT id FROM ingredients WHERE name = 'butter'), 30),
    ((SELECT id FROM menu_items WHERE name = 'dal makhani'), (SELECT id FROM ingredients WHERE name = 'onions'), 50),
    ((SELECT id FROM menu_items WHERE name = 'dal makhani'), (SELECT id FROM ingredients WHERE name = 'tomatoes'), 80),
    ((SELECT id FROM menu_items WHERE name = 'dal makhani'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 10),
    ((SELECT id FROM menu_items WHERE name = 'dal makhani'), (SELECT id FROM ingredients WHERE name = 'garam masala'), 5);

-- Recipe for paneer butter masala
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'paneer butter masala'), (SELECT id FROM ingredients WHERE name = 'paneer'), 200),
    ((SELECT id FROM menu_items WHERE name = 'paneer butter masala'), (SELECT id FROM ingredients WHERE name = 'butter'), 25),
    ((SELECT id FROM menu_items WHERE name = 'paneer butter masala'), (SELECT id FROM ingredients WHERE name = 'onions'), 80),
    ((SELECT id FROM menu_items WHERE name = 'paneer butter masala'), (SELECT id FROM ingredients WHERE name = 'tomatoes'), 100),
    ((SELECT id FROM menu_items WHERE name = 'paneer butter masala'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 12),
    ((SELECT id FROM menu_items WHERE name = 'paneer butter masala'), (SELECT id FROM ingredients WHERE name = 'garam masala'), 5),
    ((SELECT id FROM menu_items WHERE name = 'paneer butter masala'), (SELECT id FROM ingredients WHERE name = 'milk'), 50);

-- Recipe for rajma rice
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'rajma rice'), (SELECT id FROM ingredients WHERE name = 'kidney beans'), 200),
    ((SELECT id FROM menu_items WHERE name = 'rajma rice'), (SELECT id FROM ingredients WHERE name = 'regular rice'), 150),
    ((SELECT id FROM menu_items WHERE name = 'rajma rice'), (SELECT id FROM ingredients WHERE name = 'onions'), 80),
    ((SELECT id FROM menu_items WHERE name = 'rajma rice'), (SELECT id FROM ingredients WHERE name = 'tomatoes'), 100),
    ((SELECT id FROM menu_items WHERE name = 'rajma rice'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 10),
    ((SELECT id FROM menu_items WHERE name = 'rajma rice'), (SELECT id FROM ingredients WHERE name = 'garam masala'), 5),
    ((SELECT id FROM menu_items WHERE name = 'rajma rice'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 20);

-- Recipe for masala dosa
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'masala dosa'), (SELECT id FROM ingredients WHERE name = 'rice flour'), 100),
    ((SELECT id FROM menu_items WHERE name = 'masala dosa'), (SELECT id FROM ingredients WHERE name = 'urad dal'), 30),
    ((SELECT id FROM menu_items WHERE name = 'masala dosa'), (SELECT id FROM ingredients WHERE name = 'potatoes'), 150),
    ((SELECT id FROM menu_items WHERE name = 'masala dosa'), (SELECT id FROM ingredients WHERE name = 'onions'), 50),
    ((SELECT id FROM menu_items WHERE name = 'masala dosa'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 15),
    ((SELECT id FROM menu_items WHERE name = 'masala dosa'), (SELECT id FROM ingredients WHERE name = 'turmeric powder'), 2),
    ((SELECT id FROM menu_items WHERE name = 'masala dosa'), (SELECT id FROM ingredients WHERE name = 'cumin powder'), 3);

-- Recipe for plain dosa
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'plain dosa'), (SELECT id FROM ingredients WHERE name = 'rice flour'), 80),
    ((SELECT id FROM menu_items WHERE name = 'plain dosa'), (SELECT id FROM ingredients WHERE name = 'urad dal'), 25),
    ((SELECT id FROM menu_items WHERE name = 'plain dosa'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 10);

-- Recipe for idli sambar
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'idli sambar'), (SELECT id FROM ingredients WHERE name = 'rice flour'), 60),
    ((SELECT id FROM menu_items WHERE name = 'idli sambar'), (SELECT id FROM ingredients WHERE name = 'urad dal'), 40),
    ((SELECT id FROM menu_items WHERE name = 'idli sambar'), (SELECT id FROM ingredients WHERE name = 'chana dal'), 30),
    ((SELECT id FROM menu_items WHERE name = 'idli sambar'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 100),
    ((SELECT id FROM menu_items WHERE name = 'idli sambar'), (SELECT id FROM ingredients WHERE name = 'turmeric powder'), 3),
    ((SELECT id FROM menu_items WHERE name = 'idli sambar'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 10);

-- Recipe for vada sambar
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'vada sambar'), (SELECT id FROM ingredients WHERE name = 'urad dal'), 80),
    ((SELECT id FROM menu_items WHERE name = 'vada sambar'), (SELECT id FROM ingredients WHERE name = 'chana dal'), 40),
    ((SELECT id FROM menu_items WHERE name = 'vada sambar'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 100),
    ((SELECT id FROM menu_items WHERE name = 'vada sambar'), (SELECT id FROM ingredients WHERE name = 'turmeric powder'), 3),
    ((SELECT id FROM menu_items WHERE name = 'vada sambar'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 50);

-- Recipe for uthappam
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'uthappam'), (SELECT id FROM ingredients WHERE name = 'rice flour'), 120),
    ((SELECT id FROM menu_items WHERE name = 'uthappam'), (SELECT id FROM ingredients WHERE name = 'urad dal'), 30),
    ((SELECT id FROM menu_items WHERE name = 'uthappam'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 80),
    ((SELECT id FROM menu_items WHERE name = 'uthappam'), (SELECT id FROM ingredients WHERE name = 'onions'), 40),
    ((SELECT id FROM menu_items WHERE name = 'uthappam'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 15);

-- Recipe for veg fried rice
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'veg fried rice'), (SELECT id FROM ingredients WHERE name = 'regular rice'), 200),
    ((SELECT id FROM menu_items WHERE name = 'veg fried rice'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 150),
    ((SELECT id FROM menu_items WHERE name = 'veg fried rice'), (SELECT id FROM ingredients WHERE name = 'onions'), 50),
    ((SELECT id FROM menu_items WHERE name = 'veg fried rice'), (SELECT id FROM ingredients WHERE name = 'soy sauce'), 15),
    ((SELECT id FROM menu_items WHERE name = 'veg fried rice'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 20),
    ((SELECT id FROM menu_items WHERE name = 'veg fried rice'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 8);

-- Recipe for chicken fried rice
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'regular rice'), 200),
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'chicken'), 150),
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 100),
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'onions'), 50),
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'soy sauce'), 15),
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 25),
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 10),
    ((SELECT id FROM menu_items WHERE name = 'chicken fried rice'), (SELECT id FROM ingredients WHERE name = 'eggs'), 1);

-- Recipe for veg noodles
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'veg noodles'), (SELECT id FROM ingredients WHERE name = 'noodles'), 150),
    ((SELECT id FROM menu_items WHERE name = 'veg noodles'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 120),
    ((SELECT id FROM menu_items WHERE name = 'veg noodles'), (SELECT id FROM ingredients WHERE name = 'onions'), 40),
    ((SELECT id FROM menu_items WHERE name = 'veg noodles'), (SELECT id FROM ingredients WHERE name = 'soy sauce'), 12),
    ((SELECT id FROM menu_items WHERE name = 'veg noodles'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 20),
    ((SELECT id FROM menu_items WHERE name = 'veg noodles'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 8),
    ((SELECT id FROM menu_items WHERE name = 'veg noodles'), (SELECT id FROM ingredients WHERE name = 'green chili sauce'), 10);

-- Recipe for chicken noodles
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'noodles'), 150),
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'chicken'), 120),
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 80),
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'onions'), 40),
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'soy sauce'), 12),
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 25),
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 10),
    ((SELECT id FROM menu_items WHERE name = 'chicken noodles'), (SELECT id FROM ingredients WHERE name = 'green chili sauce'), 10);

-- Recipe for gobi manchurian
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'cauliflower'), 300),
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'onions'), 80),
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'soy sauce'), 20),
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'tomato ketchup'), 25),
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'green chili sauce'), 15),
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'cornflour'), 30),
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 50),
    ((SELECT id FROM menu_items WHERE name = 'gobi manchurian'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 12);

-- Recipe for chicken manchurian
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'chicken'), 250),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'onions'), 80),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'soy sauce'), 20),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'tomato ketchup'), 25),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'green chili sauce'), 15),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'cornflour'), 30),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 50),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 12),
    ((SELECT id FROM menu_items WHERE name = 'chicken manchurian'), (SELECT id FROM ingredients WHERE name = 'eggs'), 1);

-- Recipe for samosa
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'samosa'), (SELECT id FROM ingredients WHERE name = 'wheat flour'), 50),
    ((SELECT id FROM menu_items WHERE name = 'samosa'), (SELECT id FROM ingredients WHERE name = 'potatoes'), 100),
    ((SELECT id FROM menu_items WHERE name = 'samosa'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 30),
    ((SELECT id FROM menu_items WHERE name = 'samosa'), (SELECT id FROM ingredients WHERE name = 'cumin powder'), 3),
    ((SELECT id FROM menu_items WHERE name = 'samosa'), (SELECT id FROM ingredients WHERE name = 'coriander powder'), 2),
    ((SELECT id FROM menu_items WHERE name = 'samosa'), (SELECT id FROM ingredients WHERE name = 'garam masala'), 2);

-- Recipe for pakoda
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'pakoda'), (SELECT id FROM ingredients WHERE name = 'wheat flour'), 80),
    ((SELECT id FROM menu_items WHERE name = 'pakoda'), (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 150),
    ((SELECT id FROM menu_items WHERE name = 'pakoda'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 100),
    ((SELECT id FROM menu_items WHERE name = 'pakoda'), (SELECT id FROM ingredients WHERE name = 'turmeric powder'), 3),
    ((SELECT id FROM menu_items WHERE name = 'pakoda'), (SELECT id FROM ingredients WHERE name = 'red chili powder'), 5),
    ((SELECT id FROM menu_items WHERE name = 'pakoda'), (SELECT id FROM ingredients WHERE name = 'salt'), 5);

-- Recipe for chicken tikka
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'chicken tikka'), (SELECT id FROM ingredients WHERE name = 'chicken'), 300),
    ((SELECT id FROM menu_items WHERE name = 'chicken tikka'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 100),
    ((SELECT id FROM menu_items WHERE name = 'chicken tikka'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 20),
    ((SELECT id FROM menu_items WHERE name = 'chicken tikka'), (SELECT id FROM ingredients WHERE name = 'garam masala'), 10),
    ((SELECT id FROM menu_items WHERE name = 'chicken tikka'), (SELECT id FROM ingredients WHERE name = 'red chili powder'), 8),
    ((SELECT id FROM menu_items WHERE name = 'chicken tikka'), (SELECT id FROM ingredients WHERE name = 'turmeric powder'), 3),
    ((SELECT id FROM menu_items WHERE name = 'chicken tikka'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 15);

-- Recipe for paneer tikka
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'paneer tikka'), (SELECT id FROM ingredients WHERE name = 'paneer'), 250),
    ((SELECT id FROM menu_items WHERE name = 'paneer tikka'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 80),
    ((SELECT id FROM menu_items WHERE name = 'paneer tikka'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 15),
    ((SELECT id FROM menu_items WHERE name = 'paneer tikka'), (SELECT id FROM ingredients WHERE name = 'garam masala'), 8),
    ((SELECT id FROM menu_items WHERE name = 'paneer tikka'), (SELECT id FROM ingredients WHERE name = 'red chili powder'), 6),
    ((SELECT id FROM menu_items WHERE name = 'paneer tikka'), (SELECT id FROM ingredients WHERE name = 'turmeric powder'), 2),
    ((SELECT id FROM menu_items WHERE name = 'paneer tikka'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 10);

-- Recipe for roti
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'roti'), (SELECT id FROM ingredients WHERE name = 'wheat flour'), 80),
    ((SELECT id FROM menu_items WHERE name = 'roti'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 5),
    ((SELECT id FROM menu_items WHERE name = 'roti'), (SELECT id FROM ingredients WHERE name = 'salt'), 2);

-- Recipe for butter roti
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'butter roti'), (SELECT id FROM ingredients WHERE name = 'wheat flour'), 80),
    ((SELECT id FROM menu_items WHERE name = 'butter roti'), (SELECT id FROM ingredients WHERE name = 'butter'), 10),
    ((SELECT id FROM menu_items WHERE name = 'butter roti'), (SELECT id FROM ingredients WHERE name = 'salt'), 2);

-- Recipe for naan
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'naan'), (SELECT id FROM ingredients WHERE name = 'wheat flour'), 100),
    ((SELECT id FROM menu_items WHERE name = 'naan'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 20),
    ((SELECT id FROM menu_items WHERE name = 'naan'), (SELECT id FROM ingredients WHERE name = 'milk'), 30),
    ((SELECT id FROM menu_items WHERE name = 'naan'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 8),
    ((SELECT id FROM menu_items WHERE name = 'naan'), (SELECT id FROM ingredients WHERE name = 'salt'), 3);

-- Recipe for garlic naan
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'garlic naan'), (SELECT id FROM ingredients WHERE name = 'wheat flour'), 100),
    ((SELECT id FROM menu_items WHERE name = 'garlic naan'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 20),
    ((SELECT id FROM menu_items WHERE name = 'garlic naan'), (SELECT id FROM ingredients WHERE name = 'milk'), 30),
    ((SELECT id FROM menu_items WHERE name = 'garlic naan'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 8),
    ((SELECT id FROM menu_items WHERE name = 'garlic naan'), (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 10),
    ((SELECT id FROM menu_items WHERE name = 'garlic naan'), (SELECT id FROM ingredients WHERE name = 'salt'), 3);

-- Recipe for butter naan
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'butter naan'), (SELECT id FROM ingredients WHERE name = 'wheat flour'), 100),
    ((SELECT id FROM menu_items WHERE name = 'butter naan'), (SELECT id FROM ingredients WHERE name = 'yogurt'), 20),
    ((SELECT id FROM menu_items WHERE name = 'butter naan'), (SELECT id FROM ingredients WHERE name = 'milk'), 30),
    ((SELECT id FROM menu_items WHERE name = 'butter naan'), (SELECT id FROM ingredients WHERE name = 'butter'), 15),
    ((SELECT id FROM menu_items WHERE name = 'butter naan'), (SELECT id FROM ingredients WHERE name = 'salt'), 3);

-- Recipe for gulab jamun
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'gulab jamun'), (SELECT id FROM ingredients WHERE name = 'khoya'), 100),
    ((SELECT id FROM menu_items WHERE name = 'gulab jamun'), (SELECT id FROM ingredients WHERE name = 'sugar'), 150),
    ((SELECT id FROM menu_items WHERE name = 'gulab jamun'), (SELECT id FROM ingredients WHERE name = 'milk'), 50),
    ((SELECT id FROM menu_items WHERE name = 'gulab jamun'), (SELECT id FROM ingredients WHERE name = 'cardamom'), 2),
    ((SELECT id FROM menu_items WHERE name = 'gulab jamun'), (SELECT id FROM ingredients WHERE name = 'cooking oil'), 200);

-- Recipe for rasmalai
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'rasmalai'), (SELECT id FROM ingredients WHERE name = 'paneer'), 150),
    ((SELECT id FROM menu_items WHERE name = 'rasmalai'), (SELECT id FROM ingredients WHERE name = 'milk'), 300),
    ((SELECT id FROM menu_items WHERE name = 'rasmalai'), (SELECT id FROM ingredients WHERE name = 'sugar'), 100),
    ((SELECT id FROM menu_items WHERE name = 'rasmalai'), (SELECT id FROM ingredients WHERE name = 'cardamom'), 3),
    ((SELECT id FROM menu_items WHERE name = 'rasmalai'), (SELECT id FROM ingredients WHERE name = 'almonds'), 10);

-- Recipe for ice cream
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'ice cream'), (SELECT id FROM ingredients WHERE name = 'vanilla ice cream'), 150);

-- Recipe for kulfi
INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES 
    ((SELECT id FROM menu_items WHERE name = 'kulfi'), (SELECT id FROM ingredients WHERE name = 'milk'), 200),
    ((SELECT id FROM menu_items WHERE name = 'kulfi'), (SELECT id FROM ingredients WHERE name = 'sugar'), 50),
    ((SELECT id FROM menu_items WHERE name = 'kulfi'), (SELECT id FROM ingredients WHERE name = 'cardamom'), 2),
    ((SELECT id FROM menu_items WHERE name = 'kulfi'), (SELECT id FROM ingredients WHERE name = 'almonds'), 8);



-- Insert Restaurant Tables
INSERT INTO restaurant_tables (table_number, capacity, location) VALUES 
    ('t01', 2, 'ground floor'),
    ('t02', 4, 'ground floor'),
    ('t03', 4, 'first floor'),
    ('t04', 6, 'first floor'),
    ('t05', 2, 'ground floor'),
    ('t06', 4, 'first floor'),
    ('t07', 8, 'first floor'),
    ('t08', 2, 'online'),
    ('t09', 4, 'online'),
    ('t10', 6, 'online')
ON CONFLICT (table_number) DO NOTHING;

-- Insert Staff
INSERT INTO staff (name, email, role) VALUES 
    ('admin user', 'admin@restaurant.com', 'admin'),
    ('manager john', 'manager@restaurant.com', 'manager'),
    ('waiter ram', 'ram@restaurant.com', 'waiter'),
    ('waiter sita', 'sita@restaurant.com', 'waiter'),
    ('chef kumar', 'chef@restaurant.com', 'chef'),
    ('cashier lisa', 'cashier@restaurant.com', 'cashier')
ON CONFLICT (email) DO NOTHING;

-- Insert Customers
INSERT INTO customers (name, phone, email) VALUES 
    ('walk-in customer', '9999999999', 'walkin@restaurant.com'),
    ('john smith', '9876543210', 'john@email.com'),
    ('priya sharma', '9876543211', 'priya@email.com')
ON CONFLICT DO NOTHING;


-- Update menu item food costs after all data is inserted
UPDATE menu_items SET food_cost = calculate_menu_item_food_cost(id);

COMMIT;

-- Verify data insertion
SELECT 'Units' as table_name, COUNT(*) as count FROM units
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'Ingredients', COUNT(*) FROM ingredients
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Menu Items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'Recipes', COUNT(*) FROM recipes
UNION ALL
SELECT 'Tables', COUNT(*) FROM restaurant_tables
UNION ALL
SELECT 'Staff', COUNT(*) FROM staff
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Users', COUNT(*) FROM users;