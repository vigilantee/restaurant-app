import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { menuAPI, tablesAPI, customersAPI } from "../../services/api";
import { Plus, Minus, ShoppingCart, Users, MapPin, Search } from "lucide-react";
import toast from "react-hot-toast";

const CreateOrder = () => {
  const navigate = useNavigate();
  const {
    state,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    createOrder,
  } = useApp();

  const [menu, setMenu] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderType, setOrderType] = useState("dine_in");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [menuResponse, tablesResponse, customersResponse] =
        await Promise.all([
          menuAPI.getFullMenu(),
          tablesAPI.getAvailable(),
          customersAPI.getAll({ limit: 50 }),
        ]);

      setMenu(menuResponse.data || []);
      setAvailableTables(tablesResponse.data || []);
      setCustomers(
        customersResponse.data?.customers || customersResponse.data || []
      );
    } catch (error) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    addToCart(item, 1);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateCartItem(itemId, newQuantity);
    }
  };

  const getCartTotal = () => {
    return state.cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const getTaxAmount = () => {
    const subtotal = getCartTotal();
    return subtotal * 0.18; // 18% GST
  };

  const getGrandTotal = () => {
    return getCartTotal() + getTaxAmount();
  };

  const filteredMenu = menu.filter((category) => {
    const matchesCategory =
      selectedCategory === "all" ||
      category.name.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.items.some(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  const handleCreateCustomer = async () => {
    try {
      const response = await customersAPI.create(newCustomer);
      setCustomers([...customers, response.data]);
      setSelectedCustomer(response.data);
      setNewCustomer({ name: "", phone: "", email: "" });
      setShowCustomerForm(false);
      toast.success("Customer created successfully");
    } catch (error) {
      toast.error("Failed to create customer: " + error.message);
    }
  };

  const handleSubmitOrder = async () => {
    if (state.cart.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    if (orderType === "dine_in" && !selectedTable) {
      toast.error("Please select a table for dine-in orders");
      return;
    }

    try {
      const orderData = {
        table_id: orderType === "dine_in" ? selectedTable?.id : null,
        customer_id: selectedCustomer?.id || null,
        order_type: orderType,
        special_instructions: "",
      };

      const order = await createOrder(orderData);
      if (order) {
        toast.success("Order created successfully!");
        navigate(`/orders/${order.id}`);
      }
    } catch (error) {
      toast.error("Failed to create order: " + error.message);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
          <p className="text-gray-600">
            Select items and create an order for your customers
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-gray-500 hover:text-gray-700"
          disabled={state.cart.length === 0}
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Type Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Order Type
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {["dine_in", "takeaway", "delivery"].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`p-3 rounded-lg border-2 text-center ${
                    orderType === type
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium capitalize">
                    {type.replace("_", " ")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Table Selection */}
          {orderType === "dine_in" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Table
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`p-3 rounded-lg border-2 text-center ${
                      selectedTable?.id === table.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">{table.table_number}</div>
                    <div className="text-sm text-gray-500">
                      {table.capacity} seats
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Customer (Optional)
              </h3>
              <button
                onClick={() => setShowCustomerForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + New Customer
              </button>
            </div>

            {showCustomerForm ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateCustomer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Customer
                  </button>
                  <button
                    onClick={() => setShowCustomerForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const customer = customers.find(
                      (c) => c.id === parseInt(e.target.value)
                    );
                    setSelectedCustomer(customer || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select existing customer (optional)</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{" "}
                      {customer.phone ? `- ${customer.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
            </div>

            {/* Menu Items */}
            <div className="space-y-6">
              {filteredMenu.map((category) => (
                <div key={category.id}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {category.name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {category.items
                      .filter(
                        (item) =>
                          !searchTerm ||
                          item.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          item.description
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase())
                      )
                      .map((item) => {
                        const cartItem = state.cart.find(
                          (cartItem) => cartItem.id === item.id
                        );
                        const quantity = cartItem ? cartItem.quantity : 0;

                        return (
                          <div
                            key={item.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {item.name}
                                </h4>
                                {item.description && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex items-center mt-2 space-x-2">
                                  <span className="font-semibold text-lg">
                                    ₹{item.price}
                                  </span>
                                  {item.is_vegetarian && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Veg
                                    </span>
                                  )}
                                  {item.spice_level > 0 && (
                                    <span className="text-sm text-red-500">
                                      {"🌶️".repeat(item.spice_level)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {quantity === 0 ? (
                              <button
                                onClick={() => handleAddToCart(item)}
                                disabled={!item.is_available}
                                className={`w-full mt-3 px-4 py-2 rounded-md text-sm font-medium ${
                                  item.is_available
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                }`}
                              >
                                {item.is_available
                                  ? "Add to Cart"
                                  : "Unavailable"}
                              </button>
                            ) : (
                              <div className="flex items-center justify-between mt-3">
                                <button
                                  onClick={() =>
                                    handleQuantityChange(item.id, quantity - 1)
                                  }
                                  className="p-1 rounded-md bg-gray-200 hover:bg-gray-300"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="mx-3 font-medium">
                                  {quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    handleQuantityChange(item.id, quantity + 1)
                                  }
                                  className="p-1 rounded-md bg-gray-200 hover:bg-gray-300"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <div className="flex items-center mb-4">
              <ShoppingCart className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Order Summary ({state.cart.length} items)
              </h3>
            </div>

            {state.cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items in cart</p>
            ) : (
              <div className="space-y-4">
                {state.cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity - 1)
                        }
                        className="p-0.5 rounded bg-gray-200 hover:bg-gray-300"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleQuantityChange(item.id, item.quantity + 1)
                        }
                        className="p-0.5 rounded bg-gray-200 hover:bg-gray-300"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{getCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (18%):</span>
                    <span>₹{getTaxAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{getGrandTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmitOrder}
                  className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
                >
                  Create Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
