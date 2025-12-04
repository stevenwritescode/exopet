"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Maintenance = void 0;
var Maintenance;
(function (Maintenance) {
    var Status;
    (function (Status) {
        Status[Status["IDLE"] = 0] = "IDLE";
        Status[Status["DRAINING"] = 1] = "DRAINING";
        Status[Status["FILLING"] = 2] = "FILLING";
        Status[Status["FILLING_RES"] = 3] = "FILLING_RES";
        Status[Status["STARTING_WATER_CHANGE"] = 4] = "STARTING_WATER_CHANGE";
        Status[Status["WATER_CHANGE_DRAIN"] = 5] = "WATER_CHANGE_DRAIN";
        Status[Status["WATER_CHANGE_FILL"] = 6] = "WATER_CHANGE_FILL";
        Status[Status["WATER_CHANGE_FILL_RES"] = 7] = "WATER_CHANGE_FILL_RES";
    })(Status = Maintenance.Status || (Maintenance.Status = {}));
})(Maintenance || (exports.Maintenance = Maintenance = {}));
