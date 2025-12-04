export declare namespace System {
    interface Request {
        action: ServiceRequest | ParameterCheck;
        data?: any;
    }
    interface Update {
        action?: ServiceUpdate | ParameterUpdate;
        data?: any;
    }
    enum State {
        IDLE = 0,
        DRAINING = 1,
        FILLING_TANK = 2,
        FILLING_RESERVOIR = 3,
        WATER_CHANGE_DRAINING = 4,
        WATER_CHANGE_FILLING_TANK = 5,
        WATER_CHANGE_FILLING_RESERVOIR = 6
    }
    enum ParameterUpdate {
        TEMPERATURE = "temperature",
        PH = "ph",
        OXYGEN = "oxygen",
        WATER_LEVEL = "water_level"
    }
    enum ParameterCheck {
        TEMPERATURE = "temperature",
        PH = "ph",
        OXYGEN = "oxygen",
        WATER_LEVEL = "water_level"
    }
    enum ServiceUpdate {
        STATE_RESET = "state_reset",
        WATER_CHANGE_BEGAN = "water_change_began",
        WATER_CHANGE_COMPLETE = "water_change_complete",
        DRAIN_BEGAN = "water_drain_began",
        DRAIN_COMPLETE = "water_drain_complete",
        FILL_BEGAN = "water_fill_began",
        FILL_COMPLETE = "water_fill_complete",
        FILL_RESERVOIR_BEGAN = "fill_reservoir_began",
        FILL_RESERVOIR_COMPLETE = "fill_reservoir_complete"
    }
    enum ServiceRequest {
        RESET_STATE = "reset_state",
        START_WATER_CHANGE = "start_water_change",
        START_FILL_TANK = "start_fill_tank",
        START_FILL_RESERVOIR = "start_fill_reservoir",
        START_DRAIN_TANK = "start_drain_tank",
        CANCEL_WATER_CHANGE = "cancel_water_change",
        CANCEL_FILL_TANK = "cancel_fill_tank",
        CANCEL_FILL_RESERVOIR = "cancel_fill_reservoir",
        CANCEL_DRAIN_TANK = "cancel_drain_tank"
    }
}
