import React from "react";
import { Users, MapPin } from "lucide-react";
import TableCard from "./TableCard";

const TableGrid = ({ tables, locations, getTableOrder, onTableClick }) => {
  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            No tables found matching your criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {locations.length > 0 ? (
        <div className="space-y-8">
          {locations.map((location) => {
            const locationTables = tables.filter(
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
                  {locationTables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      order={getTableOrder(table.id)}
                      onClick={() => onTableClick(table)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              order={getTableOrder(table.id)}
              onClick={() => onTableClick(table)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TableGrid;
