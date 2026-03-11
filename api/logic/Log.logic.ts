import { LogDataManager } from "../data/Log.data";
import { MaintenanceDataManager } from "../data/Maintenance.data";
import { Log } from "aquario-models";

export class LogManager {
  static feeding = async (logConfig: Log): Promise<void> => {
    const log = new Log({
      action_type: "Feeding",
      animal_id: logConfig.animal_id,
      container_id: logConfig.container_id,
      log_json: logConfig.log_json,
    });
    await LogDataManager.addLog(log);
  };

  static waterChange = async (logConfig: Partial<Log>): Promise<void> => {
    const log = new Log({
      action_type: "Water Change",
      animal_id: logConfig.animal_id,
      container_id: logConfig.container_id,
      log_json: logConfig.log_json,
    });
    await LogDataManager.addLog(log);
  };

  static deleteLog = async (logId: string): Promise<void> => {
  await LogDataManager.deleteLog(logId);
};

}
