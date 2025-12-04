import { v4 as uuid } from "uuid";

export class Animal {
  id: string = uuid();
  tank_id?: string;
  name?: string;
  species?: string;
  species_latin?: string;
  notes?: string;
  enclosure_id?: string;
  enclosure_type?: string;
  last_feeding_log?: {
    log_type: string;
    timestamp: string;
    food_type?: string;
    food_quantity?: number;
    log_json: string;
  };

  constructor({
    id,
    enclosure_id,
    enclosure_type,
    name,
    species,
    species_latin,
    notes,
    last_feeding_log,
  }: Animal) {
    this.id = id || this.id;
    this.name = name || this.name;
    this.enclosure_id = enclosure_id;
    this.enclosure_type = enclosure_type;
    this.species = species;
    this.species_latin = species_latin;
    this.notes = notes || this.notes;
    this.last_feeding_log = last_feeding_log;
  }
}
