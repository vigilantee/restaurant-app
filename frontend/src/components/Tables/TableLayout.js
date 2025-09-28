import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { tablesAPI, ordersAPI } from "../../services/api";
import {
  Users,
  Clock,
  Plus,
  Settings,
  Eye,
  MapPin,
  RefreshCw,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

const TableLayout = () => {
  const navigate = useNavigate();
  const { fetchAvailableTables } = useApp();
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // grid or floor
  const [locationFilter, setLocationFilter] = useState("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  useEffect(() => {
    loadTableData();
  }, []);

  const loadTableData = async () => {
    try {
      setLoading(true);
      const [tablesResponse, ordersResponse] = await Promise.all([
        tablesAPI.getAll(),
        ordersAPI.getAll({
          status: "pending,confirmed,preparing,ready,served",
          limit: 100,
        }),
      ]);

      setTables(tablesResponse.data || []);

      // Get orders data
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
      await loadTableData(); // Refresh data
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

  const filteredTables = tables.filter((table) => {
    const matchesLocation =
      locationFilter === "all" || table.location === locationFilter;
    const matchesAvailability = !showAvailableOnly || table.is_available;
    return matchesLocation && matchesAvailability;
  });

  const locations = [
    ...new Set(tables.map((table) => table.location).filter(Boolean)),
  ];

  const handleTableClick = (table) => {
    const order = getTableOrder(table.id);
    if (order) {
      navigate(`/orders/${order.id}`);
    } else if (table.is_available) {
      // Start new order for this table
      navigate("/orders/create", { state: { selectedTableId: table.id } });
    }
  };

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
          // Group by location
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
                          className={`
                            relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                            ${getTableStatusColor(table)}
                          `}
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

                          {/* Status indicator */}
                          <div
                            className={`
                            absolute top-1 right-1 w-2 h-2 rounded-full
                            ${
                              table.is_available ? "bg-green-500" : "bg-red-500"
                            }
                          `}
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
          // Single grid if no locations
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filteredTables.map((table) => {
              const order = getTableOrder(table.id);
              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`
                    relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                    ${getTableStatusColor(table)}
                  `}
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

                  {/* Status indicator */}
                  <div
                    className={`
                    absolute top-1 right-1 w-2 h-2 rounded-full
                    ${table.is_available ? "bg-green-500" : "bg-red-500"}
                  `}
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

export default TableLayout;
