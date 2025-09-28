import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { tablesAPI, ordersAPI } from "../../services/api";
import MenuDisplay from "../Menu/MenuDisplay";
import {
  Users,
  Clock,
  Plus,
  Settings,
  Eye,
  MapPin,
  RefreshCw,
  Filter,
  X,
  Minus,
  Printer,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

const EnhancedTableLayout = () => {
  const navigate = useNavigate();
  const { fetchAvailableTables } = useApp();

  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [locationFilter, setLocationFilter] = useState("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Modal states
  const [selectedTable, setSelectedTable] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [newOrder, setNewOrder] = useState({
    items: [],
    customer_name: "",
    table_id: null,
    subtotal: 0,
    tax: 0,
    total: 0,
  });

  // Menu state for modal
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadTableData();
  }, []);

  const loadTableData = async () => {
    try {
      setLoading(true);
      const [tablesResponse, ordersResponse] = await Promise.all([
        tablesAPI.getAll(),
        ordersAPI.getAll({
          limit: 100,
        }),
      ]);

      setTables(tablesResponse.data || []);
      const orders = ordersResponse.data?.orders || ordersResponse.data || [];
      setActiveOrders(orders);
    } catch (error) {
      toast.error("Failed to load table data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTableAvailability = async (tableId) => {
    try {
      await tablesAPI.toggleAvailability(tableId);
      await loadTableData();
      toast.success("Table status updated");
    } catch (error) {
      toast.error("Failed to update table status");
    }
  };

  const getTableOrder = (tableId) => {
    return activeOrders.find(
      (order) =>
        order.table_id === tableId &&
        !["completed", "cancelled"].includes(order.order_status)
    );
  };

  const getTableStatusColor = (table) => {
    if (!table.is_available) {
      const order = getTableOrder(table.id);
      if (order) {
        switch (order.order_status) {
          case "pending":
          case "confirmed":
            return "bg-yellow-100 border-yellow-300 text-yellow-800";
          case "preparing":
            return "bg-blue-100 border-blue-300 text-blue-800";
          case "ready":
            return "bg-orange-100 border-orange-300 text-orange-800";
          case "served":
            return "bg-purple-100 border-purple-300 text-purple-800";
          default:
            return "bg-red-100 border-red-300 text-red-800";
        }
      }
      return "bg-red-100 border-red-300 text-red-800";
    }
    return "bg-green-100 border-green-300 text-green-800";
  };

  const getTableIcon = (table) => {
    if (!table.is_available) {
      return <Clock className="h-4 w-4" />;
    }
    return <Users className="h-4 w-4" />;
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    const order = getTableOrder(table.id);

    if (order) {
      setCurrentOrder(order);
      setShowOrderModal(true);
    } else if (table.is_available) {
      // Start new order
      setNewOrder({
        items: [],
        customer_name: "",
        table_id: table.id,
        subtotal: 0,
        tax: 0,
        total: 0,
      });
      setSearchTerm("");
      setSelectedCategory("all");
      setShowMenuModal(true);
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setCurrentOrder((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
          : item
      );

      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total_amount: subtotal + tax,
      };
    });
  };

  const handleRemoveItem = (itemId) => {
    setCurrentOrder((prev) => {
      const updatedItems = prev.items.filter((item) => item.id !== itemId);
      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total_amount: subtotal + tax,
      };
    });
  };

  const addItemToOrder = (menuItem) => {
    const existingItem = newOrder.items.find((item) => item.id === menuItem.id);

    if (existingItem) {
      setNewOrder((prev) => {
        const updatedItems = prev.items.map((item) =>
          item.id === menuItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item
        );

        const subtotal = updatedItems.reduce(
          (sum, item) => sum + item.total,
          0
        );
        const tax = subtotal * 0.18;

        return {
          ...prev,
          items: updatedItems,
          subtotal,
          tax,
          total: subtotal + tax,
        };
      });
    } else {
      setNewOrder((prev) => {
        const newItem = {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          total: menuItem.price,
        };

        const updatedItems = [...prev.items, newItem];
        const subtotal = updatedItems.reduce(
          (sum, item) => sum + item.total,
          0
        );
        const tax = subtotal * 0.18;

        return {
          ...prev,
          items: updatedItems,
          subtotal,
          tax,
          total: subtotal + tax,
        };
      });
    }
    toast.success(`${menuItem.name} added to order`);
  };

  const removeItemFromNewOrder = (itemId) => {
    setNewOrder((prev) => {
      const updatedItems = prev.items.filter((item) => item.id !== itemId);
      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total: subtotal + tax,
      };
    });
  };

  const updateNewOrderItemQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItemFromNewOrder(itemId);
      return;
    }

    setNewOrder((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      );

      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total: subtotal + tax,
      };
    });
  };

  const handlePlaceOrder = async () => {
    if (newOrder.items.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    if (!newOrder.customer_name.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    try {
      // Create order through API
      const orderData = {
        table_id: newOrder.table_id,
        customer_name: newOrder.customer_name,
        items: newOrder.items.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: newOrder.subtotal,
        tax: newOrder.tax,
        total_amount: newOrder.total,
        order_status: "pending",
      };

      await ordersAPI.create(orderData);

      // Update table availability
      await tablesAPI.toggleAvailability(newOrder.table_id);

      // Refresh data
      await loadTableData();

      setShowMenuModal(false);
      setNewOrder({
        items: [],
        customer_name: "",
        table_id: null,
        subtotal: 0,
        tax: 0,
        total: 0,
      });
      toast.success("Order placed successfully!");
    } catch (error) {
      toast.error("Failed to place order: " + error.message);
    }
  };

  const handlePrintReceipt = () => {
    const order = currentOrder;
    const table = selectedTable;

    const printWindow = window.open("", "_blank");
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .order-info { margin: 20px 0; }
          .items table { width: 100%; border-collapse: collapse; }
          .items th, .items td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
          .total-section { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .grand-total { font-weight: bold; font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Restaurant Name</h1>
          <p>123 Restaurant Street, City</p>
          <p>Phone: (555) 123-4567</p>
        </div>
        
        <div class="order-info">
          <p><strong>Order #:</strong> ${order.order_number}</p>
          <p><strong>Table:</strong> ${table?.table_number}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Date:</strong> ${
            order.order_date
              ? new Date(order.order_date).toLocaleString()
              : new Date().toLocaleString()
          }</p>
          <p><strong>Status:</strong> ${order.order_status}</p>
        </div>
        
        <div class="items">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price}</td>
                  <td>₹${item.total}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${order.subtotal?.toFixed(2) || "0.00"}</span>
          </div>
          <div class="total-row">
            <span>Tax (18%):</span>
            <span>₹${order.tax?.toFixed(2) || "0.00"}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>₹${order.total_amount?.toFixed(2) || "0.00"}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p>Thank you for dining with us!</p>
          <p>Visit us again soon!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredTables = tables.filter((table) => {
    const matchesLocation =
      locationFilter === "all" || table.location === locationFilter;
    const matchesAvailability = !showAvailableOnly || table.is_available;
    return matchesLocation && matchesAvailability;
  });

  const locations = [
    ...new Set(tables.map((table) => table.location).filter(Boolean)),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading table layout...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Table Layout</h1>
          <p className="text-gray-600">
            Visual overview of restaurant table status
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadTableData}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <button
            onClick={() => navigate("/tables")}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Settings className="h-4 w-4 mr-1" />
            Manage Tables
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="text-lg font-semibold text-gray-900">
                {tables.filter((t) => t.is_available).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Occupied</p>
              <p className="text-lg font-semibold text-gray-900">
                {tables.filter((t) => !t.is_available).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Tables</p>
              <p className="text-lg font-semibold text-gray-900">
                {tables.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-md">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Total Capacity
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {tables.reduce((sum, table) => sum + table.capacity, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Available only</span>
            </label>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Ordered</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Preparing</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
              <span>Ready</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
              <span>Served</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Layout Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        {locations.length > 0 ? (
          <div className="space-y-8">
            {locations.map((location) => {
              const locationTables = filteredTables.filter(
                (table) => table.location === location
              );
              if (locationTables.length === 0) return null;

              return (
                <div key={location}>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                    {location}
                    <span className="ml-2 text-sm text-gray-500">
                      ({locationTables.length} tables)
                    </span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {locationTables.map((table) => {
                      const order = getTableOrder(table.id);
                      return (
                        <div
                          key={table.id}
                          onClick={() => handleTableClick(table)}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getTableStatusColor(
                            table
                          )}`}
                        >
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              {getTableIcon(table)}
                            </div>

                            <div className="font-medium text-sm">
                              {table.table_number}
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              {table.capacity} seats
                            </div>

                            {order && (
                              <div className="mt-2 space-y-1">
                                <div className="text-xs font-medium">
                                  {order.order_number}
                                </div>
                                <div className="text-xs opacity-75">
                                  {order.customer_name || "Walk-in"}
                                </div>
                                <div className="text-xs opacity-75">
                                  ₹{order.total_amount?.toFixed(0)}
                                </div>
                              </div>
                            )}

                            {table.is_available && (
                              <div className="mt-2">
                                <Plus className="h-3 w-3 mx-auto opacity-60" />
                              </div>
                            )}
                          </div>

                          <div
                            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                              table.is_available ? "bg-green-500" : "bg-red-500"
                            }`}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filteredTables.map((table) => {
              const order = getTableOrder(table.id);
              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getTableStatusColor(
                    table
                  )}`}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getTableIcon(table)}
                    </div>

                    <div className="font-medium text-sm">
                      {table.table_number}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {table.capacity} seats
                    </div>

                    {order && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium">
                          {order.order_number}
                        </div>
                        <div className="text-xs opacity-75">
                          {order.customer_name || "Walk-in"}
                        </div>
                        <div className="text-xs opacity-75">
                          ₹{order.total_amount?.toFixed(0)}
                        </div>
                      </div>
                    )}

                    {table.is_available && (
                      <div className="mt-2">
                        <Plus className="h-3 w-3 mx-auto opacity-60" />
                      </div>
                    )}
                  </div>

                  <div
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                      table.is_available ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                </div>
              );
            })}
          </div>
        )}

        {filteredTables.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No tables found matching your criteria
            </p>
          </div>
        )}
      </div>

      {/* Current Order Modal */}
      {showOrderModal && selectedTable && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Current Order - Table {selectedTable.table_number}
                </h3>
                <p className="text-sm text-gray-500">
                  Order #{currentOrder.order_number}
                </p>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Customer:
                    </span>
                    <p className="text-sm text-gray-900">
                      {currentOrder.customer_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Status:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      {currentOrder.order_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Order Time:
                    </span>
                    <p className="text-sm text-gray-900">
                      {currentOrder.order_date
                        ? new Date(currentOrder.order_date).toLocaleTimeString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Table:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedTable.table_number} ({selectedTable.capacity}{" "}
                      seats)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Order Items</h4>
                {currentOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{item.name}</h5>
                      <p className="text-sm text-gray-500">
                        ₹{item.price} each
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity - 1)
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <span className="w-16 text-right font-medium">
                        ₹{item.total}
                      </span>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{currentOrder.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (18%):</span>
                    <span>₹{currentOrder.tax?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>
                      ₹{currentOrder.total_amount?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setShowMenuModal(true);
                    setNewOrder({
                      items: [...currentOrder.items],
                      customer_name: currentOrder.customer_name,
                      table_id: currentOrder.table_id,
                      subtotal: currentOrder.subtotal,
                      tax: currentOrder.tax,
                      total: currentOrder.total_amount,
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Items
                </button>
              </div>

              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
              >
                <Printer className="h-4 w-4 mr-1" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Modal for New Orders */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {newOrder.table_id
                    ? `New Order - Table ${selectedTable?.table_number}`
                    : "Browse Menu"}
                </h3>
                <p className="text-sm text-gray-500">
                  Select items to add to your order
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMenuModal(false);
                  setNewOrder({
                    items: [],
                    customer_name: "",
                    table_id: null,
                    subtotal: 0,
                    tax: 0,
                    total: 0,
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex h-[calc(90vh-200px)]">
              {/* Menu Section */}
              <div className="flex-1 p-6 overflow-y-auto">
                <MenuDisplay
                  onAddItem={addItemToOrder}
                  isModal={true}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                />
              </div>

              {/* Order Summary Sidebar */}
              <div className="w-80 border-l bg-gray-50 p-6 overflow-y-auto">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary
                </h4>

                {/* Customer Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={newOrder.customer_name}
                    onChange={(e) =>
                      setNewOrder((prev) => ({
                        ...prev,
                        customer_name: e.target.value,
                      }))
                    }
                    placeholder="Enter customer name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-6">
                  {newOrder.items.length === 0 ? (
                    <p className="text-gray-500 text-sm">No items added yet</p>
                  ) : (
                    newOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                      >
                        <div className="flex-1">
                          <h6 className="font-medium text-sm text-gray-900">
                            {item.name}
                          </h6>
                          <p className="text-xs text-gray-500">
                            ₹{item.price} each
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() =>
                                updateNewOrderItemQuantity(
                                  item.id,
                                  item.quantity - 1
                                )
                              }
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateNewOrderItemQuantity(
                                  item.id,
                                  item.quantity + 1
                                )
                              }
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-medium">
                            ₹{item.total}
                          </span>
                          <button
                            onClick={() => removeItemFromNewOrder(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Order Total */}
                {newOrder.items.length > 0 && (
                  <div className="p-4 bg-white rounded-lg border mb-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>₹{newOrder.subtotal?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (18%):</span>
                        <span>₹{newOrder.tax?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total:</span>
                        <span>₹{newOrder.total?.toFixed(2) || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={
                      newOrder.items.length === 0 ||
                      !newOrder.customer_name.trim()
                    }
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Place Order
                  </button>

                  <button
                    onClick={() => {
                      setShowMenuModal(false);
                      setNewOrder({
                        items: [],
                        customer_name: "",
                        table_id: null,
                        subtotal: 0,
                        tax: 0,
                        total: 0,
                      });
                    }}
                    className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/orders/create")}
            className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-blue-900">New Order</div>
            <div className="text-xs text-blue-600">Create walk-in order</div>
          </button>

          <button
            onClick={() => navigate("/tables")}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">
              Manage Tables
            </div>
            <div className="text-xs text-gray-600">
              Add, edit, or remove tables
            </div>
          </button>

          <button
            onClick={() => navigate("/orders")}
            className="p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
          >
            <Eye className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-green-900">
              View All Orders
            </div>
            <div className="text-xs text-green-600">Order management</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTableLayout;
