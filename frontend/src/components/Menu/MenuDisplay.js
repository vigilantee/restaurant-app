import React, { useState, useEffect } from "react";
import { menuAPI } from "../../services/api";
import { Search, Filter, Clock, Star, Plus } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Enhanced MenuDisplay Component
 *
 * This component can work in two modes:
 * 1. Standalone Mode (default) - Full menu display with all original features
 * 2. Modal Mode - Optimized for use within order creation modals
 *
 * Props:
 * - onAddItem: Function called when "Add" button is clicked (only in modal mode)
 * - isModal: Boolean to enable modal mode (changes layout and behavior)
 * - searchTerm: External search term state (for modal integration)
 * - setSearchTerm: External search term setter
 * - selectedCategory: External category state (for modal integration)
 * - setSelectedCategory: External category setter
 */
const MenuDisplay = ({
  onAddItem = null,
  isModal = false,
  searchTerm: externalSearchTerm,
  setSearchTerm: externalSetSearchTerm,
  selectedCategory: externalSelectedCategory,
  setSelectedCategory: externalSetSelectedCategory,
}) => {
  // State management
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalSelectedCategory, setInternalSelectedCategory] =
    useState("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Use external state if provided (for modal mode), otherwise use internal state
  const searchTerm =
    externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = externalSetSearchTerm || setInternalSearchTerm;
  const selectedCategory =
    externalSelectedCategory !== undefined
      ? externalSelectedCategory
      : internalSelectedCategory;
  const setSelectedCategory =
    externalSetSelectedCategory || setInternalSelectedCategory;

  // Load menu data on component mount
  useEffect(() => {
    loadMenu();
  }, []);

  /**
   * Load menu data from API
   */
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

  /**
   * Filter menu based on search term, category, and availability
   */
  const filteredMenu = menu.filter((category) => {
    const matchesCategory =
      selectedCategory === "all" ||
      category.name.toLowerCase() === selectedCategory.toLowerCase();

    const hasMatchingItems = category.items?.some((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAvailability = !showAvailableOnly || item.is_available;
      return matchesSearch && matchesAvailability;
    });

    return matchesCategory && hasMatchingItems;
  });

  // Loading state
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
      {/* Header - only show in standalone mode */}
      {!isModal && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Restaurant Menu
            </h1>
            <p className="text-gray-600">Browse our delicious offerings</p>
          </div>
          <button
            onClick={loadMenu}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh Menu
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className={isModal ? "space-y-4" : "bg-white rounded-lg shadow p-6"}>
        <div
          className={isModal ? "space-y-4" : "flex flex-col sm:flex-row gap-4"}
        >
          {/* Search Input */}
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

          {/* Category Filter */}
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

          {/* Available Only Filter - only in standalone mode */}
          {!isModal && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Available only</span>
            </label>
          )}
        </div>
      </div>

      {/* Menu Display Section */}
      <div className="space-y-8">
        {filteredMenu.map((category) => (
          <div
            key={category.id}
            className={isModal ? "" : "bg-white rounded-lg shadow"}
          >
            {/* Category Header */}
            <div
              className={
                isModal ? "mb-4" : "px-6 py-4 border-b border-gray-200"
              }
            >
              <h2
                className={
                  isModal
                    ? "text-lg font-semibold text-gray-900"
                    : "text-xl font-semibold text-gray-900"
                }
              >
                {category.name}
              </h2>
              {!isModal && (
                <p className="text-gray-600">
                  {category.items?.length || 0} items
                </p>
              )}
            </div>

            {/* Menu Items Grid */}
            <div className={isModal ? "" : "p-6"}>
              <div
                className={`grid gap-6 ${
                  isModal
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {category.items
                  ?.filter((item) => {
                    const matchesSearch =
                      !searchTerm ||
                      item.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      item.description
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase());
                    const matchesAvailability = isModal
                      ? item.is_available
                      : !showAvailableOnly || item.is_available;
                    return matchesSearch && matchesAvailability;
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 ${
                        !item.is_available ? "opacity-60" : ""
                      } ${isModal ? "hover:shadow-md transition-shadow" : ""}`}
                    >
                      {/* Item Header */}
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold text-gray-900">
                            ₹{item.price}
                          </span>
                          {/* Availability Badge - only in standalone mode */}
                          {!isModal && (
                            <span
                              className={`text-sm px-2 py-1 rounded ${
                                item.is_available
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {item.is_available ? "Available" : "Unavailable"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Description */}
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {item.description}
                        </p>
                      )}

                      {/* Item Footer */}
                      <div className="flex items-center justify-between">
                        {/* Tags and Labels */}
                        <div className="flex items-center space-x-2">
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

                        {/* Item Meta and Actions */}
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          {/* Preparation Time */}
                          {item.preparation_time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {item.preparation_time}m
                            </div>
                          )}

                          {/* Spice Level */}
                          {item.spice_level > 0 && (
                            <span className="text-red-500">
                              {"🌶️".repeat(item.spice_level)}
                            </span>
                          )}

                          {/* Add Button - only in modal mode with available items */}
                          {isModal && onAddItem && item.is_available && (
                            <button
                              onClick={() => onAddItem(item)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm ml-2"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Calories Information */}
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

      {/* Empty State */}
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
