const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Cooldown tracking to avoid spamming Discord
const alertCooldowns: Record<string, number> = {};
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between repeated alerts

export class NotifyManager {
  static sendDiscord = async (content: string): Promise<void> => {
    if (!DISCORD_WEBHOOK_URL) {
      console.warn("[Notify] DISCORD_WEBHOOK_URL not set, skipping notification");
      return;
    }
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch (error) {
      console.error("[Notify] Failed to send Discord notification:", error);
    }
  };

  static checkTemperature = async (
    tankId: string,
    average: number,
    lowerLimit?: number,
    upperLimit?: number
  ): Promise<void> => {
    if (!lowerLimit && !upperLimit) return;
    const now = Date.now();

    if (upperLimit && average > upperLimit) {
      const key = `hot-${tankId}`;
      if (!alertCooldowns[key] || now - alertCooldowns[key] > COOLDOWN_MS) {
        alertCooldowns[key] = now;
        await this.sendDiscord(
          `🌡️ **Temperature Alert** — Tank \`${tankId}\` is too HOT!\nCurrent: **${average.toFixed(1)}°C** (limit: ${upperLimit}°C)`
        );
      }
    }

    if (lowerLimit && average < lowerLimit) {
      const key = `cold-${tankId}`;
      if (!alertCooldowns[key] || now - alertCooldowns[key] > COOLDOWN_MS) {
        alertCooldowns[key] = now;
        await this.sendDiscord(
          `🥶 **Temperature Alert** — Tank \`${tankId}\` is too COLD!\nCurrent: **${average.toFixed(1)}°C** (limit: ${lowerLimit}°C)`
        );
      }
    }
  };
}
