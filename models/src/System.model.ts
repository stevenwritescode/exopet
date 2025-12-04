export namespace System {
  export interface Request {
    action: ServiceRequest | ParameterCheck;
    data?: any;
  }

  export interface Update {
    action?: ServiceUpdate | ParameterUpdate;
    data?: any;
  }

  export enum State {
    IDLE,
    DRAINING,
    FILLING_TANK,
    FILLING_RESERVOIR,
    WATER_CHANGE_DRAINING,
    WATER_CHANGE_FILLING_TANK,
    WATER_CHANGE_FILLING_RESERVOIR,
  }

  export enum ParameterUpdate {
    TEMPERATURE = "temperature",
    PH = "ph",
    OXYGEN = "oxygen",
    WATER_LEVEL = "water_level",
  }

  export enum ParameterCheck {
    TEMPERATURE = "temperature",
    PH = "ph",
    OXYGEN = "oxygen",
    WATER_LEVEL = "water_level",
  }

  export enum ServiceUpdate {
    STATE_RESET = "state_reset",
    WATER_CHANGE_BEGAN = "water_change_began",
    WATER_CHANGE_COMPLETE = "water_change_complete",
    DRAIN_BEGAN = "water_drain_began",
    DRAIN_COMPLETE = "water_drain_complete",
    FILL_BEGAN = "water_fill_began",
    FILL_COMPLETE = "water_fill_complete",
    FILL_RESERVOIR_BEGAN = "fill_reservoir_began",
    FILL_RESERVOIR_COMPLETE = "fill_reservoir_complete",
  }

  export enum ServiceRequest {
    RESET_STATE = "reset_state",
    START_WATER_CHANGE = "start_water_change",
    START_FILL_TANK = "start_fill_tank",
    START_FILL_RESERVOIR = "start_fill_reservoir",
    START_DRAIN_TANK = "start_drain_tank",
    CANCEL_WATER_CHANGE = "cancel_water_change",
    CANCEL_FILL_TANK = "cancel_fill_tank",
    CANCEL_FILL_RESERVOIR = "cancel_fill_reservoir",
    CANCEL_DRAIN_TANK = "cancel_drain_tank",
  }
}
