const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true, // Hides top menu bar in kiosk
    cursor: false, // Hide cursor in kiosk mode
    backgroundColor: "#000000", // Prevent flash of white on load
    webPreferences: {
      nodeIntegration: false,     // recommended: false
      contextIsolation: true,     // recommended: true
      devTools: false,
    },
  });

  // Load your React app (served from localhost or build directory)
  win.loadURL("http://localhost:3000");

  // Restrict navigation
  win.webContents.on("will-navigate", (event, url) => {
    if (
      url !== "http://localhost:3000" &&
      !url.startsWith("http://localhost:3000")
    ) {
      event.preventDefault();
    }
  });

  // Block external windows/popups
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Prevent devtools from reopening
  win.webContents.on("devtools-opened", () => {
    win.webContents.closeDevTools();
  });
}

// On Pi, sometimes the display server isn’t ready instantly
app.whenReady().then(() => {
  // Small delay helps avoid launch failures during boot
  setTimeout(createWindow, 1000);
});

// Proper exit handling
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
