import { dbConnection } from "./common.data";
import { Tank, TankSettings } from "aquario-models";
import { v4 as uuid } from "uuid";

export class TankDataManager {
  static addTank = async (tank: Tank): Promise<void> => {
    const { type, name } = tank;
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run(
      "INSERT INTO tanks (id, name, type) VALUES (?, ?, ?)",
      uuid(),
      name,
      type
    );
    await conn.close();
  };

  static removeTank = async (tankId: number): Promise<void> => {
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run("DELETE FROM tanks WHERE id = ?", tankId);
    await conn.close();
  };

  static getReservoir = async (tankId: string): Promise<{}> => {
    return tankId;
  };

  static getAllTanks = async (): Promise<Tank[]> => {
    try {
      const conn = await dbConnection();
      if (!conn) return [];
      const tanks = await conn.all("SELECT * FROM tanks");
      await conn.close();

      if (!tanks) {
        return [];
      } else {
        return tanks;
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };
  static getTankData = async (tankId: string): Promise<Tank | null> => {
    try {
      const conn = await dbConnection();
      if (!conn) return null;
      const tankData = await conn.get(
        "SELECT * FROM tanks WHERE id = ?",
        tankId
      );
      const tankSettings = await conn.get(
        "SELECT * FROM tank_settings WHERE tank_id = ?",
        tankId
      );
      await conn.close();

      if (!tankData) {
        return null;
      } else {
        if (tankSettings) {
          if (tankSettings.has_reservoir !== undefined) tankSettings.has_reservoir = !!tankSettings.has_reservoir;
          if (tankSettings.schedule_enabled !== undefined) tankSettings.schedule_enabled = !!tankSettings.schedule_enabled;
        }
        return new Tank({ ...tankData, settings: tankSettings });
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  static getTankSettings = async (tankId: string): Promise<TankSettings | null> => {
    try {
      const conn = await dbConnection();
      if (!conn) return null;
      const tankSettings = await conn.get(
        "SELECT * FROM tank_settings WHERE tank_id = ?",
        tankId
      );
      await conn.close();

      if (!tankSettings) {
        return null;
      } else {
        return tankSettings;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  static updateTankSettings = async (
    tankId: string,
    settings: TankSettings & { id: string }
  ): Promise<void> => {
    const conn = await dbConnection();
    if (!conn) return;
    const { id, tank_id, ...fieldsToUpdate } = settings;

    const setClause = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const sql = `UPDATE tank_settings SET ${setClause} WHERE tank_id = ?`;

    const values = [...Object.values(fieldsToUpdate), tankId];

    await conn.run(sql, ...values);
    await conn.close();
  };
}
