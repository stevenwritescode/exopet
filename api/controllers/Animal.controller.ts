import express from "express";
import { AnimalDataManager } from "../data/Animal.data";
import { Animal } from "aquario-models";
import { LogDataManager } from "../data/Log.data";

const router = express.Router();

router.get("/all", async (req, res) => {
  const allAnimals = await AnimalDataManager.getAllAnimals();

  if (!allAnimals) {
    return res.status(404).json({ error: "Animals not found" });
  }

  res.json(allAnimals);
});

router.post("/add", async (req, res) => {
  try {
    const animal = new Animal(req.body.animal);
    await AnimalDataManager.addAnimal(animal);

    res.json(animal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:animalId", async (req, res) => {
  const animalId = req.params.animalId;
  const animalData = await AnimalDataManager.getAnimalData(animalId);
  const animalLogs = await LogDataManager.getLogsForAnimal(animalId);

  if (!animalData) {
    return res.status(404).json({ error: "Animal not found" });
  }

  res.json({ animal: animalData, logs: animalLogs });
});

router.post("/:animalId/update", async (req, res) => {
  try {
    const animalId = req.params.animalId;
    await AnimalDataManager.updateAnimal(animalId, req.body);
    const updated = await AnimalDataManager.getAnimalData(animalId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
