"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.System = void 0;
var System;
(function (System) {
    var State;
    (function (State) {
        State[State["IDLE"] = 0] = "IDLE";
        State[State["DRAINING"] = 1] = "DRAINING";
        State[State["FILLING_TANK"] = 2] = "FILLING_TANK";
        State[State["FILLING_RESERVOIR"] = 3] = "FILLING_RESERVOIR";
        State[State["WATER_CHANGE_DRAINING"] = 4] = "WATER_CHANGE_DRAINING";
        State[State["WATER_CHANGE_FILLING_TANK"] = 5] = "WATER_CHANGE_FILLING_TANK";
        State[State["WATER_CHANGE_FILLING_RESERVOIR"] = 6] = "WATER_CHANGE_FILLING_RESERVOIR";
    })(State = System.State || (System.State = {}));
    var ParameterUpdate;
    (function (ParameterUpdate) {
        ParameterUpdate["TEMPERATURE"] = "temperature";
        ParameterUpdate["PH"] = "ph";
        ParameterUpdate["OXYGEN"] = "oxygen";
        ParameterUpdate["WATER_LEVEL"] = "water_level";
    })(ParameterUpdate = System.ParameterUpdate || (System.ParameterUpdate = {}));
    var ParameterCheck;
    (function (ParameterCheck) {
        ParameterCheck["TEMPERATURE"] = "temperature";
        ParameterCheck["PH"] = "ph";
        ParameterCheck["OXYGEN"] = "oxygen";
        ParameterCheck["WATER_LEVEL"] = "water_level";
    })(ParameterCheck = System.ParameterCheck || (System.ParameterCheck = {}));
    var ServiceUpdate;
    (function (ServiceUpdate) {
        ServiceUpdate["STATE_RESET"] = "state_reset";
        ServiceUpdate["WATER_CHANGE_BEGAN"] = "water_change_began";
        ServiceUpdate["WATER_CHANGE_COMPLETE"] = "water_change_complete";
        ServiceUpdate["DRAIN_BEGAN"] = "water_drain_began";
        ServiceUpdate["DRAIN_COMPLETE"] = "water_drain_complete";
        ServiceUpdate["FILL_BEGAN"] = "water_fill_began";
        ServiceUpdate["FILL_COMPLETE"] = "water_fill_complete";
        ServiceUpdate["FILL_RESERVOIR_BEGAN"] = "fill_reservoir_began";
        ServiceUpdate["FILL_RESERVOIR_COMPLETE"] = "fill_reservoir_complete";
    })(ServiceUpdate = System.ServiceUpdate || (System.ServiceUpdate = {}));
    var ServiceRequest;
    (function (ServiceRequest) {
        ServiceRequest["RESET_STATE"] = "reset_state";
        ServiceRequest["START_WATER_CHANGE"] = "start_water_change";
        ServiceRequest["START_FILL_TANK"] = "start_fill_tank";
        ServiceRequest["START_FILL_RESERVOIR"] = "start_fill_reservoir";
        ServiceRequest["START_DRAIN_TANK"] = "start_drain_tank";
        ServiceRequest["CANCEL_WATER_CHANGE"] = "cancel_water_change";
        ServiceRequest["CANCEL_FILL_TANK"] = "cancel_fill_tank";
        ServiceRequest["CANCEL_FILL_RESERVOIR"] = "cancel_fill_reservoir";
        ServiceRequest["CANCEL_DRAIN_TANK"] = "cancel_drain_tank";
    })(ServiceRequest = System.ServiceRequest || (System.ServiceRequest = {}));
})(System || (exports.System = System = {}));
