"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnection = exports.DataManager = exports.runMigrations = exports.initGpio = exports.readGpio = exports.relayOff = exports.relayOn = exports.FLOAT_SWITCH_LINE = exports.RELAY_3_LINE = exports.RELAY_2_LINE = exports.RELAY_1_LINE = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const Maintenance_logic_1 = require("../logic/Maintenance.logic");
const ws_1 = __importStar(require("ws"));
const Tank_logic_1 = require("../logic/Tank.logic");
const Maintenance_controller_1 = require("../controllers/Maintenance.controller");
const child_process_1 = require("child_process");
const System_model_1 = require("aquario-models/lib/System.model");
const CHIP = "gpiochip0";
// GPIO line numbers (BCM)
exports.RELAY_1_LINE = 26;
exports.RELAY_2_LINE = 20;
exports.RELAY_3_LINE = 21;
exports.FLOAT_SWITCH_LINE = 16;
// Relay helpers (active-low)
function relayOn(line) {
    (0, child_process_1.execSync)(`gpioset --mode=exit ${CHIP} ${line}=0`);
}
exports.relayOn = relayOn;
function relayOff(line) {
    (0, child_process_1.execSync)(`gpioset --mode=exit ${CHIP} ${line}=1`);
}
exports.relayOff = relayOff;
// Float switch reading
function readGpio(line) {
    try {
        const result = (0, child_process_1.execSync)(`gpioget ${CHIP} ${line}`).toString().trim();
        return parseInt(result, 10);
    }
    catch (error) {
        console.error(`Failed to read GPIO ${line}:`, error);
        return -1;
    }
}
exports.readGpio = readGpio;
// Set pin direction/output manually via raspi-gpio
function initGpioLine(line, mode) {
    let arg = "";
    if (mode === "op")
        arg = "op";
    else if (mode === "ip")
        arg = "ip";
    else if (mode === "ip_pu")
        arg = "ip pu";
    (0, child_process_1.execSync)(`raspi-gpio set ${line} ${arg}`);
}
// Watch float switch via polling
function pollFloatSwitch() {
    let lastValue = readGpio(exports.FLOAT_SWITCH_LINE);
    setInterval(() => {
        const value = readGpio(exports.FLOAT_SWITCH_LINE);
        if (value !== lastValue) {
            lastValue = value;
            Maintenance_logic_1.MaintenanceManager.waterFull = (value === 1);
            // broadcast to any connected client
            DataManager.send({
                action: System_model_1.System.ParameterUpdate.WATER_LEVEL,
                data: {
                    // when you implement multi-tank wiring, include tank_id here
                    waterFull: Maintenance_logic_1.MaintenanceManager.waterFull,
                },
            });
        }
    }, 1000);
}
// Initialize GPIO
function initGpio() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            initGpioLine(exports.RELAY_1_LINE, "op");
            initGpioLine(exports.RELAY_2_LINE, "op");
            initGpioLine(exports.RELAY_3_LINE, "op");
            // input pull‑up on the float switch
            initGpioLine(exports.FLOAT_SWITCH_LINE, "ip_pu");
        }
        catch (e) {
            console.error("GPIO init failed:", e);
        }
        // now _ensure_ the relays get turned off (best-effort; skip on non-Pi)
        try {
            relayOff(exports.RELAY_1_LINE);
            relayOff(exports.RELAY_2_LINE);
            relayOff(exports.RELAY_3_LINE);
        }
        catch (e) {
            console.error("GPIO relay init failed (non-Pi host, skipping):", e);
        }
        pollFloatSwitch();
    });
}
exports.initGpio = initGpio;
// Initialize database
function dbConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        let conn = null;
        try {
            conn = yield (0, sqlite_1.open)({
                filename: "aquario.db",
                driver: sqlite3_1.default.Database,
            });
            conn.configure("busyTimeout", 5000);
        }
        catch (e) {
            console.error(e);
        }
        return conn;
    });
}
exports.dbConnection = dbConnection;
function runMigrations() {
    return __awaiter(this, void 0, void 0, function* () {
        var _b, _c;
        const conn = yield dbConnection();
        if (!conn)
            return;
        const columns = [
            { name: "schedule_enabled", type: "INTEGER DEFAULT 0" },
            { name: "schedule_days", type: "TEXT DEFAULT ''" },
            { name: "schedule_time", type: "TEXT DEFAULT ''" },
        ];
        for (const col of columns) {
            try {
                yield conn.run(`ALTER TABLE tank_settings ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Migration: added column ${col.name}`);
            }
            catch (e) {
                if ((_b = e.message) === null || _b === void 0 ? void 0 : _b.includes("duplicate column")) {
                    // column already exists, skip
                }
                else {
                    console.error(`Migration error for ${col.name}:`, e);
                }
            }
        }
        const tankColumns = [
            { name: "role", type: "TEXT DEFAULT 'display'" },
            { name: "parent_tank_id", type: "TEXT" },
        ];
        for (const col of tankColumns) {
            try {
                yield conn.run(`ALTER TABLE tanks ADD COLUMN ${col.name} ${col.type}`);
                console.log(`Migration: added tanks column ${col.name}`);
            }
            catch (e) {
                if (!((_c = e.message) === null || _c === void 0 ? void 0 : _c.includes("duplicate column"))) {
                    console.error(`Migration error for tanks.${col.name}:`, e);
                }
            }
        }
        yield conn.close();
    });
}
exports.runMigrations = runMigrations;
class DataManager {
}
exports.DataManager = DataManager;
_a = DataManager;
DataManager.dbConnection = dbConnection;
DataManager.initSocket = (server) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        try {
            _a.wss = new ws_1.Server({ server });
            _a.wss.on("connection", (wsClient) => {
                console.log("A new client connected!");
                wsClient.send(JSON.stringify({ message: "Hello Client!" }));
                wsClient.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
                    console.log(`Received message => ${message}`);
                    try {
                        const msgData = JSON.parse(message);
                        if (msgData.action === "ping")
                            return;
                        const { action, data } = msgData;
                        switch (action) {
                            case System_model_1.System.ParameterCheck.TEMPERATURE: {
                                const tempData = yield Tank_logic_1.TankManager.getTemperatures(data.tank_id);
                                wsClient.send(JSON.stringify({
                                    data: tempData,
                                    action: System_model_1.System.ParameterUpdate.TEMPERATURE,
                                }));
                                break;
                            }
                            case System_model_1.System.ServiceRequest.START_FILL_TANK:
                                (0, Maintenance_controller_1.fillEndpoint)(data.tank_id);
                                break;
                            case System_model_1.System.ServiceRequest.CANCEL_FILL_TANK:
                            case System_model_1.System.ServiceRequest.CANCEL_DRAIN_TANK:
                            case System_model_1.System.ServiceRequest.CANCEL_WATER_CHANGE: {
                                yield Maintenance_logic_1.MaintenanceManager.stop(data.tank_id);
                                _a.send({
                                    data: { tank_id: data.tank_id },
                                    action: System_model_1.System.ServiceUpdate.STATE_RESET,
                                });
                                break;
                            }
                            case System_model_1.System.ServiceRequest.START_DRAIN_TANK:
                                (0, Maintenance_controller_1.drainEndpoint)(data.tank_id);
                                break;
                            case System_model_1.System.ServiceRequest.START_WATER_CHANGE:
                                (0, Maintenance_controller_1.waterChangeEndpoint)(data.tank_id);
                                break;
                            case System_model_1.System.ParameterCheck.WATER_LEVEL: {
                                wsClient.send(JSON.stringify({
                                    action: System_model_1.System.ParameterUpdate.WATER_LEVEL,
                                    data: {
                                        tank_id: data.tank_id,
                                        waterFull: Maintenance_logic_1.MaintenanceManager.waterFull,
                                    },
                                }));
                                break;
                            }
                            default:
                                console.log("Unknown message received:", action);
                        }
                    }
                    catch (error) {
                        console.error("Error parsing message", error);
                    }
                }));
                wsClient.on("close", () => {
                    console.log("A client has disconnected");
                });
                resolve(true);
            });
        }
        catch (error) {
            console.error("Error starting socket server", error);
            reject(error);
        }
    });
});
DataManager.send = (data) => {
    const payload = JSON.stringify(data);
    _a.wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(payload);
        }
    });
};
