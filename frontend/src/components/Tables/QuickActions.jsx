import React from "react";
import { Plus, Settings, Eye } from "lucide-react";

const QuickActions = ({ navigate }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
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
          <div className="text-sm font-medium text-gray-900">Manage Tables</div>
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
  );
};

export default QuickActions;
