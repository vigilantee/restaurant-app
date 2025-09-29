import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { ordersAPI } from "../../services/api";
import {
  ArrowLeft,
  Clock,
  User,
  MapPin,
  Receipt,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateOrderStatus } = useApp();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrderDetails();
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getById(id);
      setOrder(response.data);
    } catch (error) {
      toast.error("Failed to load order details: " + error.message);
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsUpdating(true);
      await updateOrderStatus(order?.id, newStatus);
      setOrder({ ...order, order_status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update order status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-blue-100 text-blue-800 border-blue-200",
      preparing: "bg-purple-100 text-purple-800 border-purple-200",
      ready: "bg-orange-100 text-orange-800 border-orange-200",
      served: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading order details...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/orders")}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600">{order?.order_number}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
              order?.order_status
            )}`}
          >
            {order?.order_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Order Information
              </h3>
              <div className="text-sm text-gray-500">
                {format(new Date(order?.order_date), "MMM dd, yyyy HH:mm")}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <Receipt className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Order Type
                  </div>
                  <div className="text-sm text-gray-500 capitalize">
                    {order?.order_type?.replace("_", " ")}
                  </div>
                </div>
              </div>

              {order?.table_number && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Table
                    </div>
                    <div className="text-sm text-gray-500">
                      Table {order?.table_number}
                      {order?.table_location && ` (${order?.table_location})`}
                    </div>
                  </div>
                </div>
              )}

              {order?.customer_name && (
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Customer
                    </div>
                    <div className="text-sm text-gray-500">
                      {order?.customer_name}
                      {order?.customer_phone && (
                        <div className="text-xs">{order?.customer_phone}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {order?.special_instructions && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm font-medium text-yellow-800">
                  Special Instructions:
                </div>
                <div className="text-sm text-yellow-700">
                  {order?.special_instructions}
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Order Items
            </h3>

            {order?.items && order?.items.length > 0 ? (
              <div className="space-y-3">
                {order?.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.item_name}
                        </h4>
                        <div className="text-sm text-gray-500">
                          ₹{item.unit_price} × {item.quantity}
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </p>
                      )}
                      {item.special_notes && (
                        <p className="text-xs text-blue-600 mt-1">
                          Note: {item.special_notes}
                        </p>
                      )}
                      {item.category_name && (
                        <p className="text-xs text-gray-400 mt-1">
                          {item.category_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{item.total_price?.toFixed?.(2)}
                      </div>
                      {item.preparation_time && (
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.preparation_time}m
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No items found</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Status
            </h3>
            <div className="space-y-2">
              {[
                "pending",
                "confirmed",
                "preparing",
                "ready",
                "served",
                "completed",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={isUpdating || order?.order_status === status}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    order?.order_status === status
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Order Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">
                  ₹{order?.subtotal?.toFixed?.(2) || "0.00"}
                </span>
              </div>
              {order?.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-red-600">
                    -₹{order?.discount_amount?.toFixed?.(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="text-gray-900">
                  ₹{order?.tax_amount?.toFixed?.(2) || "0.00"}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>₹{order?.total_amount?.toFixed?.(2) || "0.00"}</span>
                </div>
              </div>

              {order?.payment_status && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status:</span>
                    <span
                      className={`font-medium ${
                        order?.payment_status === "paid"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {order?.payment_status}
                    </span>
                  </div>
                  {order?.payment_method && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="text-gray-900 capitalize">
                        {order?.payment_method}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timing Information */}
          {(order?.estimated_ready_time || order?.completed_at) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timing</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Order Placed
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(order?.order_date), "HH:mm, MMM dd")}
                    </div>
                  </div>
                </div>

                {order?.estimated_ready_time && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-orange-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Estimated Ready
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(
                          new Date(order?.estimated_ready_time),
                          "HH:mm, MMM dd"
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {order?.completed_at && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Completed
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(order?.completed_at), "HH:mm, MMM dd")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
