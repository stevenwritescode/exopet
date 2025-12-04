import { SensorDataManager } from "../data/Sensor.data";
import { TankDataManager } from "../data/Tank.data";

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
    return {
      temperatures: temps,
      average: temps.reduce((a, b) => a + b, 0) / temps.length,
    };
  };

  static getTankSettings = async (tankId: string): Promise<any> => {
    return await TankDataManager.getTankSettings(tankId);
  }

  static updateTankSettings = async (tankId: string, settings: any): Promise<any> => {
    return await TankDataManager.updateTankSettings(tankId, settings);
  }
}
