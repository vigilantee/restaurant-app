import React from "react";
import { X, Clock, Plus, Minus, Trash2, Printer } from "lucide-react";

const OrderModal = ({
  selectedTable,
  currentOrder,
  setCurrentOrder,
  onClose,
  onAddItems,
}) => {
  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setCurrentOrder((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
          : item
      );

      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total_amount: subtotal + tax,
      };
    });
  };

  const handleRemoveItem = (itemId) => {
    setCurrentOrder((prev) => {
      const updatedItems = prev.items.filter((item) => item.id !== itemId);
      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total_amount: subtotal + tax,
      };
    });
  };

  const handlePrintReceipt = () => {
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .order-info { margin: 20px 0; }
          .items table { width: 100%; border-collapse: collapse; }
          .items th, .items td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
          .total-section { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .grand-total { font-weight: bold; font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Restaurant Name</h1>
          <p>123 Restaurant Street, City</p>
          <p>Phone: (555) 123-4567</p>
        </div>
        
        <div class="order-info">
          <p><strong>Order #:</strong> ${currentOrder.order_number}</p>
          <p><strong>Table:</strong> ${selectedTable?.table_number}</p>
          <p><strong>Customer:</strong> ${currentOrder.customer_name}</p>
          <p><strong>Date:</strong> ${
            currentOrder.order_date
              ? new Date(currentOrder.order_date).toLocaleString()
              : new Date().toLocaleString()
          }</p>
          <p><strong>Status:</strong> ${currentOrder.order_status}</p>
        </div>
        
        <div class="items">
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${currentOrder.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price}</td>
                  <td>₹${item.total}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${currentOrder.subtotal?.toFixed(2) || "0.00"}</span>
          </div>
          <div class="total-row">
            <span>Tax (18%):</span>
            <span>₹${currentOrder.tax?.toFixed(2) || "0.00"}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>₹${currentOrder.total_amount?.toFixed(2) || "0.00"}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p>Thank you for dining with us!</p>
          <p>Visit us again soon!</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Current Order - Table {selectedTable?.table_number}
            </h3>
            <p className="text-sm text-gray-500">
              Order #{currentOrder.order_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Customer:
                </span>
                <p className="text-sm text-gray-900">
                  {currentOrder.customer_name}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Status:
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  {currentOrder.order_status}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Order Time:
                </span>
                <p className="text-sm text-gray-900">
                  {currentOrder.order_date
                    ? new Date(currentOrder.order_date).toLocaleTimeString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Table:
                </span>
                <p className="text-sm text-gray-900">
                  {selectedTable?.table_number} ({selectedTable?.capacity}{" "}
                  seats)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Order Items</h4>
            {currentOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{item.name}</h5>
                  <p className="text-sm text-gray-500">₹{item.price} each</p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity - 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity + 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="w-16 text-right font-medium">
                    ₹{item.total}
                  </span>

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{currentOrder.subtotal?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (18%):</span>
                <span>₹{currentOrder.tax?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total:</span>
                <span>₹{currentOrder.total_amount?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onAddItems}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Items
            </button>
          </div>

          <button
            onClick={handlePrintReceipt}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;
