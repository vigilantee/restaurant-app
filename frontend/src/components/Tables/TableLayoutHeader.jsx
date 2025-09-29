import React from "react";
import { RefreshCw, Settings } from "lucide-react";

const TableLayoutHeader = ({ navigate, onRefresh }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Table Layout</h1>
        <p className="text-gray-600">
          Visual overview of restaurant table status
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onRefresh}
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
  );
};

export default TableLayoutHeader;
