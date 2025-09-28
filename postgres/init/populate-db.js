/**
 * Dynamic Restaurant Database Populator
 * Reads JSON data and generates SQL queries to populate the restaurant database
 * Compatible with PostgreSQL and the provided schema
 * Now supports prepending an prepend.sql file to the output
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

// Always resolve relative to this script's folder
const baseDir = __dirname;
class RestaurantDBPopulator {
  constructor(jsonFilePath, initSqlPath = null) {
    this.data = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    this.initSqlPath = initSqlPath;
    this.sqlQueries = [];
  }

  /**
   * Read and return the prepend.sql file content
   */
  getInitSQL() {
    if (!this.initSqlPath || !fs.existsSync(this.initSqlPath)) {
      return "";
    }

    try {
      const initContent = fs.readFileSync(this.initSqlPath, "utf8");
      return `-- Schema initialization from ${path.basename(this.initSqlPath)}
${initContent}

-- End of schema initialization
-- =====================================

`;
    } catch (error) {
      console.warn(`Warning: Could not read init SQL file: ${error.message}`);
      return "";
    }
  }

  /**
   * Generate SQL for inserting units
   */
  generateUnitsSQL() {
    const units = this.data.units
      .map((unit) => `('${unit.name}', '${unit.abbreviation}', '${unit.type}')`)
      .join(",\n    ");

    return `-- Insert Units
INSERT INTO units (name, abbreviation, type) VALUES 
    ${units}
ON CONFLICT (name) DO NOTHING;`;
  }

  /**
   * Generate SQL for inserting suppliers
   */
  generateSuppliersSQL() {
    const suppliers = this.data.suppliers
      .map(
        (supplier) =>
          `('${supplier.name}', '${supplier.contact_person}', '${supplier.phone}', '${supplier.email}')`
      )
      .join(",\n    ");

    return `-- Insert Suppliers
INSERT INTO suppliers (name, contact_person, phone, email) VALUES 
    ${suppliers}
ON CONFLICT DO NOTHING;`;
  }

  /**
   * Generate SQL for inserting ingredients
   */
  generateIngredientsSQL() {
    const ingredients = this.data.ingredients
      .map(
        (ingredient) =>
          `('${ingredient.name}', '${ingredient.description}', ` +
          `(SELECT id FROM units WHERE name = '${ingredient.unit}'), ` +
          `${ingredient.cost_per_unit}, ${ingredient.minimum_stock}, ${ingredient.current_stock})`
      )
      .join(",\n    ");

    return `-- Insert Ingredients
INSERT INTO ingredients (name, description, unit_id, cost_per_unit, minimum_stock, current_stock) VALUES 
    ${ingredients}
ON CONFLICT (name) DO NOTHING;`;
  }

  /**
   * Generate SQL for inserting categories
   */
  generateCategoriesSQL() {
    const categories = this.data.categories
      .map(
        (category) =>
          `('${category.name}', '${category.description}', ${category.display_order})`
      )
      .join(",\n    ");

    return `-- Insert Categories
INSERT INTO categories (name, description, display_order) VALUES 
    ${categories}
ON CONFLICT (name) DO NOTHING;`;
  }

  /**
   * Generate SQL for inserting menu items
   */
  generateMenuItemsSQL() {
    const menuItems = this.data.menu_items
      .map((item) => {
        const spiceLevel = item.spice_level ? item.spice_level : "NULL";
        return (
          `((SELECT id FROM categories WHERE name = '${item.category}'), ` +
          `'${item.name}', '${item.description}', ${item.price}, ` +
          `${item.is_vegetarian}, ${spiceLevel}, ${item.preparation_time})`
        );
      })
      .join(",\n    ");

    return `-- Insert Menu Items
INSERT INTO menu_items (category_id, name, description, price, is_vegetarian, spice_level, preparation_time) VALUES 
    ${menuItems};`;
  }

  /**
   * Generate SQL for inserting recipes (now from menu_items.ingredients)
   */
  generateRecipesSQL() {
    let recipeSQL = `-- Insert Recipes\n`;

    this.data.menu_items.forEach((menuItem) => {
      if (menuItem.ingredients && menuItem.ingredients.length > 0) {
        const ingredients = menuItem.ingredients
          .map(
            (ing) =>
              `((SELECT id FROM menu_items WHERE name = '${menuItem.name}'), ` +
              `(SELECT id FROM ingredients WHERE name = '${ing.name}'), ${ing.quantity})`
          )
          .join(",\n    ");

        recipeSQL += `-- Recipe for ${menuItem.name}\n`;
        recipeSQL += `INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES \n    ${ingredients};\n\n`;
      }
    });

    return recipeSQL;
  }

  /**
   * Generate SQL for inserting restaurant tables
   */
  generateTablesSQL() {
    const tables = this.data.restaurant_tables
      .map(
        (table) =>
          `('${table.table_number}', ${table.capacity}, '${table.location}')`
      )
      .join(",\n    ");

    return `-- Insert Restaurant Tables
INSERT INTO restaurant_tables (table_number, capacity, location) VALUES 
    ${tables}
ON CONFLICT (table_number) DO NOTHING;`;
  }

  /**
   * Generate SQL for inserting staff
   */
  generateStaffSQL() {
    const staff = this.data.staff
      .map(
        (member) => `('${member.name}', '${member.email}', '${member.role}')`
      )
      .join(",\n    ");

    return `-- Insert Staff
INSERT INTO staff (name, email, role) VALUES 
    ${staff}
ON CONFLICT (email) DO NOTHING;`;
  }

  /**
   * Generate SQL for inserting customers
   */
  generateCustomersSQL() {
    const customers = this.data.customers
      .map(
        (customer) =>
          `('${customer.name}', '${customer.phone}', '${customer.email}')`
      )
      .join(",\n    ");

    return `-- Insert Customers
INSERT INTO customers (name, phone, email) VALUES 
    ${customers}
ON CONFLICT DO NOTHING;`;
  }

  /**
   * Generate SQL for inserting users
   */
  generateUsersSQL() {
    const users = this.data.users
      .map((user) => `('${user.name}', '${user.email}')`)
      .join(",\n    ");

    return `-- Insert Users
INSERT INTO users (name, email) VALUES 
    ${users}
ON CONFLICT (email) DO NOTHING;`;
  }

  /**
   * Generate complete SQL script
   */
  generateCompleteSQL() {
    // Get init SQL content first
    const initSQL = this.getInitSQL();

    const header = `-- Restaurant Database Complete Setup and Population Script
-- Generated dynamically from JSON data
-- Includes schema initialization and sample data population

BEGIN;

`;

    const footer = `
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
SELECT 'Users', COUNT(*) FROM users;`;

    const allSQL = [
      initSQL, // Prepend prepend.sql content
      header,
      this.generateUsersSQL(),
      "",
      this.generateUnitsSQL(),
      "",
      this.generateSuppliersSQL(),
      "",
      this.generateIngredientsSQL(),
      "",
      this.generateCategoriesSQL(),
      "",
      this.generateMenuItemsSQL(),
      "",
      this.generateRecipesSQL(),
      "",
      this.generateTablesSQL(),
      "",
      this.generateStaffSQL(),
      "",
      this.generateCustomersSQL(),
      "",
      footer,
    ].join("\n");

    return allSQL;
  }

  /**
   * Write SQL to file
   */
  writeToFile(outputPath = "init.sql") {
    const sql = this.generateCompleteSQL();
    fs.writeFileSync(outputPath, sql);

    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);
    const initInfo = this.initSqlPath
      ? ` (including ${path.basename(this.initSqlPath)})`
      : "";

    console.log(`SQL script generated successfully: ${outputPath}${initInfo}`);
    console.log(`File size: ${fileSize} KB`);

    if (this.initSqlPath && fs.existsSync(this.initSqlPath)) {
      console.log(
        `✅ Schema initialization included from: ${this.initSqlPath}`
      );
    } else if (this.initSqlPath) {
      console.log(`⚠️  Warning: Init SQL file not found: ${this.initSqlPath}`);
    }
  }

  /**
   * Generate individual SQL sections
   */
  generateIndividualSections() {
    return {
      init: this.getInitSQL(),
      users: this.generateUsersSQL(),
      units: this.generateUnitsSQL(),
      suppliers: this.generateSuppliersSQL(),
      ingredients: this.generateIngredientsSQL(),
      categories: this.generateCategoriesSQL(),
      menu_items: this.generateMenuItemsSQL(),
      recipes: this.generateRecipesSQL(),
      tables: this.generateTablesSQL(),
      staff: this.generateStaffSQL(),
      customers: this.generateCustomersSQL(),
    };
  }

  /**
   * Validate JSON data structure
   */
  validateData() {
    const requiredKeys = [
      "units",
      "suppliers",
      "ingredients",
      "categories",
      "menu_items",
      "restaurant_tables",
      "staff",
      "customers",
      "users",
    ];

    const missingKeys = requiredKeys.filter((key) => !this.data[key]);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required keys in JSON: ${missingKeys.join(", ")}`
      );
    }

    // Validate menu items reference existing categories
    const categoryNames = this.data.categories.map((c) => c.name);
    const invalidMenuItems = this.data.menu_items.filter(
      (item) => !categoryNames.includes(item.category)
    );

    if (invalidMenuItems.length > 0) {
      console.warn(
        "Warning: Menu items with invalid categories:",
        invalidMenuItems.map((item) => item.name)
      );
    }

    // Validate menu item ingredients reference existing ingredients
    const ingredientNames = this.data.ingredients.map((ing) => ing.name);

    this.data.menu_items.forEach((menuItem) => {
      if (menuItem.ingredients) {
        menuItem.ingredients.forEach((ing) => {
          if (!ingredientNames.includes(ing.name)) {
            console.warn(
              `Warning: Menu item "${menuItem.name}" uses non-existent ingredient: ${ing.name}`
            );
          }

          // Validate ingredient has unit specified
          if (!ing.unit) {
            console.warn(
              `Warning: Ingredient "${ing.name}" in "${menuItem.name}" missing unit`
            );
          }
        });
      }
    });

    // Validate ingredients have valid units
    const unitNames = this.data.units.map((u) => u.name);
    this.data.ingredients.forEach((ingredient) => {
      if (!unitNames.includes(ingredient.unit)) {
        console.warn(
          `Warning: Ingredient "${ingredient.name}" uses invalid unit: ${ingredient.unit}`
        );
      }
    });

    console.log("Data validation completed");
  }

  /**
   * Get data statistics
   */
  getStatistics() {
    const totalRecipeIngredients = this.data.menu_items.reduce(
      (sum, menuItem) =>
        sum + (menuItem.ingredients ? menuItem.ingredients.length : 0),
      0
    );

    return {
      units: this.data.units.length,
      suppliers: this.data.suppliers.length,
      ingredients: this.data.ingredients.length,
      categories: this.data.categories.length,
      menu_items: this.data.menu_items.length,
      restaurant_tables: this.data.restaurant_tables.length,
      staff: this.data.staff.length,
      customers: this.data.customers.length,
      users: this.data.users.length,
      total_recipe_ingredients: totalRecipeIngredients,
      menu_items_with_recipes: this.data.menu_items.filter(
        (item) => item.ingredients && item.ingredients.length > 0
      ).length,
    };
  }
}

// Usage example and CLI interface
if (require.main === module) {
  const jsonFile = args[0] || path.join(baseDir, "data.json");
  const outputFile = args[1] || path.join(baseDir, "init.sql");
  const initSqlFile = args[2] || path.join(baseDir, "prepend.sql"); // New parameter for prepend.sql
  console.log("Using files:");
  console.log("JSON:", jsonFile);
  console.log("SQL Output:", outputFile);
  console.log("Prepend SQL:", initSqlFile);

  try {
    console.log("Starting restaurant database population script...");
    console.log(`Reading data from: ${jsonFile}`);

    if (fs.existsSync(initSqlFile)) {
      console.log(`Including schema from: ${initSqlFile}`);
    } else {
      console.log(`Init SQL file not found (optional): ${initSqlFile}`);
    }

    const populator = new RestaurantDBPopulator(jsonFile, initSqlFile);

    // Validate data
    populator.validateData();

    // Show statistics
    const stats = populator.getStatistics();
    console.log("\nData Statistics:");
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Generate and write SQL
    console.log(`\nGenerating complete SQL script...`);
    populator.writeToFile(outputFile);

    console.log("\n✅ Script completed successfully!");
    console.log(`\nTo use the generated SQL:`);
    console.log(`1. The script now includes both schema and data`);
    console.log(`2. Run: psql -d your_database -f ${outputFile}`);
    console.log(
      `3. Or create database first: createdb your_database && psql -d your_database -f ${outputFile}`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

module.exports = RestaurantDBPopulator;
