export declare namespace System {
    interface Message {
        action?: string;
        tank_id?: string;
        res_id?: string;
        animal_id?: string;
        data?: any;
    }
    enum State {
        IDLE = "idle",
        FILLING_TANK = "filling_tank",
        FILLING_RESERVOIR = "filling_reservoir",
        DRAINING = "draining"
    }
    enum StateUpdate {
        STATE_RESET = "state_reset",
        WATER_CHANGE_BEGAN = "water_change_began",
        WATER_CHANGE_COMPLETE = "water_change_complete",
        WATER_FILL_BEGAN = "water_fill_began",
        WATER_FILL_COMPLETE = "water_fill_complete",
        WATER_DRAIN_BEGAN = "water_drain_began",
        WATER_DRAIN_COMPLETE = "water_drain_complete"
    }
    enum StateChange {
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
