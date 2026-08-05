import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Animal, System } from "aquario-models";
import TempStatusOverlay from "./TempStatusOverlay";
import AnimalCardScene from "./AnimalCardScene";
import { getAnimals } from "../dal/Animal.dal";
import { initWebSocket, onMessage } from "../dal/Maintenance.dal";

export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
export const VIDEO_SCENE_MS = 90_000;
export const CARD_MS = 25_000;

const ACTIVITY_EVENTS = [
  "pointerdown",
  "mousemove",
  "keydown",
  "touchstart",
] as const;

export default function Screensaver({
  timeoutMs = IDLE_TIMEOUT_MS,
}: {
  timeoutMs?: number;
}) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  const [scene, setScene] = useState<"video" | "cards">("video");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [sumpLockedOut, setSumpLockedOut] = useState(false);

  useEffect(() => {
    // Idle long enough for the saver means whoever was mid-task walked
    // away; reset to the home screen for the next person.
    if (active) navigate("/");
  }, [active, navigate]);

  useEffect(() => {
    const restartTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setActive(true), timeoutMs);
    };

    const onActivity = () => {
      // While the saver is showing, the overlay's own handler dismisses it;
      // here we only keep pushing the idle deadline out.
      restartTimer();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity));
    restartTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMs]);

  // Load animals and reset scene when screensaver activates/deactivates
  useEffect(() => {
    if (!active) {
      setScene("video");
      return;
    }
    const result = getAnimals();
    if (result && typeof result.then === "function") {
      result.then(setAnimals).catch(() => setAnimals([]));
    }
  }, [active]);

  // Scene cycling: video → cards → video → …
  useEffect(() => {
    if (!active) return;
    if (scene === "video") {
      if (animals.length === 0) return; // nothing to show — stay on video
      const t = setTimeout(() => setScene("cards"), VIDEO_SCENE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setScene("video"),
      Math.max(1, animals.length) * CARD_MS
    );
    return () => clearTimeout(t);
  }, [active, scene, animals]);

  // Sump lockout listener (once, on mount — the WS layer keeps the socket alive app-wide)
  useEffect(() => {
    initWebSocket();
    onMessage((event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.action === System.ServiceUpdate.SUMP_STATE) {
          setSumpLockedOut(msg.data?.state === System.SumpState.LOCKED_OUT);
        }
      } catch {
        // non-JSON frames (hello message) — ignore
      }
    });
  }, []);

  if (!active) return null;

  return (
    <div
      onPointerDown={() => setActive(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "screensaver-fade-in 1.2s ease both",
        cursor: "none",
      }}
    >
      <style>
        {`@keyframes screensaver-fade-in { from { opacity: 0; } to { opacity: 1; } }`}
      </style>
      {scene === "video" ? (
        <video
          src="/media/cosmo-echo-vid-2-loop.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <AnimalCardScene animals={animals} cardMs={CARD_MS} />
      )}
      {sumpLockedOut && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "16px",
            textAlign: "center",
            backgroundColor: "#b71c1c",
            color: "#fff",
            fontSize: "2rem",
            fontWeight: 700,
            zIndex: 1,
          }}
        >
          🚨 SUMP LOCKED OUT — CHECK WATER LEVEL
        </div>
      )}
      <TempStatusOverlay />
    </div>
  );
}
