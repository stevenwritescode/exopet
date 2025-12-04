export declare class Log {
    id: string;
    action_type: string;
    animal_id?: string | number;
    container_id?: string | number;
    timestamp: string;
    log_json?: any;
    constructor({ id, animal_id, container_id, log_json, action_type, }: Partial<Log>);
}
