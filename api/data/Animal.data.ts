import { Animal } from "aquario-models";
import { dbConnection } from "./common.data";

export class AnimalDataManager {
  static addAnimal = async (animal: Animal): Promise<void> => {
    const { species, tank_id, species_latin, name } = animal;
    const conn = await dbConnection();
    if (!conn) return;
    await conn.run(
      "INSERT INTO animals (tank_id, name, species, species_latin) VALUES (?, ?, ?, ?)",
      tank_id,
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
      const animals = await conn.all("SELECT * FROM animals");
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
