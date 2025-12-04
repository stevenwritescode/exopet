import { v4 as uuid } from "uuid";

export class Log {
  id: string = uuid();
  action_type: string = "";
  animal_id?: string | number;
  container_id?: string | number;
  timestamp: string;
  log_json?: any;

  constructor({
    id,
    animal_id,
    container_id,
    log_json,
    action_type,
  }: Partial<Log>) {
    this.id = id || this.id;
    this.animal_id = animal_id || this.animal_id;
    this.container_id = container_id || this.container_id;
    this.action_type = action_type || this.action_type;
    this.log_json = log_json || this.log_json;
    this.timestamp = new Date().toISOString();
  }
}
