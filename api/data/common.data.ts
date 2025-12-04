import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { MaintenanceManager } from "../logic/Maintenance.logic";
import { Server as WSServer } from "ws";
import { Server } from "http";
import { TankManager } from "../logic/Tank.logic";
import {
  drainEndpoint,
  fillEndpoint,
  waterChangeEndpoint,
} from "../controllers/Maintenance.controller";
import { execSync } from "child_process";
import { System } from "aquario-models/lib/System.model";

const CHIP = "gpiochip0";

// GPIO line numbers (BCM)
export const RELAY_1_LINE = 26;
export const RELAY_2_LINE = 20;
export const RELAY_3_LINE = 21;
export const FLOAT_SWITCH_LINE = 16;

// Relay helpers (active-low)
export function relayOn(line: number) {
  execSync(`gpioset --mode=exit ${CHIP} ${line}=0`);
}
export function relayOff(line: number) {
  execSync(`gpioset --mode=exit ${CHIP} ${line}=1`);
}

// Float switch reading
export function readGpio(line: number): number {
  try {
    const result = execSync(`gpioget ${CHIP} ${line}`).toString().trim();
    return parseInt(result, 10);
  } catch (error) {
    console.error(`Failed to read GPIO ${line}:`, error);
    return -1;
  }
}

// Set pin direction/output manually via raspi-gpio
function initGpioLine(
  line: number,
  mode: "op" | "ip" | "ip_pu"
) {
  let arg = "";
  if (mode === "op")       arg = "op";
  else if (mode === "ip")  arg = "ip";
  else if (mode === "ip_pu") arg = "ip pu";
  execSync(`raspi-gpio set ${line} ${arg}`);
}

// Watch float switch via polling
function pollFloatSwitch() {
  let lastValue = readGpio(FLOAT_SWITCH_LINE);
  setInterval(() => {
    const value = readGpio(FLOAT_SWITCH_LINE);
    if (value !== lastValue) {
      lastValue = value;
      MaintenanceManager.waterFull = (value === 1);

      // broadcast to any connected client
      DataManager.send({
        action: System.ParameterUpdate.WATER_LEVEL,
        data: {
          // when you implement multi-tank wiring, include tank_id here
          waterFull: MaintenanceManager.waterFull,
        },
      });
    }
  }, 1000);
}

// Initialize GPIO
export async function initGpio() {
  try {
    initGpioLine(RELAY_1_LINE, "op");
    initGpioLine(RELAY_2_LINE, "op");
    initGpioLine(RELAY_3_LINE, "op");

    // input pull‑up on the float switch
    initGpioLine(FLOAT_SWITCH_LINE, "ip_pu");
  } catch (e) {
    console.error("GPIO init failed:", e);
  }

  // now _ensure_ the relays get turned off
  relayOff(RELAY_1_LINE);
  relayOff(RELAY_2_LINE);
  relayOff(RELAY_3_LINE);

  pollFloatSwitch();
}


// Initialize database
async function dbConnection(): Promise<Database | null> {
  let conn: Database | null = null;
  try {
    conn = await open({
      filename: "aquario.db",
      driver: sqlite3.Database,
    });
    conn.configure("busyTimeout", 5000);
  } catch (e) {
    console.error(e);
  }
  return conn;
}

export class DataManager {
  static dbConnection = dbConnection;
  static wss: WSServer;
  static wsClient: any;

  static initSocket = async (server: Server) => {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WSServer({ server });
        this.wss.on("connection", (wsClient: any) => {
          this.wsClient = wsClient;
          console.log("A new client connected!");
          this.send({ message: "Hello Client!" });

          this.wsClient.on(
            "message",
            async (message: MessageEvent<any> & string) => {
              console.log(`Received message => ${message}`);
              try {
                const msgData = JSON.parse(message) as System.Request;
                const { action, data } = msgData;

                switch (action) {
                  case System.ParameterCheck.TEMPERATURE: {
                    const tempData = await TankManager.getTemperatures(
                      data.tank_id
                    );
                    this.wsClient.send(
                      JSON.stringify({
                        data: tempData,
                        action: System.ParameterUpdate.TEMPERATURE,
                      })
                    );
                    break;
                  }
                  case System.ServiceRequest.START_FILL_TANK:
                    fillEndpoint(data.tank_id);
                    break;
                  case System.ServiceRequest.CANCEL_FILL_TANK:
                  case System.ServiceRequest.CANCEL_DRAIN_TANK:
                  case System.ServiceRequest.CANCEL_WATER_CHANGE: {
                    const stopData = await MaintenanceManager.stop(
                      data.tank_id
                    );
                    this.wsClient.send(
                      JSON.stringify({
                        data: { tank_id: data.tank_id },
                        action: System.ServiceUpdate.STATE_RESET,
                      })
                    );
                    break;
                  }
                  case System.ServiceRequest.START_DRAIN_TANK:
                    drainEndpoint(data.tank_id);
                    break;
                  case System.ServiceRequest.START_WATER_CHANGE:
                    waterChangeEndpoint(data.tank_id);
                    break;
                  case System.ParameterCheck.WATER_LEVEL: {
                    // send back current MaintenanceManager.waterFull
                    this.wsClient.send(
                      JSON.stringify({
                        action: System.ParameterUpdate.WATER_LEVEL,
                        data: {
                          tank_id: data.tank_id,
                          waterFull: MaintenanceManager.waterFull,
                        },
                      })
                    );
                    break;
                  }
                  default:
                    console.log("Unknown message received");
                }
              } catch (error) {
                console.error("Error parsing message", error);
              }
            }
          );

          this.wsClient.on("close", () => {
            console.log("A client has disconnected");
          });

          resolve({ wsClient: this.wsClient });
        });
      } catch (error) {
        console.error("Error starting socket server", error);
        reject(error);
      }
    });
  };

  static send = async (data: System.Update | { message: string }) => {
    if (this.wsClient) {
      this.wsClient.send(JSON.stringify(data));
    }
  };
}

export { dbConnection };
