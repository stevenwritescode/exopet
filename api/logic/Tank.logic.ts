import { SensorDataManager } from "../data/Sensor.data";
import { TankDataManager } from "../data/Tank.data";
import { NotifyManager } from "./Notify.logic";

export class TankManager {
  static getTemperatures = async (
    tankId: string
  ): Promise<{ temperatures: number[]; average: number }> => {
    const sensors = await SensorDataManager.getSensorsForTank(
      tankId,
      "Thermometer"
    );
    console.log(sensors);
    const temps: number[] = [];
    for (const sensor of sensors) {
      const temperature = await SensorDataManager.readTemperature(sensor);
      if (!temperature) {
        continue;
      }
      temps.push(temperature);
    }
    const average = temps.reduce((a, b) => a + b, 0) / temps.length;

    if (temps.length > 0) {
      const settings = await TankDataManager.getTankSettings(tankId);
      if (settings) {
        NotifyManager.checkTemperature(
          tankId,
          average,
          settings.lower_temp_limit,
          settings.upper_temp_limit
        );
      }
    }

    return { temperatures: temps, average };
  };

  static getTankSettings = async (tankId: string): Promise<any> => {
    return await TankDataManager.getTankSettings(tankId);
  }

  static updateTankSettings = async (tankId: string, settings: any): Promise<any> => {
    return await TankDataManager.updateTankSettings(tankId, settings);
  }
}
