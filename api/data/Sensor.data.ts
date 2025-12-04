import { dbConnection } from "./common.data";
import { promises as fs } from "fs";

export class SensorDataManager {
  static readTemperature = async (sensorId: string): Promise<number | null> => {
    const path = `/sys/bus/w1/devices/${sensorId}/w1_slave`;

    try {
      const data = await fs.readFile(path, "utf-8");
      const regex = /t=(\d+)/;
      const matches = data.match(regex);
      if (matches) {
        const tempCelsius = parseInt(matches[1], 10) / 1000.0;
        return tempCelsius;
      }
    } catch (error) {
      console.error("Error reading temperature:", error);
      return null;
    }

    return null;
  };

  static getSensorsForTank = async (
    tankId: string,
    type?: string
  ): Promise<string[]> => {
    try {
      const conn = await dbConnection();
      if (!conn) return [];
      const sensors = await conn.all(
        "SELECT * FROM sensors WHERE container_id = ?",
        tankId
      );
      await conn.close();

      if (!sensors) {
        return [];
      } else if (type) {
        return sensors
          .filter((sensor) => sensor.sensor_type === type)
          .map((sensor) => sensor.id);
      } else {
        return sensors.map((sensor) => sensor.id);
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };
}
