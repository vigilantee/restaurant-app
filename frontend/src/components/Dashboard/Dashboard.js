import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  // TrendingUp,
  Clock,
  Users,
  ChefHat,
  DollarSign,
  ShoppingBag,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const { state, fetchOrders, fetchOrderStats, fetchAvailableTables } =
    useApp();
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchOrderStats(),
        fetchOrders({ limit: 5 }),
        fetchAvailableTables(),
      ]);
    };

    loadData();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (state.orders) {
      setRecentOrders(state.orders.slice(0, 5));
    }
  }, [state.orders]);

  const stats = [
    {
      name: "Today's Revenue",
      value: `₹${state.orderStats?.total_revenue?.toLocaleString() || "0"}`,
      icon: DollarSign,
      change: "+12%",
      changeType: "positive",
      color: "bg-green-500",
    },
    {
      name: "Active Orders",
      value: state.orderStats?.active_orders || 0,
      icon: ShoppingBag,
      change: "+3",
      changeType: "positive",
      color: "bg-blue-500",
    },
    {
      name: "Available Tables",
      value: state.availableTables?.length || 0,
      icon: Users,
      change: `/${state.tables?.length || 0}`,
      changeType: "neutral",
      color: "bg-purple-500",
    },
    {
      name: "Orders Ready",
      value: state.orderStats?.ready_orders || 0,
      icon: CheckCircle,
      change: "Ready to serve",
      changeType: "positive",
      color: "bg-orange-500",
    },
  ];

  const getOrderStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      ready: "bg-orange-100 text-orange-800",
      served: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getUrgentOrders = () => {
    return (
      state.orders?.filter(
        (order) =>
          ["pending", "confirmed"].includes(order.order_status) &&
          new Date(order.order_date) < new Date(Date.now() - 15 * 60 * 1000) // Orders older than 15 minutes
      ) || []
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening in your restaurant.
          </p>
        </div>
        <button
          onClick={() => {
            fetchOrderStats();
            fetchOrders({ limit: 5 });
            fetchAvailableTables();
          }}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`${stat.color} p-3 rounded-md`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === "positive"
                          ? "text-green-600"
                          : stat.changeType === "negative"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {stat.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Urgent Alerts */}
      {getUrgentOrders().length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Urgent Orders Attention Required
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You have {getUrgentOrders().length} orders that have been
                  pending for more than 15 minutes.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  to="/orders?status=pending"
                  className="text-sm font-medium text-red-800 hover:text-red-600"
                >
                  View pending orders →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Orders
              </h3>
              <Link
                to="/orders"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(
                            order.order_status
                          )}`}
                        >
                          {order.order_status}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {order.order_number}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {order.table_number
                            ? `Table ${order.table_number}`
                            : order.order_type}
                          {order.customer_name && ` • ${order.customer_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{order.total_amount?.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(order.order_date), "HH:mm")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No orders yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first order.
                </p>
                <div className="mt-6">
                  <Link
                    to="/orders/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Order
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kitchen Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Kitchen Status
              </h3>
              <Link
                to="/kitchen"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View kitchen
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Preparing
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {state.orderStats?.preparing_orders || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-orange-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Ready
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {state.orderStats?.ready_orders || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChefHat className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Completed Today
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {state.orderStats?.completed_orders || 0}
                </span>
              </div>

              {state.orderStats?.avg_order_value && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Average Order Value
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      ₹
                      {Math.round(
                        state.orderStats.avg_order_value
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/orders/create"
              className="relative group bg-blue-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-600 text-white">
                  <ShoppingBag className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                  <span className="absolute inset-0" />
                  New Order
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create a new order for dine-in or takeaway
                </p>
              </div>
              <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                <ArrowUpRight className="h-6 w-6" />
              </span>
            </Link>

            <Link
              to="/menu/manage"
              className="relative group bg-green-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-green-500 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-600 text-white">
                  <ChefHat className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600">
                  <span className="absolute inset-0" />
                  Manage Menu
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Update menu items and availability
                </p>
              </div>
              <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                <ArrowUpRight className="h-6 w-6" />
              </span>
            </Link>

            <Link
              to="/tables"
              className="relative group bg-purple-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-purple-500 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-purple-600 text-white">
                  <Users className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-purple-600">
                  <span className="absolute inset-0" />
                  Table Status
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  View and manage table availability
                </p>
              </div>
              <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                <ArrowUpRight className="h-6 w-6" />
              </span>
            </Link>

            <Link
              to="/kitchen"
              className="relative group bg-orange-50 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-orange-500 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-orange-600 text-white">
                  <Clock className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-orange-600">
                  <span className="absolute inset-0" />
                  Kitchen Display
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Monitor order preparation status
                </p>
              </div>
              <span className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400">
                <ArrowUpRight className="h-6 w-6" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Table Status Overview */}
      {state.tables && state.tables.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Table Status
              </h3>
              <Link
                to="/tables/layout"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View layout
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {state.tables.slice(0, 12).map((table) => (
                <div
                  key={table.id}
                  className={`p-3 rounded-lg border-2 ${
                    table.is_available
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {table.table_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {table.capacity} seats
                    </div>
                    <div
                      className={`mt-1 text-xs font-medium ${
                        table.is_available ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {table.is_available ? "Available" : "Occupied"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {state.tables.length > 12 && (
              <div className="mt-4 text-center">
                <Link
                  to="/tables"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all {state.tables.length} tables →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
