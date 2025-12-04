"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Log = void 0;
var uuid_1 = require("uuid");
var Log = /** @class */ (function () {
    function Log(_a) {
        var id = _a.id, animal_id = _a.animal_id, container_id = _a.container_id, log_json = _a.log_json, action_type = _a.action_type;
        this.id = (0, uuid_1.v4)();
        this.action_type = "";
        this.id = id || this.id;
        this.animal_id = animal_id || this.animal_id;
        this.container_id = container_id || this.container_id;
        this.action_type = action_type || this.action_type;
        this.log_json = log_json || this.log_json;
        this.timestamp = new Date().toISOString();
    }
    return Log;
}());
exports.Log = Log;
