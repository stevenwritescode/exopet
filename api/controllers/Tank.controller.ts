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

// Registered before the /:tankId routes so the literal path wins.
router.get("/temperatures", async (req, res) => {
  try {
    const statuses = await TankManager.getAllTemperatureStatuses();
    res.json({ statuses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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

  const sump = await TankDataManager.getSumpForTank(tankId);
  res.json({ ...tankData, sump });
});

router.post("/:tankId/update", async (req, res) => {
  try {
    const tankId = req.params.tankId;
    const fields = req.body || {};
    if (fields.parent_tank_id) {
      if (fields.parent_tank_id === tankId) {
        return res.status(400).json({ error: "a tank cannot be its own sump parent" });
      }
      const parent = await TankDataManager.getTankData(fields.parent_tank_id);
      if (!parent) {
        return res.status(400).json({ error: "parent tank not found" });
      }
      if (parent.role === "sump") {
        return res.status(400).json({ error: "cannot attach a sump to another sump" });
      }
      const current = await TankDataManager.getTankData(tankId);
      if (
        current?.role === "sump" &&
        current?.parent_tank_id &&
        current.parent_tank_id !== fields.parent_tank_id
      ) {
        return res.status(409).json({ error: "sump is already connected to another tank" });
      }
    }
    await TankDataManager.updateTank(tankId, fields);
    const updated = await TankDataManager.getTankData(tankId);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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
    const data = await TankManager.getTemperatures(tankId);
    res.json(data);
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
