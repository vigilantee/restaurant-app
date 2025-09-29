import React from "react";
import { Users, Clock, MapPin } from "lucide-react";

const TableStatsOverview = ({ tables }) => {
  const availableCount = tables.filter((t) => t.is_available).length;
  const occupiedCount = tables.filter((t) => !t.is_available).length;
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-md">
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Available</p>
            <p className="text-lg font-semibold text-gray-900">
              {availableCount}
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
              {occupiedCount}
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
            <p className="text-sm font-medium text-gray-500">Total Capacity</p>
            <p className="text-lg font-semibold text-gray-900">
              {totalCapacity}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableStatsOverview;
