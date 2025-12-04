import express from "express";
import { MaintenanceManager } from "../logic/Maintenance.logic";
import { LogManager } from "../logic/Log.logic";
import { TankDataManager } from "../data/Tank.data";

const router = express.Router();

router.get("/change/:tankId", async (req, res) => {
  const tankId = req.params.tankId;
  const message = await waterChangeEndpoint(tankId);
  res.json(message);
});

export const waterChangeEndpoint = async (tankId: string) => {
  const tankData = await TankDataManager.getTankData(tankId);

  if (!tankData) {
    return;
  }

  const settings = tankData.settings;
  const { drain_time, fill_time, has_reservoir, res_fill_time } = settings;

  if (has_reservoir) {
    MaintenanceManager.waterChange(
      tankId,
      drain_time,
      fill_time,
      res_fill_time
    ); // Assume waterChange is an async function
  } else {
    MaintenanceManager.waterChange(tankId, drain_time, fill_time);
  }

  // Assume addLog is an async function
  await LogManager.waterChange({
    container_id: tankId,
  });

  return { message: "Water change complete." };
};

router.get("/fill/:tankId", async (req, res) => {
  const tankId = req.params.tankId;
  const message = await fillEndpoint(tankId);
  res.json(message);
});

export const fillEndpoint = async (tankId: string) => {
  const tankData = await TankDataManager.getTankData(tankId);

  if (!tankData) {
    return;
  }

  const settings = tankData.settings;
  const fillTime = settings.fill_time || 0;

  MaintenanceManager.fill(tankId, fillTime);

  return {
    duration: fillTime,
    durationMs: fillTime * 1000,
    message: `Started filling tank for ${fillTime} seconds.`,
  };
};

router.get("/drain/:tankId", async (req, res) => {
  const tankId = req.params.tankId;
  const message = await drainEndpoint(tankId);
  res.json(message);
});

export const drainEndpoint = async (tankId: string) => {
  const tankData = await TankDataManager.getTankData(tankId);

  if (!tankData) {
    return;
  }

  const settings = tankData.settings;
  const drainTime = settings.drain_time || 0;
  MaintenanceManager.drain(tankId, drainTime);
  return {
    duration: drainTime,
    durationMs: drainTime * 1000,
    message: `Started draining tank for ${drainTime} seconds.`,
  };
};

router.get("/reset/:tankId", async (req, res) => {
  const tankId = req.params.tankId;
  const tankData = await TankDataManager.getTankData(tankId);

  if (!tankData) {
    return res.status(404).json({ error: "Tank not found" });
  }

  await MaintenanceManager.stop(tankId); // Assume stop is an async function

  console.log(tankData);
  res.json({ message: "Service status was reset." });
});

export default router;
