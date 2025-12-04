import { Animal } from "aquario-models";
import { AnimalDataManager } from "../data/Animal.data";
import { LogDataManager } from "../data/Log.data";
import { MaintenanceDataManager } from "../data/Maintenance.data";

export class AnimalManager {
  static addAnimal = async (animalConfig: Animal): Promise<void> => {
    AnimalDataManager.addAnimal(animalConfig);
  };
}
