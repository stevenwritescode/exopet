"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.System = void 0;
var System;
(function (System) {
    var State;
    (function (State) {
        State["IDLE"] = "idle";
        State["FILLING_TANK"] = "filling_tank";
        State["FILLING_RESERVOIR"] = "filling_reservoir";
        State["DRAINING"] = "draining";
    })(State = System.State || (System.State = {}));
    var StateUpdate;
    (function (StateUpdate) {
        StateUpdate["STATE_RESET"] = "state_reset";
        StateUpdate["WATER_CHANGE_BEGAN"] = "water_change_began";
        StateUpdate["WATER_CHANGE_COMPLETE"] = "water_change_complete";
        StateUpdate["WATER_FILL_BEGAN"] = "water_fill_began";
        StateUpdate["WATER_FILL_COMPLETE"] = "water_fill_complete";
        StateUpdate["WATER_DRAIN_BEGAN"] = "water_drain_began";
        StateUpdate["WATER_DRAIN_COMPLETE"] = "water_drain_complete";
    })(StateUpdate = System.StateUpdate || (System.StateUpdate = {}));
    var StateChange;
    (function (StateChange) {
        StateChange["RESET_STATE"] = "reset_state";
        StateChange["START_WATER_CHANGE"] = "start_water_change";
        StateChange["START_FILL_TANK"] = "start_fill_tank";
        StateChange["START_FILL_RESERVOIR"] = "start_fill_reservoir";
        StateChange["START_DRAIN_TANK"] = "start_drain_tank";
        StateChange["CANCEL_WATER_CHANGE"] = "cancel_water_change";
        StateChange["CANCEL_FILL_TANK"] = "cancel_fill_tank";
        StateChange["CANCEL_FILL_RESERVOIR"] = "cancel_fill_reservoir";
        StateChange["CANCEL_DRAIN_TANK"] = "cancel_drain_tank";
    })(StateChange = System.StateChange || (System.StateChange = {}));
})(System || (exports.System = System = {}));
