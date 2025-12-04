export declare class Animal {
    id: string;
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
    constructor({ id, enclosure_id, enclosure_type, name, species, species_latin, notes, last_feeding_log, }: Animal);
}
