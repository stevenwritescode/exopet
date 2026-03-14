import { dbConnection } from "../data/common.data";
import { waterChangeEndpoint } from "../controllers/Maintenance.controller";

const triggeredThisMinute = new Map<string, string>();

async function tick() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;

  const conn = await dbConnection();
  if (!conn) return;

  try {
    const rows = await conn.all(
      "SELECT tank_id, schedule_days, schedule_time FROM tank_settings WHERE schedule_enabled = 1"
    );

    for (const row of rows) {
      const days = (row.schedule_days || "")
        .split(",")
        .map((d: string) => parseInt(d.trim(), 10))
        .filter((d: number) => !isNaN(d));

      if (!days.includes(dayOfWeek)) continue;
      if (row.schedule_time !== currentTime) continue;

      const key = row.tank_id;
      if (triggeredThisMinute.get(key) === currentTime) continue;

      console.log(`[Scheduler] Triggering water change for tank ${key} at ${currentTime}`);
      triggeredThisMinute.set(key, currentTime);
      waterChangeEndpoint(key);
    }
  } catch (e) {
    console.error("[Scheduler] Error:", e);
  } finally {
    await conn.close();
  }

  // Clean up stale entries
  for (const [tankId, time] of triggeredThisMinute) {
    if (time !== currentTime) {
      triggeredThisMinute.delete(tankId);
    }
  }
}

export class ScheduleManager {
  private static interval: ReturnType<typeof setInterval> | null = null;

  static start() {
    if (this.interval) return;
    console.log("[Scheduler] Started — checking every 30s");
    this.interval = setInterval(tick, 30_000);
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
