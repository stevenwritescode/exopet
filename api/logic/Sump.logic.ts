import { System } from "aquario-models/lib/System.model";
import {
  DataManager,
  safeRelayOn,
  safeRelayOff,
  MAIN_VALVE_LINE,
  SUMP_PUMP_LINE,
} from "../data/common.data";
import { TankDataManager } from "../data/Tank.data";
import { NotifyManager } from "./Notify.logic";

export type SumpStopReason = "manual" | "water_change" | "sump_full" | "shutdown";

export class SumpManager {
  static state: System.SumpState = System.SumpState.STOPPED;
  static sumpFull: boolean = false;
  static tankId: string | null = null; // display tank the sump serves
  static resumePending: boolean = false; // restart after a maintenance cycle
  private static valveTimer?: NodeJS.Timeout;

  private static broadcast = (reason?: string): void => {
    DataManager.send({
      action: System.ServiceUpdate.SUMP_STATE,
      data: { tank_id: this.tankId, state: this.state, reason },
    });
  };

  private static getValveTravelTime = async (
    tankId: string | null
  ): Promise<number> => {
    if (!tankId) return 10;
    const settings = await TankDataManager.getTankSettings(tankId);
    const t = settings?.valve_travel_time;
    return typeof t === "number" && t > 0 ? t : 10;
  };

  static start = async (
    tankId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (this.state === System.SumpState.LOCKED_OUT) {
      return { ok: false, error: "sump is locked out — reset required" };
    }
    if (this.sumpFull) {
      return { ok: false, error: "sump float reads full" };
    }
    if (
      this.state === System.SumpState.RUNNING ||
      this.state === System.SumpState.OPENING_VALVE
    ) {
      return { ok: true }; // already on the way up
    }
    const { MaintenanceManager } = require("./Maintenance.logic");
    if (MaintenanceManager.serviceStatus !== System.State.IDLE) {
      return { ok: false, error: "maintenance cycle in progress" };
    }
    const sump = await TankDataManager.getSumpForTank(tankId);
    if (!sump) {
      return { ok: false, error: "no sump connected to this tank" };
    }

    // Resolve travel time BEFORE touching relays/state so the subsequent
    // relay-on → state change → broadcast → setTimeout sequence is fully
    // synchronous and cannot be interrupted by a concurrent stop()/lockout().
    const travel = await this.getValveTravelTime(tankId);
    // Re-check: a lockout or float trip may have landed during the awaits.
    // Cast through unknown to defeat TS's pre-await control-flow narrowing on this.state.
    const stateNow = this.state as unknown as System.SumpState;
    if (stateNow === System.SumpState.LOCKED_OUT) {
      return { ok: false, error: "sump is locked out — reset required" };
    }
    if (this.sumpFull) {
      return { ok: false, error: "sump float reads full" };
    }
    if (
      stateNow === System.SumpState.RUNNING ||
      stateNow === System.SumpState.OPENING_VALVE
    ) {
      return { ok: true }; // concurrent start won during the awaits — don't restart
    }
    this.tankId = tankId;
    if (this.valveTimer) clearTimeout(this.valveTimer);
    safeRelayOn(MAIN_VALVE_LINE); // valve starts motoring open
    this.state = System.SumpState.OPENING_VALVE;
    this.broadcast();
    this.valveTimer = setTimeout(() => {
      // Only proceed if nothing interrupted the opening sequence
      if (this.state === System.SumpState.OPENING_VALVE) {
        safeRelayOn(SUMP_PUMP_LINE); // valve is open — start the return pump
        this.state = System.SumpState.RUNNING;
        this.broadcast();
      }
    }, travel * 1000);
    return { ok: true };
  };

  static stop = async (reason: SumpStopReason): Promise<void> => {
    if (
      this.state === System.SumpState.STOPPED ||
      this.state === System.SumpState.LOCKED_OUT
    ) {
      return;
    }
    // Resolve travel time BEFORE touching relays/state so the subsequent
    // relay-off → state change → broadcast → setTimeout sequence is fully
    // synchronous and cannot be interrupted by a concurrent start()/lockout().
    const travel = await this.getValveTravelTime(this.tankId);
    // Re-check: a lockout (or completed stop) may have landed during the await.
    // Cast through unknown to defeat TS's pre-await control-flow narrowing on this.state.
    const stateNow = this.state as unknown as System.SumpState;
    if (
      stateNow === System.SumpState.STOPPED ||
      stateNow === System.SumpState.LOCKED_OUT
    ) {
      return;
    }
    if (this.valveTimer) clearTimeout(this.valveTimer);
    safeRelayOff(SUMP_PUMP_LINE); // pump off first, always
    safeRelayOff(MAIN_VALVE_LINE); // valve motors closed on its own power-off
    this.state = System.SumpState.STOPPING;
    this.broadcast(reason);
    this.valveTimer = setTimeout(() => {
      if (this.state === System.SumpState.STOPPING) {
        this.state = System.SumpState.STOPPED;
        this.broadcast(reason);
      }
    }, travel * 1000);
  };

  static onSumpLevelChange = (sumpFull: boolean): void => {
    this.sumpFull = sumpFull;
    if (sumpFull && this.state !== System.SumpState.LOCKED_OUT) {
      this.lockout();
    }
  };

  private static lockout = (): void => {
    if (this.valveTimer) clearTimeout(this.valveTimer);
    safeRelayOff(SUMP_PUMP_LINE);
    safeRelayOff(MAIN_VALVE_LINE);
    this.state = System.SumpState.LOCKED_OUT;
    this.resumePending = false; // never auto-restart out of a lockout
    this.broadcast("sump_full");
    NotifyManager.sendDiscord(
      "🚨 **Sump Alert** — the sump float switch reads FULL. " +
        "Return pump stopped and main valve closed. " +
        "Check the sump before resetting the lockout."
    );
  };

  static resetLockout = async (): Promise<{ ok: boolean; error?: string }> => {
    if (this.state !== System.SumpState.LOCKED_OUT) {
      return { ok: false, error: "sump is not locked out" };
    }
    if (this.sumpFull) {
      return { ok: false, error: "sump float still reads full" };
    }
    this.state = System.SumpState.STOPPED;
    this.broadcast("lockout_reset");
    return { ok: true };
  };

  static pauseForMaintenance = async (): Promise<void> => {
    const active =
      this.state === System.SumpState.RUNNING ||
      this.state === System.SumpState.OPENING_VALVE;
    if (active) {
      this.resumePending = true;
      await this.stop("water_change");
    }
  };

  static resumeIfPaused = async (): Promise<void> => {
    if (!this.resumePending || !this.tankId) return;
    this.resumePending = false;
    await this.start(this.tankId);
  };

  static autostart = async (): Promise<void> => {
    try {
      const tanks = await TankDataManager.getAllTanks();
      const sump = (tanks as any[]).find(
        (t) => t.role === "sump" && t.parent_tank_id
      );
      if (!sump) return;
      const settings = await TankDataManager.getTankSettings(
        sump.parent_tank_id
      );
      if (settings?.sump_autostart === false) return;
      const result = await this.start(sump.parent_tank_id);
      if (!result.ok) {
        console.warn("[Sump] autostart skipped:", result.error);
      }
    } catch (e) {
      console.error("[Sump] autostart failed:", e);
    }
  };
}
