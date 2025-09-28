import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppProvider } from "./context/AppContext";

// Layout
import Layout from "./components/Layout/Layout";

// Pages
import Dashboard from "./components/Dashboard/Dashboard";
import MenuDisplay from "./components/Menu/MenuDisplay";
import MenuManager from "./components/Menu/MenuManager";
import CategoryManager from "./components/Menu/CategoryManager";
import OrderList from "./components/Orders/OrderList";
import OrderDetails from "./components/Orders/OrderDetails";
import CreateOrder from "./components/Orders/CreateOrder";
import OrderTracking from "./components/Orders/OrderTracking";
import TableManager from "./components/Tables/TableManager";
import TableLayout from "./components/Tables/TableLayout";
import CustomerManager from "./components/Customers/CustomerManager";

import "./App.css";

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#363636",
                color: "#fff",
              },
            }}
          />

          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />

              {/* Menu Routes */}
              <Route path="menu" element={<MenuDisplay />} />
              <Route path="menu/manage" element={<MenuManager />} />
              <Route path="menu/categories" element={<CategoryManager />} />

              {/* Order Routes */}
              <Route path="orders" element={<OrderList />} />
              <Route path="orders/create" element={<CreateOrder />} />
              <Route path="orders/:id" element={<OrderDetails />} />
              <Route path="kitchen" element={<OrderTracking />} />

              {/* Table Routes */}
              <Route path="tables" element={<TableManager />} />
              <Route path="tables/layout" element={<TableLayout />} />

              {/* Customer Routes */}
              <Route path="customers" element={<CustomerManager />} />

              {/* Catch all route */}
              <Route path="*" element={<div>Page not found</div>} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
