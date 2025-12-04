"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Animal = void 0;
var uuid_1 = require("uuid");
var Animal = /** @class */ (function () {
    function Animal(_a) {
        var id = _a.id, enclosure_id = _a.enclosure_id, enclosure_type = _a.enclosure_type, name = _a.name, species = _a.species, species_latin = _a.species_latin, notes = _a.notes, last_feeding_log = _a.last_feeding_log;
        this.id = (0, uuid_1.v4)();
        this.id = id || this.id;
        this.name = name || this.name;
        this.enclosure_id = enclosure_id;
        this.enclosure_type = enclosure_type;
        this.species = species;
        this.species_latin = species_latin;
        this.notes = notes || this.notes;
        this.last_feeding_log = last_feeding_log;
    }
    return Animal;
}());
exports.Animal = Animal;
