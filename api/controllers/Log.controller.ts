import express from "express";
import { Log } from "aquario-models";
import { LogManager } from "../logic/Log.logic";

const router = express.Router();

router.post("/feeding", async (req, res) => {
  try {
    const log = new Log(req.body);
    await LogManager.feeding(log);
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/feeding/:id", async (req, res) => {
  try {
    const logId = req.params.id;
    await LogManager.deleteLog(logId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
