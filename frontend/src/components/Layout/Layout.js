import React from "react";
import { Outlet } from "react-router-dom";
import { useApp } from "../../context/AppContext";
// import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout = () => {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className={`${
          state.sidebarOpen ? "lg:ml-64" : "lg:ml-16"
        } transition-all duration-300`}
      >
        {/* Header */}
        {/* <Header /> */}

        {/* Page Content */}
        <main className="p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Loading Overlay */}
      {state.loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
