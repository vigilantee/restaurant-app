import React from "react";
import { Users, Clock, Plus } from "lucide-react";

const TableCard = ({ table, order, onClick }) => {
  const getTableStatusColor = (table) => {
    if (!table.is_available) {
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

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getTableStatusColor(
        table
      )}`}
    >
      <div className="text-center">
        <div className="flex items-center justify-center mb-2">
          {getTableIcon(table)}
        </div>

        <div className="font-medium text-sm">{table.table_number}</div>
        <div className="text-xs opacity-75 mt-1">{table.capacity} seats</div>

        {order && (
          <div className="mt-2 space-y-1">
            <div className="text-xs font-medium">{order.order_number}</div>
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
};

export default TableCard;
