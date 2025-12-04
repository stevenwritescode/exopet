import { System } from "aquario-models/lib/System.model";
import { DataManager, relayOn, relayOff, RELAY_2_LINE, RELAY_1_LINE, RELAY_3_LINE } from "../data/common.data";
import { MaintenanceDataManager } from "../data/Maintenance.data";

export class MaintenanceManager {
  static serviceDelays: { [id: string]: NodeJS.Timeout } = {};
  static waterFull: boolean = false;
  static serviceStatus: System.State = System.State.IDLE;
  static fillCheckInterval?: NodeJS.Timeout;

  static setServiceDelay = (
    id: string,
    callback: CallableFunction,
    time: number
  ): void => {
    console.log("Setting service delay");
    const serviceDelay = setTimeout(() => {
      callback();
      delete this.serviceDelays[id];
    }, time);

    this.serviceDelays[id] = serviceDelay;
  };

  static clearServiceDelay = (id: string): void => {
    console.log("Clearing service delay");
    clearTimeout(this.serviceDelays[id]);
  };

  static clearAllServiceDelays = (): void => {
    console.log("Clearing all service delays");
    Object.keys(this.serviceDelays).forEach((key) =>
      clearTimeout(this.serviceDelays[key])
    );
    this.serviceDelays = {};
  };

  static waterChange = async (
    tank_id: string,
    drainTime: number = 0,
    fillTime: number = 0,
    resFillTime: number = 0
  ): Promise<void> => {
    this.reset(tank_id);
    DataManager.send({
      data: { tank_id },
      action: System.ServiceUpdate.WATER_CHANGE_BEGAN,
    });

    await this.drain(tank_id, drainTime, true);

    this.setServiceDelay(
      "fill",
      async () => {
        await this.fill(tank_id, fillTime, true);
      },
      drainTime * 1000
    );

    const completeAction = () => {
      DataManager.send({
        data: { tank_id },
        action: System.ServiceUpdate.WATER_CHANGE_COMPLETE,
      });
    };

    if (resFillTime && resFillTime > 0) {
      this.setServiceDelay("fill_res", completeAction, (drainTime + fillTime + resFillTime) * 1000);
    } else {
      this.setServiceDelay("fill", completeAction, (drainTime + fillTime) * 1000);
    }
  };

  static stop = async (tank_id: string): Promise<void> => {
    if (this.fillCheckInterval) {
      clearInterval(this.fillCheckInterval);
    }
    this.reset(tank_id);
    this.clearAllServiceDelays();
  };

  static reset = async (tank_id: string): Promise<void> => {
    this.serviceStatus = System.State.IDLE;
    relayOff(RELAY_1_LINE);
    relayOff(RELAY_2_LINE);
    relayOff(RELAY_3_LINE);
    await MaintenanceDataManager.setServiceStatus(tank_id, this.serviceStatus);
  };

  static drain = async (
    tank_id: string,
    drainTime: number = 0,
    changing: boolean = false
  ): Promise<number> => {
    relayOn(RELAY_1_LINE); // Begin draining
    DataManager.send({
      data: { tank_id, duration: drainTime, durationMs: drainTime * 1000 },
      action: System.ServiceUpdate.DRAIN_BEGAN,
    });

    this.serviceStatus = changing
      ? System.State.WATER_CHANGE_DRAINING
      : System.State.DRAINING;
    await MaintenanceDataManager.setServiceStatus(tank_id, this.serviceStatus);

    this.setServiceDelay(
      "drain",
      () => {
        relayOff(RELAY_1_LINE);
        DataManager.send({
          action: System.ServiceUpdate.DRAIN_COMPLETE,
          data: { tank_id, changing },
        });
        console.log("Drain complete");
        this.clearServiceDelay("drain");
      },
      drainTime * 1000
    );

    return drainTime;
  };

  static fill = async (
    tank_id: string,
    fillTime: number = 0,
    changing: boolean = false
  ): Promise<number> => {
    relayOn(RELAY_2_LINE); // Begin fill
    DataManager.send({
      data: { tank_id, duration: fillTime, durationMs: fillTime * 1000 },
      action: System.ServiceUpdate.FILL_BEGAN,
    });

    this.serviceStatus = changing
      ? System.State.WATER_CHANGE_FILLING_TANK
      : System.State.FILLING_TANK;
    await MaintenanceDataManager.setServiceStatus(tank_id, this.serviceStatus);

    this.clearServiceDelay("fill");

    const fillCallback = () => {
      relayOff(RELAY_2_LINE);
      this.clearServiceDelay("fill");
      DataManager.send({
        action: System.ServiceUpdate.FILL_COMPLETE,
        data: { tank_id, changing },
      });
      if (this.fillCheckInterval) {
        clearInterval(this.fillCheckInterval);
      }
    };

    this.setServiceDelay(
      "fill",
      fillCallback,
      fillTime * 1000
    );

    this.fillCheckInterval = setInterval(() => {
      if (this.waterFull) {
        console.log("Float switch activated, stopping fill early...");
        clearTimeout(this.serviceDelays["fill"]);
        fillCallback();
      }
    }, 1000); // check every 1 second to match poll

    return fillTime;
  };

  static resFill = async (
    res_id: string,
    resFillTime: number,
    changing: boolean = false
  ): Promise<void> => {
    relayOn(RELAY_3_LINE); // Begin reservoir fill
    DataManager.send({
      data: { res_id, duration: resFillTime, durationMs: resFillTime * 1000 },
      action: System.ServiceUpdate.FILL_RESERVOIR_BEGAN,
    });

    this.serviceStatus = changing
      ? System.State.WATER_CHANGE_FILLING_TANK
      : System.State.FILLING_TANK;
    await MaintenanceDataManager.setServiceStatus(res_id, this.serviceStatus);

    this.clearServiceDelay("fill_res");

    this.setServiceDelay(
      "fill_res",
      () => {
        relayOff(RELAY_3_LINE);
        this.clearServiceDelay("fill_res");
        DataManager.send({
          action: System.ServiceUpdate.FILL_RESERVOIR_COMPLETE,
          data: { res_id, changing },
        });
        console.log("Reservoir fill complete");
        this.stop(res_id);
      },
      resFillTime * 1000
    );
  };
}