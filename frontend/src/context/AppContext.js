import React, { createContext, useContext, useReducer, useEffect } from "react";
import { ordersAPI, tablesAPI } from "../services/api";
import toast from "react-hot-toast";

const AppContext = createContext();

const initialState = {
  // Orders
  orders: [],
  currentOrder: null,
  orderStats: null,

  // Tables
  tables: [],
  availableTables: [],

  // Menu
  menu: [],
  categories: [],

  // Customers
  customers: [],

  // UI State
  loading: false,
  error: null,
  sidebarOpen: true,
  currentView: "dashboard",

  // Cart for new orders
  cart: [],
  selectedTable: null,
  selectedCustomer: null,
};

const appReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };

    case "SET_ORDERS":
      return { ...state, orders: action.payload };

    case "SET_CURRENT_ORDER":
      return { ...state, currentOrder: action.payload };

    case "UPDATE_ORDER":
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.id ? action.payload : order
        ),
        currentOrder:
          state.currentOrder?.id === action.payload.id
            ? action.payload
            : state.currentOrder,
      };

    case "SET_ORDER_STATS":
      return { ...state, orderStats: action.payload };

    case "SET_TABLES":
      return { ...state, tables: action.payload };

    case "SET_AVAILABLE_TABLES":
      return { ...state, availableTables: action.payload };

    case "UPDATE_TABLE":
      return {
        ...state,
        tables: state.tables.map((table) =>
          table.id === action.payload.id ? action.payload : table
        ),
      };

    case "SET_MENU":
      return { ...state, menu: action.payload };

    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };

    case "SET_CUSTOMERS":
      return { ...state, customers: action.payload };

    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case "SET_CURRENT_VIEW":
      return { ...state, currentView: action.payload };

    // Cart actions
    case "ADD_TO_CART":
      const existingItem = state.cart.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.id === action.payload.id
              ? {
                  ...item,
                  quantity: item.quantity + (action.payload.quantity || 1),
                }
              : item
          ),
        };
      }
      return {
        ...state,
        cart: [
          ...state.cart,
          { ...action.payload, quantity: action.payload.quantity || 1 },
        ],
      };

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((item) => item.id !== action.payload),
      };

    case "UPDATE_CART_ITEM":
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };

    case "CLEAR_CART":
      return {
        ...state,
        cart: [],
        selectedTable: null,
        selectedCustomer: null,
      };

    case "SET_SELECTED_TABLE":
      return { ...state, selectedTable: action.payload };

    case "SET_SELECTED_CUSTOMER":
      return { ...state, selectedCustomer: action.payload };

    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const setLoading = (loading) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: "SET_ERROR", payload: error });
    if (error) {
      toast.error(error);
    }
  };

  const fetchOrders = async (params = {}) => {
    try {
      setLoading(true);
      const response = await ordersAPI.getAll(params);
      dispatch({
        type: "SET_ORDERS",
        payload: response.data.orders || response.data,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderById = async (id) => {
    try {
      setLoading(true);
      const response = await ordersAPI.getById(id);
      dispatch({ type: "SET_CURRENT_ORDER", payload: response.data });
      return response.data;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status, additionalData = {}) => {
    try {
      const response = await ordersAPI.updateStatus(orderId, {
        status,
        ...additionalData,
      });
      dispatch({ type: "UPDATE_ORDER", payload: response.data });
      toast.success(`Order status updated to ${status}`);
      return response.data;
    } catch (error) {
      setError(error.message);
      return null;
    }
  };

  const fetchTables = async (params = {}) => {
    try {
      const response = await tablesAPI.getAll(params);
      dispatch({ type: "SET_TABLES", payload: response.data });
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchAvailableTables = async () => {
    try {
      const response = await tablesAPI.getAvailable();
      dispatch({ type: "SET_AVAILABLE_TABLES", payload: response.data });
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchOrderStats = async () => {
    try {
      const response = await ordersAPI.getTodaysSummary();
      dispatch({ type: "SET_ORDER_STATS", payload: response.data });
    } catch (error) {
      setError(error.message);
    }
  };

  const createOrder = async (orderData) => {
    try {
      setLoading(true);
      const response = await ordersAPI.create(orderData);
      const orderId = response.data.id;

      // Add items to order if cart has items
      if (state.cart.length > 0) {
        const items = state.cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          special_notes: item.special_notes || null,
        }));

        await ordersAPI.addItems(orderId, items);
      }

      dispatch({ type: "CLEAR_CART" });
      toast.success("Order created successfully!");

      // Refresh orders and tables
      await fetchOrders();
      await fetchAvailableTables();

      return response.data;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Cart actions
  const addToCart = (item, quantity = 1) => {
    dispatch({ type: "ADD_TO_CART", payload: { ...item, quantity } });
    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (itemId) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: itemId });
    toast.success("Item removed from cart");
  };

  const updateCartItem = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      dispatch({ type: "UPDATE_CART_ITEM", payload: { id: itemId, quantity } });
    }
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
    toast.success("Cart cleared");
  };

  // Initialize data on mount
  useEffect(() => {
    const initializeApp = async () => {
      await Promise.all([
        fetchOrders(),
        fetchTables(),
        fetchAvailableTables(),
        fetchOrderStats(),
      ]);
    };

    initializeApp();
  }, []);

  const value = {
    state,
    dispatch,
    // Actions
    setLoading,
    setError,
    fetchOrders,
    fetchOrderById,
    updateOrderStatus,
    fetchTables,
    fetchAvailableTables,
    fetchOrderStats,
    createOrder,
    // Cart actions
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
