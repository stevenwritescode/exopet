import { v4 as uuid } from "uuid";

export class Animal {
  id: string = uuid();
  tank_id?: string;
  name?: string;
  species?: string;
  species_latin?: string;
  notes?: string;
  biome_id?: string;
  biome_type?: string;
  image_url?: string;
  last_feeding_log?: {
    log_type: string;
    timestamp: string;
    food_type?: string;
    food_quantity?: number;
    log_json: string;
  };

  constructor({
    id,
    biome_id,
    biome_type,
    name,
    species,
    species_latin,
    notes,
    image_url,
    last_feeding_log,
  }: Animal) {
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
}
