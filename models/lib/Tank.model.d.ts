import { System } from "./System.model";
export declare class Tank {
    id: string;
    name?: string;
    type?: string;
    service_status: System.State;
    settings: TankSettings;
    constructor({ id, name, type, service_status, settings }: Partial<Tank>);
    updateSettings?: CallableFunction;
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
    schedule_enabled?: boolean;
    schedule_days?: string;
    schedule_time?: string;
}
