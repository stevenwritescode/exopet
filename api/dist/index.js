"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const common_data_1 = require("./data/common.data");
const app = (0, express_1.default)();
const port = 3001;
// Serve a basic response on the root route
app.get("/", (req, res) => {
    res.send("Hello World!");
});
// Start the Express server
const server = app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
    (0, common_data_1.initGpio)();
});
// Create a WebSocket server
const wss = new ws_1.Server({ server });
wss.on("connection", (ws) => {
    console.log("A new client connected!");
    ws.send("Welcome New Client!");
    ws.on("message", (message) => {
        console.log(`Received message => ${message}`);
    });
    ws.on("close", () => {
        console.log("A client has disconnected");
    });
});
