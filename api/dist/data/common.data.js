"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnection = exports.initGpio = exports.RELAY_3 = exports.RELAY_2 = exports.RELAY_1 = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const onoff_1 = require("onoff");
// GPIO pins
exports.RELAY_1 = new onoff_1.Gpio(26, "out");
exports.RELAY_2 = new onoff_1.Gpio(20, "out");
exports.RELAY_3 = new onoff_1.Gpio(21, "out");
function initGpio() {
    return __awaiter(this, void 0, void 0, function* () {
        // Initial state for GPIO pins
        exports.RELAY_1.writeSync(1);
        exports.RELAY_2.writeSync(1);
        exports.RELAY_3.writeSync(1);
    });
}
exports.initGpio = initGpio;
// Initialize the database connection and configure it to return rows as dictionaries
function dbConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        let conn = null;
        try {
            conn = yield (0, sqlite_1.open)({
                filename: "aquario.db",
                driver: sqlite3_1.default.Database,
            });
            // Setting the mode to return rows as objects
            conn.configure("busyTimeout", 5000); // This line is an example of how you can configure the database connection. For row as objects, sqlite library handles it inherently.
        }
        catch (e) {
            console.error(e);
        }
        return conn;
    });
}
exports.dbConnection = dbConnection;
