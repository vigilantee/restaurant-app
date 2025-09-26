-- Create database if it doesn't exist
-- Note: This script runs automatically when the PostgreSQL container starts

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

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Restaurant Order Management System Database Schema
-- This script creates a complete database for managing restaurant orders

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 2. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    spice_level INTEGER CHECK (spice_level >= 0 AND spice_level <= 5), -- 0=No spice, 5=Very spicy
    preparation_time INTEGER DEFAULT 15, -- in minutes
    calories INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. RESTAURANT TABLES
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location VARCHAR(100), -- 'Indoor', 'Outdoor', 'VIP', etc.
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CUSTOMERS TABLE (Optional - for customer info)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ORDERS TABLE
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
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'upi', 'wallet')),
    special_instructions TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_ready_time TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ORDER ITEMS TABLE (Junction table for orders and menu items)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    special_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. STAFF/ADMIN TABLE
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(50) DEFAULT 'waiter' CHECK (role IN ('admin', 'manager', 'waiter', 'chef', 'cashier')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for better performance
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_available ON restaurant_tables(is_available);

-- TRIGGERS for auto-updating timestamps
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

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items FOR EACH ROW
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

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- FUNCTION to automatically calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_total(order_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    subtotal_calc DECIMAL(10,2);
    tax_rate DECIMAL(5,4) := 0.18; -- 18% GST
    discount_calc DECIMAL(10,2);
    tax_calc DECIMAL(10,2);
    total_calc DECIMAL(10,2);
BEGIN
    -- Calculate subtotal from order items
    SELECT COALESCE(SUM(total_price), 0.00)
    INTO subtotal_calc
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
        total_amount = total_calc
    WHERE id = order_id_param;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER to auto-calculate totals when order items are modified
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

-- SAMPLE DATA INSERTION

-- Insert Categories
INSERT INTO categories (name, description, display_order) VALUES 
    ('Beverages', 'Hot and Cold Drinks', 1),
    ('Shakes', 'Fresh Fruit Shakes and Smoothies', 2),
    ('North Indian', 'Traditional North Indian Cuisine', 3),
    ('South Indian', 'Authentic South Indian Dishes', 4),
    ('Chinese', 'Indo-Chinese Specialties', 5),
    ('Desserts', 'Sweet Treats and Ice Creams', 6),
    ('Starters', 'Appetizers and Snacks', 7),
    ('Breads', 'Freshly Baked Indian Breads', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert Menu Items for Beverages
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'Beverages'), 'Masala Tea', 'Traditional Indian spiced tea', 25.00, true, 5),
    ((SELECT id FROM categories WHERE name = 'Beverages'), 'Coffee', 'Hot filter coffee', 30.00, true, 5),
    ((SELECT id FROM categories WHERE name = 'Beverages'), 'Cold Coffee', 'Iced coffee with milk', 45.00, true, 8),
    ((SELECT id FROM categories WHERE name = 'Beverages'), 'Fresh Lime Water', 'Sweet/Salt lime water', 35.00, true, 3),
    ((SELECT id FROM categories WHERE name = 'Beverages'), 'Lassi', 'Traditional yogurt drink', 40.00, true, 5);

-- Insert Menu Items for Shakes
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'Shakes'), 'Banana Shake', 'Fresh banana blended with milk', 60.00, true, 5),
    ((SELECT id FROM categories WHERE name = 'Shakes'), 'Mango Shake', 'Fresh mango shake with cream', 75.00, true, 7),
    ((SELECT id FROM categories WHERE name = 'Shakes'), 'Chocolate Shake', 'Rich chocolate milkshake', 70.00, true, 6),
    ((SELECT id FROM categories WHERE name = 'Shakes'), 'Strawberry Shake', 'Fresh strawberry milkshake', 80.00, true, 6),
    ((SELECT id FROM categories WHERE name = 'Shakes'), 'Mixed Fruit Shake', 'Seasonal fruits blended together', 85.00, true, 8);

-- Insert Menu Items for North Indian
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, spice_level, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'North Indian'), 'Chicken Biryani', 'Aromatic basmati rice with tender chicken', 180.00, false, 3, 25),
    ((SELECT id FROM categories WHERE name = 'North Indian'), 'Mutton Biryani', 'Royal mutton biryani with boiled egg', 220.00, false, 3, 30),
    ((SELECT id FROM categories WHERE name = 'North Indian'), 'Veg Biryani', 'Mixed vegetable biryani with raita', 150.00, true, 2, 20),
    ((SELECT id FROM categories WHERE name = 'North Indian'), 'Butter Chicken', 'Creamy tomato-based chicken curry', 200.00, false, 2, 20),
    ((SELECT id FROM categories WHERE name = 'North Indian'), 'Dal Makhani', 'Rich black lentils in butter and cream', 140.00, true, 1, 15),
    ((SELECT id FROM categories WHERE name = 'North Indian'), 'Paneer Butter Masala', 'Cottage cheese in rich tomato gravy', 160.00, true, 2, 15),
    ((SELECT id FROM categories WHERE name = 'North Indian'), 'Rajma Rice', 'Kidney beans curry with steamed rice', 120.00, true, 2, 18);

-- Insert Menu Items for South Indian
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, spice_level, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'South Indian'), 'Masala Dosa', 'Crispy crepe with spiced potato filling', 80.00, true, 2, 12),
    ((SELECT id FROM categories WHERE name = 'South Indian'), 'Plain Dosa', 'Simple crispy rice and lentil crepe', 60.00, true, 1, 10),
    ((SELECT id FROM categories WHERE name = 'South Indian'), 'Idli Sambar', '3 steamed rice cakes with lentil curry', 70.00, true, 2, 8),
    ((SELECT id FROM categories WHERE name = 'South Indian'), 'Vada Sambar', '2 fried lentil donuts with sambar', 75.00, true, 2, 10),
    ((SELECT id FROM categories WHERE name = 'South Indian'), 'Uthappam', 'Thick pancake with vegetables', 85.00, true, 2, 15);

-- Insert Menu Items for Chinese
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, spice_level, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'Chinese'), 'Veg Fried Rice', 'Wok-tossed rice with mixed vegetables', 110.00, true, 2, 12),
    ((SELECT id FROM categories WHERE name = 'Chinese'), 'Chicken Fried Rice', 'Fried rice with chicken and vegetables', 130.00, false, 2, 15),
    ((SELECT id FROM categories WHERE name = 'Chinese'), 'Veg Noodles', 'Stir-fried noodles with vegetables', 120.00, true, 2, 12),
    ((SELECT id FROM categories WHERE name = 'Chinese'), 'Chicken Noodles', 'Hakka noodles with chicken', 140.00, false, 2, 15),
    ((SELECT id FROM categories WHERE name = 'Chinese'), 'Gobi Manchurian', 'Crispy cauliflower in spicy sauce', 135.00, true, 3, 18),
    ((SELECT id FROM categories WHERE name = 'Chinese'), 'Chicken Manchurian', 'Chicken balls in tangy sauce', 155.00, false, 3, 20);

-- Insert Menu Items for Starters
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, spice_level, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'Starters'), 'Samosa', 'Crispy pastry with spiced potato filling', 20.00, true, 2, 5),
    ((SELECT id FROM categories WHERE name = 'Starters'), 'Pakoda', 'Mixed vegetable fritters', 60.00, true, 2, 8),
    ((SELECT id FROM categories WHERE name = 'Starters'), 'Chicken Tikka', 'Grilled marinated chicken pieces', 180.00, false, 3, 20),
    ((SELECT id FROM categories WHERE name = 'Starters'), 'Paneer Tikka', 'Grilled cottage cheese with spices', 160.00, true, 2, 18);

-- Insert Menu Items for Breads
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'Breads'), 'Roti', 'Plain wheat flatbread', 15.00, true, 3),
    ((SELECT id FROM categories WHERE name = 'Breads'), 'Butter Roti', 'Roti brushed with butter', 20.00, true, 3),
    ((SELECT id FROM categories WHERE name = 'Breads'), 'Naan', 'Soft leavened bread', 25.00, true, 5),
    ((SELECT id FROM categories WHERE name = 'Breads'), 'Garlic Naan', 'Naan topped with garlic', 35.00, true, 6),
    ((SELECT id FROM categories WHERE name = 'Breads'), 'Butter Naan', 'Naan brushed with butter', 30.00, true, 5);

-- Insert Menu Items for Desserts
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, preparation_time) VALUES 
    ((SELECT id FROM categories WHERE name = 'Desserts'), 'Gulab Jamun', 'Sweet milk dumplings in sugar syrup', 60.00, true, 2),
    ((SELECT id FROM categories WHERE name = 'Desserts'), 'Rasmalai', 'Cottage cheese balls in sweetened milk', 80.00, true, 2),
    ((SELECT id FROM categories WHERE name = 'Desserts'), 'Ice Cream', 'Vanilla/Chocolate/Strawberry', 50.00, true, 2),
    ((SELECT id FROM categories WHERE name = 'Desserts'), 'Kulfi', 'Traditional Indian ice cream', 45.00, true, 2);

-- Insert Restaurant Tables
INSERT INTO restaurant_tables (table_number, capacity, location) VALUES 
    ('T01', 2, 'Indoor'),
    ('T02', 4, 'Indoor'),
    ('T03', 4, 'Indoor'),
    ('T04', 6, 'Indoor'),
    ('T05', 2, 'Outdoor'),
    ('T06', 4, 'Outdoor'),
    ('T07', 8, 'VIP'),
    ('T08', 2, 'Indoor'),
    ('T09', 4, 'Indoor'),
    ('T10', 6, 'Outdoor');

-- Insert Staff
INSERT INTO staff (name, email, role) VALUES 
    ('Admin User', 'admin@restaurant.com', 'admin'),
    ('Manager John', 'manager@restaurant.com', 'manager'),
    ('Waiter Ram', 'ram@restaurant.com', 'waiter'),
    ('Waiter Sita', 'sita@restaurant.com', 'waiter'),
    ('Chef Kumar', 'chef@restaurant.com', 'chef'),
    ('Cashier Lisa', 'cashier@restaurant.com', 'cashier');

-- Insert a sample customer
INSERT INTO customers (name, phone, email) VALUES 
    ('Walk-in Customer', '9999999999', 'walkin@restaurant.com'),
    ('John Smith', '9876543210', 'john@email.com'),
    ('Priya Sharma', '9876543211', 'priya@email.com');

-- USEFUL VIEWS for common queries

-- View for menu with category names
CREATE OR REPLACE VIEW menu_with_categories AS
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
    c.name as category_name,
    c.display_order as category_order,
    mi.display_order as item_order
FROM menu_items mi
JOIN categories c ON mi.category_id = c.id
WHERE c.is_active = TRUE
ORDER BY c.display_order, mi.display_order, mi.name;

-- View for order details with customer and table info
CREATE OR REPLACE VIEW order_details AS
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
    o.order_date,
    o.estimated_ready_time,
    rt.table_number,
    rt.location as table_location,
    c.name as customer_name,
    c.phone as customer_phone
FROM orders o
LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
LEFT JOIN customers c ON o.customer_id = c.id
ORDER BY o.order_date DESC;

-- View for order items with menu details
CREATE OR REPLACE VIEW order_items_details AS
SELECT 
    oi.id,
    oi.order_id,
    o.order_number,
    mi.name as item_name,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.special_notes,
    mi.preparation_time,
    c.name as category_name
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN categories c ON mi.category_id = c.id
ORDER BY oi.order_id, c.display_order;

-- HELPFUL FUNCTIONS

-- Function to get available tables
CREATE OR REPLACE FUNCTION get_available_tables()
RETURNS TABLE(
    table_id INTEGER,
    table_number VARCHAR(10),
    capacity INTEGER,
    location VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT rt.id, rt.table_number, rt.capacity, rt.location
    FROM restaurant_tables rt
    WHERE rt.is_available = TRUE
    ORDER BY rt.table_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get menu by category
CREATE OR REPLACE FUNCTION get_menu_by_category(category_name_param VARCHAR)
RETURNS TABLE(
    item_id INTEGER,
    item_name VARCHAR(150),
    description TEXT,
    price DECIMAL(10,2),
    is_vegetarian BOOLEAN,
    spice_level INTEGER,
    preparation_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT mi.id, mi.name, mi.description, mi.price, mi.is_vegetarian, mi.spice_level, mi.preparation_time
    FROM menu_items mi
    JOIN categories c ON mi.category_id = c.id
    WHERE c.name = category_name_param 
    AND mi.is_available = TRUE
    AND c.is_active = TRUE
    ORDER BY mi.display_order, mi.name;
END;
$$ LANGUAGE plpgsql;

-- Sample Usage Examples (commented out, uncomment to test):

/*
-- Get all available tables
SELECT * FROM get_available_tables();

-- Get shakes menu
SELECT * FROM get_menu_by_category('Shakes');

-- Create a sample order
INSERT INTO orders (table_id, customer_id, order_type) 
VALUES (1, 1, 'dine_in');

-- Add items to the order (this will auto-calculate totals)
INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price)
VALUES 
(1, (SELECT id FROM menu_items WHERE name = 'Chicken Biryani'), 2, 180.00, 360.00),
(1, (SELECT id FROM menu_items WHERE name = 'Mango Shake'), 2, 75.00, 150.00);

-- View the complete order
SELECT * FROM order_details WHERE id = 1;
SELECT * FROM order_items_details WHERE order_id = 1;
*/