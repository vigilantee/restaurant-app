import React, { useState } from "react";
import { X, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import MenuDisplay from "../Menu/MenuDisplay";
import toast from "react-hot-toast";

const MenuModal = ({
  selectedTable,
  newOrder,
  setNewOrder,
  onClose,
  onPlaceOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const addItemToOrder = (menuItem) => {
    const existingItem = newOrder.items.find((item) => item.id === menuItem.id);

    if (existingItem) {
      setNewOrder((prev) => {
        const updatedItems = prev.items.map((item) =>
          item.id === menuItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item
        );

        const subtotal = updatedItems.reduce(
          (sum, item) => sum + item.total,
          0
        );
        const tax = subtotal * 0.18;

        return {
          ...prev,
          items: updatedItems,
          subtotal,
          tax,
          total: subtotal + tax,
        };
      });
    } else {
      setNewOrder((prev) => {
        const newItem = {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          total: menuItem.price,
        };

        const updatedItems = [...prev.items, newItem];
        const subtotal = updatedItems.reduce(
          (sum, item) => sum + item.total,
          0
        );
        const tax = subtotal * 0.18;

        return {
          ...prev,
          items: updatedItems,
          subtotal,
          tax,
          total: subtotal + tax,
        };
      });
    }
    toast.success(`${menuItem.name} added to order`);
  };

  const removeItemFromNewOrder = (itemId) => {
    setNewOrder((prev) => {
      const updatedItems = prev.items.filter((item) => item.id !== itemId);
      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total: subtotal + tax,
      };
    });
  };

  const updateNewOrderItemQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItemFromNewOrder(itemId);
      return;
    }

    setNewOrder((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      );

      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total: subtotal + tax,
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {newOrder.table_id
                ? `New Order - Table ${selectedTable?.table_number}`
                : "Browse Menu"}
            </h3>
            <p className="text-sm text-gray-500">
              Select items to add to your order
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-200px)]">
          {/* Menu Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <MenuDisplay
              onAddItem={addItemToOrder}
              isModal={true}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-80 border-l bg-gray-50 p-6 overflow-y-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h4>

            {/* Customer Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={newOrder.customer_name}
                onChange={(e) =>
                  setNewOrder((prev) => ({
                    ...prev,
                    customer_name: e.target.value,
                  }))
                }
                placeholder="Enter customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-6">
              {newOrder.items.length === 0 ? (
                <p className="text-gray-500 text-sm">No items added yet</p>
              ) : (
                newOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex-1">
                      <h6 className="font-medium text-sm text-gray-900">
                        {item.name}
                      </h6>
                      <p className="text-xs text-gray-500">
                        ₹{item.price} each
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() =>
                            updateNewOrderItemQuantity(
                              item.id,
                              item.quantity - 1
                            )
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateNewOrderItemQuantity(
                              item.id,
                              item.quantity + 1
                            )
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-medium">₹{item.total}</span>
                      <button
                        onClick={() => removeItemFromNewOrder(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Order Total */}
            {newOrder.items.length > 0 && (
              <div className="p-4 bg-white rounded-lg border mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{newOrder.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (18%):</span>
                    <span>₹{newOrder.tax?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{newOrder.total?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={onPlaceOrder}
                disabled={
                  newOrder.items.length === 0 || !newOrder.customer_name.trim()
                }
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Place Order
              </button>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuModal;
