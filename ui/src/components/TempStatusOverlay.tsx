import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import SensorsOffIcon from "@mui/icons-material/SensorsOff";
import { getTemperatureStatuses, TankTempStatus } from "../dal/Tank.dal";
import { temperatureGaugeColor } from "../utils/temperature";

const POLL_MS = 15_000;
const DRIFT_MS = 2 * 60_000;
const MAX_FAILURES = 3;

// Every corner sets the same four properties so the position change
// animates instead of snapping when the anchor side switches.
const CORNERS = [
  { top: "94%", left: "3%", transform: "translate(0, -100%)" },
  { top: "6%", left: "3%", transform: "translate(0, 0)" },
  { top: "6%", left: "97%", transform: "translate(-100%, 0)" },
  { top: "94%", left: "97%", transform: "translate(-100%, -100%)" },
];

export default function TempStatusOverlay() {
  const [statuses, setStatuses] = useState<TankTempStatus[]>([]);
  const [hubDown, setHubDown] = useState(false);
  const [corner, setCorner] = useState(0);
  const failuresRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getTemperatureStatuses();
        if (cancelled) return;
        failuresRef.current = 0;
        setHubDown(false);
        setStatuses(next);
      } catch {
        if (cancelled) return;
        failuresRef.current += 1;
        if (failuresRef.current >= MAX_FAILURES) setHubDown(true);
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setCorner((c) => (c + 1) % CORNERS.length),
      DRIFT_MS
    );
    return () => clearInterval(interval);
  }, []);

  if (statuses.length === 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        ...CORNERS[corner],
        transition: "top 1.5s ease, left 1.5s ease, transform 1.5s ease",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        pointerEvents: "none",
      }}
    >
      {statuses.map((s) => {
        const inactive = hubDown || s.average == null;
        const color = inactive
          ? "gray"
          : temperatureGaugeColor({
              currentTemp: s.average as number,
              lower_temp_limit: s.lower_temp_limit || 25,
              upper_temp_limit: s.upper_temp_limit || 30,
            });
        return (
          <Box
            key={s.tank_id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.75,
              borderRadius: 999,
              backgroundColor: "rgba(0, 0, 0, 0.55)",
            }}
          >
            {inactive ? (
              <SensorsOffIcon sx={{ color }} />
            ) : (
              <ThermostatIcon sx={{ color }} />
            )}
            <Typography sx={{ color, fontSize: "1.5rem", fontWeight: 600 }}>
              {inactive
                ? "—"
                : `${Math.round(s.average as number)}°C / ${Math.round(
                    (s.average as number) * 1.8 + 32
                  )}°F`}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
