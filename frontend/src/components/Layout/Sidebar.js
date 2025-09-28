import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  Home,
  UtensilsCrossed,
  ShoppingBag,
  Users,
  ChefHat,
  BarChart3,
  Settings,
  Plus,
  ClipboardList,
  Layout as LayoutIcon,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  {
    name: "Orders",
    icon: ShoppingBag,
    children: [
      { name: "All Orders", href: "/orders" },
      { name: "Create Order", href: "/orders/create" },
      { name: "Kitchen Display", href: "/kitchen" },
    ],
  },
  {
    name: "Menu",
    icon: UtensilsCrossed,
    children: [
      { name: "View Menu", href: "/menu" },
      { name: "Manage Items", href: "/menu/manage" },
      { name: "Categories", href: "/menu/categories" },
    ],
  },
  {
    name: "Tables",
    icon: LayoutIcon,
    children: [
      { name: "Table Status", href: "/tables" },
      { name: "Layout View", href: "/tables/layout" },
    ],
  },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const Sidebar = () => {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const [openMenus, setOpenMenus] = React.useState({});

  const toggleSubmenu = (menuName) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const isActivePath = (href) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  const isActiveParent = (children) => {
    return children?.some((child) => isActivePath(child.href));
  };

  const closeSidebar = () => {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  };

  return (
    <>
      {/* Sidebar for desktop */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out
        ${state.sidebarOpen ? "w-64" : "w-16"}
        hidden lg:block
      `}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200 px-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-white" />
              </div>
              {state.sidebarOpen && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Miraya</h2>
                  <p className="text-xs text-gray-500">Management System</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navigation.map((item) => (
                <li key={item.name}>
                  {item.children ? (
                    <div>
                      <button
                        onClick={() => toggleSubmenu(item.name)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors
                          ${
                            isActiveParent(item.children)
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                          {state.sidebarOpen && <span>{item.name}</span>}
                        </div>
                        {state.sidebarOpen && (
                          <svg
                            className={`h-4 w-4 transform transition-transform ${
                              openMenus[item.name] ? "rotate-90" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </button>

                      {state.sidebarOpen &&
                        (openMenus[item.name] ||
                          isActiveParent(item.children)) && (
                          <ul className="mt-1 space-y-1 pl-8">
                            {item.children.map((child) => (
                              <li key={child.name}>
                                <Link
                                  to={child.href}
                                  className={`
                                  block px-3 py-2 text-sm rounded-md transition-colors
                                  ${
                                    isActivePath(child.href)
                                      ? "bg-blue-100 text-blue-700 font-medium"
                                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                  }
                                `}
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className={`
                        flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${
                          isActivePath(item.href)
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {state.sidebarOpen && <span>{item.name}</span>}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Actions */}
          {state.sidebarOpen && (
            <div className="border-t border-gray-200 p-4">
              <div className="space-y-2">
                <Link
                  to="/orders/create"
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {state.sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-600 opacity-75"
            onClick={closeSidebar}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            {/* Mobile sidebar content (same as desktop but always expanded) */}
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-center border-b border-gray-200 px-6">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <ChefHat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Miraya</h2>
                    <p className="text-xs text-gray-500">Management System</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      {item.children ? (
                        <div>
                          <button
                            onClick={() => toggleSubmenu(item.name)}
                            className={`
                              w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors
                              ${
                                isActiveParent(item.children)
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }
                            `}
                          >
                            <div className="flex items-center">
                              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                              <span>{item.name}</span>
                            </div>
                            <svg
                              className={`h-4 w-4 transform transition-transform ${
                                openMenus[item.name] ? "rotate-90" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>

                          {(openMenus[item.name] ||
                            isActiveParent(item.children)) && (
                            <ul className="mt-1 space-y-1 pl-8">
                              {item.children.map((child) => (
                                <li key={child.name}>
                                  <Link
                                    to={child.href}
                                    onClick={closeSidebar}
                                    className={`
                                      block px-3 py-2 text-sm rounded-md transition-colors
                                      ${
                                        isActivePath(child.href)
                                          ? "bg-blue-100 text-blue-700 font-medium"
                                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                      }
                                    `}
                                  >
                                    {child.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={item.href}
                          onClick={closeSidebar}
                          className={`
                            flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                            ${
                              isActivePath(item.href)
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }
                          `}
                        >
                          <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-gray-200 p-4">
                <Link
                  to="/orders/create"
                  onClick={closeSidebar}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
