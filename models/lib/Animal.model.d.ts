export declare class Animal {
    id: string;
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
    constructor({ id, biome_id, biome_type, name, species, species_latin, notes, image_url, last_feeding_log, }: Animal);
}
