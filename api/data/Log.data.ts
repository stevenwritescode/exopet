import { Log } from "aquario-models";
import { dbConnection } from "./common.data";
import { v4 as uuid } from "uuid";

export class LogDataManager {
  static addLog = async (log: Log): Promise<void> => {
    const { action_type, animal_id, container_id, log_json } = log;
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run(
      "INSERT INTO logs (id, action_type, animal_id, container_id, log_json) VALUES (?, ?, ?, ?, ?)",
      uuid(),
      action_type,
      animal_id,
      container_id,
      log_json
    );
    await conn.close();
  };

  static deleteLog = async (logId: string): Promise<void> => {
  const conn = await dbConnection();
  if (!conn) return;
  await conn.run("DELETE FROM logs WHERE id = ?", logId);
  await conn.close();
};


  static getAllLogs = async (): Promise<Log[]> => {
    try {
      const conn = await dbConnection();
      if (!conn) return [];
      const logs = await conn.all("SELECT * FROM logs");
      await conn.close();

      if (!logs) {
        return [];
      } else {
        return logs;
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  static getLogsForTank = async (tankId: string): Promise<Log[]> => {
    try {
      const conn = await dbConnection();
      if (!conn) return [];
      const logs = await conn.all(
        "SELECT * FROM logs WHERE container_id = ?",
        tankId
      );
      await conn.close();

      if (!logs) {
        return [];
      } else {
        return logs;
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };
  static getLogsForAnimal = async (animalId: string): Promise<Log[]> => {
    try {
      const conn = await dbConnection();
      if (!conn) return [];
      const logs = await conn.all(
        "SELECT * FROM logs WHERE animal_id = ? ORDER BY timestamp DESC",
        animalId
      );
      await conn.close();

      if (!logs) {
        return [];
      } else {
        logs.forEach((log) => {
          log.log_json = JSON.parse(log.log_json);
        });
        return logs;
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };
}
