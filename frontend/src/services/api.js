import axios from "axios";

// Get API URL - prioritize Electron's dynamic URL, fallback to environment variable
const getBaseURL = () => {
  // Check if running in Electron
  if (window.REACT_APP_API_URL) {
    return window.REACT_APP_API_URL;
  }

  // Fallback to environment variable or default
  return process.env.REACT_APP_API_URL || "http://localhost:8080/api";
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Update baseURL if it changes (for Electron hot reload)
if (window.electron?.isElectron) {
  const checkAndUpdateBaseURL = () => {
    const newBaseURL = getBaseURL();
    if (api.defaults.baseURL !== newBaseURL) {
      api.defaults.baseURL = newBaseURL;
      console.log("API baseURL updated to:", newBaseURL);
    }
  };

  // Check on mount and periodically
  checkAndUpdateBaseURL();
  setInterval(checkAndUpdateBaseURL, 5000);
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message =
      error.response?.data?.message || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  }
);

// API endpoints
export const menuAPI = {
  getFullMenu: () => api.get("/menu"),
  getMenuByCategory: (categoryId) => api.get(`/menu/category/${categoryId}`),
  getMenuItem: (id) => api.get(`/menu/item/${id}`),
  searchMenu: (params) => api.get("/menu/search", { params }),
  createMenuItem: (data) => api.post("/menu/item", data),
  updateMenuItem: (id, data) => api.put(`/menu/item/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/menu/item/${id}`),
  toggleAvailability: (id) => api.put(`/menu/item/${id}/availability`),
};

export const categoriesAPI = {
  getAll: () => api.get("/categories"),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post("/categories", data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const tablesAPI = {
  getAll: (params) => api.get("/tables", { params }),
  getAvailable: () => api.get("/tables/available"),
  getById: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post("/tables", data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  delete: (id) => api.delete(`/tables/${id}`),
  toggleAvailability: (id) => api.put(`/tables/${id}/availability`),
};

export const ordersAPI = {
  getAll: (params) => api.get("/orders", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post("/orders", data),
  addItems: (id, items) => api.post(`/orders/${id}/items`, { items }),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  applyDiscount: (id, discount) =>
    api.put(`/orders/${id}/discount`, { discount_amount: discount }),
  getTodaysSummary: () => api.get("/orders/summary/today"),
};

export const customersAPI = {
  getAll: (params) => api.get("/customers", { params }),
  getById: (id) => api.get(`/customers/${id}`),
  getOrderHistory: (id) => api.get(`/customers/${id}/orders`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const staffAPI = {
  getAll: (params) => api.get("/staff", { params }),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post("/staff", data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  toggleStatus: (id) => api.put(`/staff/${id}/status`),
};

export default api;
