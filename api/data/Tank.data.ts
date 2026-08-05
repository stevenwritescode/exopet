import { dbConnection } from "./common.data";
import { Tank, TankSettings } from "aquario-models";
import { v4 as uuid } from "uuid";

export class TankDataManager {
  static addTank = async (tank: Tank): Promise<void> => {
    const { id, type, name, role, parent_tank_id } = tank;
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run(
      "INSERT INTO tanks (id, name, type, role, parent_tank_id) VALUES (?, ?, ?, ?, ?)",
      id,
      name,
      type,
      role || "display",
      parent_tank_id ?? null
    );
    await conn.close();
  };

  static updateTank = async (
    tankId: string,
    fields: Partial<Pick<Tank, "name" | "type" | "role" | "parent_tank_id">>
  ): Promise<void> => {
    const allowedColumns = new Set(["name", "type", "role", "parent_tank_id"]);
    const conn = await dbConnection();
    if (!conn) return;
    const entries = Object.entries(fields).filter(([k]) => allowedColumns.has(k));
    if (entries.length === 0) {
      await conn.close();
      return;
    }
    const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([, v]) => v ?? null);
    await conn.run(`UPDATE tanks SET ${setClause} WHERE id = ?`, ...values, tankId);
    await conn.close();
  };

  static getSumpForTank = async (displayId: string): Promise<Tank | null> => {
    const conn = await dbConnection();
    if (!conn) return null;
    const sump = await conn.get(
      "SELECT * FROM tanks WHERE parent_tank_id = ? AND role = 'sump'",
      displayId
    );
    await conn.close();
    return sump ?? null;
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
          if (tankSettings.sump_autostart !== undefined) tankSettings.sump_autostart = !!tankSettings.sump_autostart;
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
        if (tankSettings.sump_autostart !== undefined) {
          tankSettings.sump_autostart = !!tankSettings.sump_autostart;
        }
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
