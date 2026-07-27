import { useEffect, useRef, useState } from "react";

export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

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
      <video
        src="/media/cosmo-echo-vid-2-loop.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
