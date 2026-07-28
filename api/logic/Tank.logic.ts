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

  static getAllTemperatureStatuses = async (): Promise<
    TankTemperatureStatus[]
  > => {
    const tanks = (await TankDataManager.getAllTanks()) || [];
    const statuses: TankTemperatureStatus[] = [];
    for (const tank of tanks) {
      const sensors = await SensorDataManager.getSensorsForTank(
        tank.id,
        "Thermometer"
      );
      if (sensors.length === 0) {
        continue;
      }
      const temps: number[] = [];
      for (const sensor of sensors) {
        const temperature = await SensorDataManager.readTemperature(sensor);
        if (!temperature) {
          continue;
        }
        temps.push(temperature);
      }
      const settings = await TankDataManager.getTankSettings(tank.id);
      statuses.push({
        tank_id: tank.id,
        name: tank.name,
        average:
          temps.length > 0
            ? temps.reduce((a, b) => a + b, 0) / temps.length
            : null,
        lower_temp_limit: settings?.lower_temp_limit,
        upper_temp_limit: settings?.upper_temp_limit,
      });
    }
    return statuses;
  };

  static getTankSettings = async (tankId: string): Promise<any> => {
    const settings = await TankDataManager.getTankSettings(tankId);
    if (settings) {
      // SQLite stores booleans as 0/1 integers; normalize for JSON clients
      if (settings.has_reservoir !== undefined) settings.has_reservoir = !!settings.has_reservoir;
      if (settings.schedule_enabled !== undefined) settings.schedule_enabled = !!settings.schedule_enabled;
    }
    return settings;
  }

  static updateTankSettings = async (tankId: string, settings: any): Promise<any> => {
    return await TankDataManager.updateTankSettings(tankId, settings);
  }
}

export interface TankTemperatureStatus {
  tank_id: string;
  name?: string;
  average: number | null;
  lower_temp_limit?: number;
  upper_temp_limit?: number;
}
