"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Animal = void 0;
var uuid_1 = require("uuid");
var Animal = /** @class */ (function () {
    function Animal(_a) {
        var id = _a.id, biome_id = _a.biome_id, biome_type = _a.biome_type, name = _a.name, species = _a.species, species_latin = _a.species_latin, notes = _a.notes, image_url = _a.image_url, last_feeding_log = _a.last_feeding_log;
        this.id = (0, uuid_1.v4)();
        this.id = id || this.id;
        this.name = name || this.name;
        this.biome_id = biome_id;
        this.biome_type = biome_type;
        this.species = species;
        this.species_latin = species_latin;
        this.image_url = image_url;
        this.notes = notes || this.notes;
        this.last_feeding_log = last_feeding_log;
    }
    return Animal;
}());
exports.Animal = Animal;
