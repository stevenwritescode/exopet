import { v4 as uuid } from "uuid";
import { System } from "./System.model";

export class Tank {
  id: string = uuid();
  name?: string;
  type?: string;
  service_status: System.State = System.State.IDLE;
  settings: TankSettings = {
    volume: 0,
    vol_unit: "gallons",
    drain_time: 0,
    fill_time: 0,
    res_fill_time: 0,
    has_reservoir: false,
    lower_temp_limit: 0,
    upper_temp_limit: 0,
  };

  constructor({ id, name, type, service_status, settings }: Partial<Tank>) {
    this.id = id || this.id;
    this.name = name || this.name;
    this.type = type || this.type;
    this.service_status = service_status || this.service_status;
    this.settings = settings || this.settings;
  }

  updateSettings?: CallableFunction = (settings: TankSettings) => {
    this.settings = settings;
  }
}

export interface TankSettings {
  volume?: number;
  vol_unit?: string;
  drain_time?: number;
  fill_time?: number;
  res_fill_time?: number;
  has_reservoir?: boolean;
  lower_temp_limit?: number;
  upper_temp_limit?: number;
  tank_id?: string;
}
