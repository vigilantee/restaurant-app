import React, { useState, useEffect } from "react";
import { menuAPI } from "../../services/api";
import { Search, Filter, Clock, Star } from "lucide-react";
import toast from "react-hot-toast";

const MenuDisplay = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const response = await menuAPI.getFullMenu();
      setMenu(response.data || []);
    } catch (error) {
      toast.error("Failed to load menu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMenu = menu.filter((category) => {
    const matchesCategory =
      selectedCategory === "all" ||
      category.name.toLowerCase() === selectedCategory.toLowerCase();
    const hasMatchingItems = category.items.some((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAvailability = !showAvailableOnly || item.is_available;
      return matchesSearch && matchesAvailability;
    });
    return matchesCategory && hasMatchingItems;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading menu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Menu</h1>
          <p className="text-gray-600">Browse our delicious offerings</p>
        </div>
        <button
          onClick={loadMenu}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh Menu
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {menu.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Available only</span>
          </label>
        </div>
      </div>

      {/* Menu Display */}
      <div className="space-y-8">
        {filteredMenu.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {category.name}
              </h2>
              <p className="text-gray-600">{category.items.length} items</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.items
                  .filter((item) => {
                    const matchesSearch =
                      !searchTerm ||
                      item.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      item.description
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase());
                    const matchesAvailability =
                      !showAvailableOnly || item.is_available;
                    return matchesSearch && matchesAvailability;
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 ${
                        !item.is_available ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <span
                          className={`text-sm px-2 py-1 rounded ${
                            item.is_available
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.is_available ? "Available" : "Unavailable"}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold text-gray-900">
                            ₹{item.price}
                          </span>
                          {item.is_vegetarian && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Veg
                            </span>
                          )}
                          {item.is_vegan && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Vegan
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          {item.preparation_time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {item.preparation_time}m
                            </div>
                          )}
                          {item.spice_level > 0 && (
                            <span className="text-red-500">
                              {"🌶️".repeat(item.spice_level)}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.calories && (
                        <div className="mt-2 text-xs text-gray-500">
                          {item.calories} calories
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMenu.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            No items found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuDisplay;
