const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // Get backend server port
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),

  // Get app version
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Platform info
  platform: process.platform,

  // App info
  isElectron: true,
});

// Set global API URL for the React app
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const port = await ipcRenderer.invoke("get-backend-port");

    // Set API URL globally
    window.REACT_APP_API_URL = `http://localhost:${port}/api`;

    console.log(`✅ Backend API available at: http://localhost:${port}/api`);
  } catch (error) {
    console.error("❌ Failed to get backend port:", error);
    // Fallback to default port
    window.REACT_APP_API_URL = "http://localhost:8080/api";
  }
});
