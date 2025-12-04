"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tank = void 0;
var uuid_1 = require("uuid");
var System_model_1 = require("./System.model");
var Tank = /** @class */ (function () {
    function Tank(_a) {
        var id = _a.id, name = _a.name, type = _a.type, service_status = _a.service_status, settings = _a.settings;
        var _this = this;
        this.id = (0, uuid_1.v4)();
        this.service_status = System_model_1.System.State.IDLE;
        this.settings = {
            volume: 0,
            vol_unit: "gallons",
            drain_time: 0,
            fill_time: 0,
            res_fill_time: 0,
            has_reservoir: false,
            lower_temp_limit: 0,
            upper_temp_limit: 0,
        };
        this.updateSettings = function (settings) {
            _this.settings = settings;
        };
        this.id = id || this.id;
        this.name = name || this.name;
        this.type = type || this.type;
        this.service_status = service_status || this.service_status;
        this.settings = settings || this.settings;
    }
    return Tank;
}());
exports.Tank = Tank;
