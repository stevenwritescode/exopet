const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false, // Disable developer tools
    },
  });

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

  // Prevent new windows or tabs
  win.webContents.on("new-window", (event, url) => {
    event.preventDefault();
  });

  // Optionally, disable developer tools opening
  win.webContents.on("devtools-opened", () => {
    win.webContents.closeDevTools();
  });
}

app.on("ready", createWindow);
