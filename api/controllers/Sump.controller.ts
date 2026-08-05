import express from "express";
import { SumpManager } from "../logic/Sump.logic";

const router = express.Router();

export const startSumpEndpoint = async (tankId: string) => {
  return SumpManager.start(tankId);
};

export const stopSumpEndpoint = async () => {
  await SumpManager.stop("manual");
  return { ok: true };
};

export const resetSumpEndpoint = async () => {
  return SumpManager.resetLockout();
};

router.get("/start/:tankId", async (req, res) => {
  const result = await startSumpEndpoint(req.params.tankId);
  res.status(result.ok ? 200 : 409).json(result);
});

router.get("/stop/:tankId", async (_req, res) => {
  res.json(await stopSumpEndpoint());
});

router.get("/reset/:tankId", async (_req, res) => {
  const result = await resetSumpEndpoint();
  res.status(result.ok ? 200 : 409).json(result);
});

router.get("/status/:tankId", (_req, res) => {
  res.json({ state: SumpManager.state, sumpFull: SumpManager.sumpFull });
});

export default router;
