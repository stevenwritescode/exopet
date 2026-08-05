import { Animal } from "aquario-models";
import { dbConnection } from "./common.data";

export class AnimalDataManager {
  static addAnimal = async (animal: Animal): Promise<void> => {
    const { id, species, enclosure_id, enclosure_type, species_latin, name } = animal;
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run(
      "INSERT INTO animals (id, enclosure_id, enclosure_type, name, species, species_latin) VALUES (?, ?, ?, ?, ?, ?)",
      id,
      enclosure_id,
      enclosure_type,
      name,
      species,
      species_latin
    );
    await conn.close();
  };

  static removeAnimal = async (animalId: number): Promise<void> => {
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run("DELETE FROM animals WHERE id = ?", animalId);
    await conn.close();
  };

  static getAllAnimals = async (): Promise<Animal[]> => {
    try {
      const conn = await dbConnection();
      if (!conn) return [];
      // Enrich each animal row with its latest feeding log so that
      // consumers (e.g. the kiosk screensaver card scene) can render
      // "last fed X ago" without a separate per-animal request.
      const animals = await conn.all(`
        SELECT
          a.*,
          fl.timestamp   AS fl_timestamp,
          fl.action_type AS fl_action_type,
          fl.log_json    AS fl_log_json
        FROM animals a
        LEFT JOIN (
          SELECT animal_id, timestamp, action_type, log_json
          FROM logs
          WHERE action_type = 'Feeding'
            AND (animal_id, timestamp) IN (
              SELECT animal_id, MAX(timestamp)
              FROM logs
              WHERE action_type = 'Feeding'
              GROUP BY animal_id
            )
        ) fl ON fl.animal_id = a.id
      `);
      await conn.close();

      if (!animals) {
        return [];
      }

      return animals.map((row: any) => {
        const animal: Animal = { ...row };
        if (row.fl_timestamp) {
          let parsedLog: any = row.fl_log_json;
          try { parsedLog = JSON.parse(row.fl_log_json); } catch { /* keep raw */ }
          animal.last_feeding_log = {
            log_type: row.fl_action_type,
            timestamp: row.fl_timestamp,
            log_json: parsedLog,
          };
        }
        // Remove the flat join columns from the returned object
        delete (animal as any).fl_timestamp;
        delete (animal as any).fl_action_type;
        delete (animal as any).fl_log_json;
        return animal;
      });
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  static getAnimalsForTank = async (tankId: string): Promise<Animal[]> => {
    try {
      const conn = await dbConnection();
      if (!conn) return [];
      const animals = await conn.all("SELECT * FROM animals WHERE enclosure_id = ?", tankId);
      await conn.close();

      if (!animals) {
        return [];
      } else {
        return animals;
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  static getAnimalData = async (animalId: string): Promise<Animal | null> => {
    try {
      const conn = await dbConnection();
      if (!conn) return null;
      const animalData = await conn.get(
        "SELECT * FROM animals WHERE id = ?",
        animalId
      );
      await conn.close();

      if (!animalData) {
        return null;
      } else {
        return animalData;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  static updateAnimal = async (
    animalId: string,
    fields: Partial<Pick<Animal, "name" | "species" | "species_latin">>
  ): Promise<void> => {
    const allowedColumns = new Set(["name", "species", "species_latin", "sex", "color", "enclosure_type", "enclosure_id", "image_url"]);
    const conn = await dbConnection();
    if (!conn) return;
    const entries = Object.entries(fields).filter(([k, v]) => v !== undefined && allowedColumns.has(k));
    if (entries.length === 0) return;
    const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([_, v]) => v);
    await conn.run(
      `UPDATE animals SET ${setClause} WHERE id = ?`,
      ...values,
      animalId
    );
    await conn.close();
  };
}
