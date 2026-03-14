import express from "express";
import { TankDataManager } from "../data/Tank.data";
import { SensorDataManager } from "../data/Sensor.data";
import { Tank } from "aquario-models";
import { AnimalDataManager } from "../data/Animal.data";
import { LogDataManager } from "../data/Log.data";
import { TankManager } from "../logic/Tank.logic";

const router = express.Router();

router.get("/all", async (req, res) => {
  const tanks = await TankDataManager.getAllTanks();

  if (!tanks) {
    return res.status(404).json({ error: "Tank not found" });
  }

  res.json(tanks);
});

router.post("/add", async (req, res) => {
  try {
    const tank = new Tank(req.body.tank);
    await TankDataManager.addTank(tank);

    res.json(tank);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:tankId", async (req, res) => {
  const tankId = req.params.tankId;
  const tankData = await TankDataManager.getTankData(tankId);

  if (!tankData) {
    return res.status(404).json({ error: "Tank not found" });
  }

  res.json(tankData);
});

router.get("/:tankId/animals", async (req, res) => {
  const tankId = req.params.tankId;
  const animals = await AnimalDataManager.getAnimalsForTank(tankId);

  if (!animals) {
    return res.status(404).json({ error: "Animals not found" });
  }

  res.json(animals);
});

router.get("/:tankId/logs", async (req, res) => {
  const tankId = req.params.tankId;
  const logs = await LogDataManager.getLogsForTank(tankId);

  if (!logs) {
    return res.status(404).json({ error: "Logs not found" });
  }

  res.json(logs);
});

router.get("/:tankId/temperature", async (req, res) => {
  try {
    const tankId = req.params.tankId;
    const sensors = await SensorDataManager.getSensorsForTank(
      tankId,
      "Thermometer"
    );
    const temps: number[] = [];
    for (const sensor of sensors) {
      const temperature = await SensorDataManager.readTemperature(sensor);
      if (!temperature) {
        continue;
      }
      temps.push(temperature);
      return;
    }
    res.json({
      temperatures: temps,
      average: temps.reduce((a, b) => a + b, 0) / temps.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:tankId/settings", async (req, res) => {
  const tankId = req.params.tankId;
  const settings = await TankManager.getTankSettings(tankId);

  if (!settings) {
    return res.status(404).json({ error: "Animals not found" });
  }

  res.json(settings);
});

router.post("/:tankId/settings", async (req, res) => {
  const tankId = req.params.tankId;
  delete req.body.settings.id;
  delete req.body.settings.tank_id;
  await TankManager.updateTankSettings(
    tankId,
    req.body.settings
  );

  const updated = await TankManager.getTankSettings(tankId);
  res.json(updated);
});

export default router;
