import { dbConnection } from "./common.data";

export class MaintenanceDataManager {
  static setServiceStatus = async (
    tankId: string,
    serviceStatus: number
  ): Promise<void> => {
    const conn = await dbConnection();
    if (!conn) return;
    if (tankId === "all") {
      await conn.run("UPDATE tank_settings SET service_status = ?", serviceStatus);
      await conn.close();
      return;
    } else {
      await conn.run(
        "UPDATE tank_settings SET service_status = ? WHERE tank_id = ?",
        serviceStatus,
        tankId
      );
      await conn.close();
    }
  };
}
