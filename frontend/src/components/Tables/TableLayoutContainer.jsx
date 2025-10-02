import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { tablesAPI, ordersAPI } from "../../services/api";
import toast from "react-hot-toast";

import TableLayoutHeader from "./TableLayoutHeader";
import TableStatsOverview from "./TableStatsOverview";
import TableFilters from "./TableFilters";
import TableGrid from "./TableGrid";
import OrderModal from "./OrderModal";
import MenuModal from "./MenuModal";
import QuickActions from "./QuickActions";

const TableLayoutContainer = () => {
  const navigate = useNavigate();
  const { fetchAvailableTables } = useApp();

  // State
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadTableData();
  }, []);

  const loadTableData = async () => {
    try {
      setLoading(true);
      const [tablesResponse, ordersResponse] = await Promise.all([
        tablesAPI.getAll(),
        ordersAPI.getAll({ limit: 100 }),
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

  const getTableOrder = (tableId) => {
    return activeOrders.find(
      (order) =>
        order.table_id === tableId &&
        !["completed", "cancelled"].includes(order.order_status)
    );
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    const order = getTableOrder(table.id);

    if (order) {
      setCurrentOrder(order);
      setShowOrderModal(true);
    } else if (table.is_available) {
      setNewOrder({
        items: [],
        customer_name: "",
        table_id: table.id,
        subtotal: 0,
        tax: 0,
        total: 0,
      });
      setShowMenuModal(true);
    }
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
      // await tablesAPI.toggleAvailability(newOrder.table_id);
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
      <TableLayoutHeader navigate={navigate} onRefresh={loadTableData} />

      <TableStatsOverview tables={tables} />

      <TableFilters
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        showAvailableOnly={showAvailableOnly}
        setShowAvailableOnly={setShowAvailableOnly}
        locations={locations}
      />

      <TableGrid
        tables={filteredTables}
        locations={locations}
        getTableOrder={getTableOrder}
        onTableClick={handleTableClick}
      />

      {showOrderModal && (
        <OrderModal
          selectedTable={selectedTable}
          currentOrder={currentOrder}
          setCurrentOrder={setCurrentOrder}
          onClose={() => setShowOrderModal(false)}
          onAddItems={() => {
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
        />
      )}

      {showMenuModal && (
        <MenuModal
          selectedTable={selectedTable}
          newOrder={newOrder}
          setNewOrder={setNewOrder}
          onClose={() => {
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
          onPlaceOrder={handlePlaceOrder}
        />
      )}

      <QuickActions navigate={navigate} />
    </div>
  );
};

export default TableLayoutContainer;
