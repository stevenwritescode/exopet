import { promises as fs } from "fs";

export class ClimateManager {
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
}
