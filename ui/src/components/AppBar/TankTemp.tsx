import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WarningIcon from "@mui/icons-material/Warning";
import { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import { System, Tank } from "aquario-models";
import { getTankDetails } from "../../dal/Tank.dal";
import { onMessage, sendMessage } from "../../dal/Maintenance.dal";

interface TankTempBarProps {
  tankDetails?: Partial<Tank>;
  currentTemp?: number;
  onRefresh?: () => void;
}

const dangerLevel = ({
  currentTemp,
  lower_temp_limit,
  upper_temp_limit,
}: {
  currentTemp: number;
  lower_temp_limit: number;
  upper_temp_limit: number;
}) => {
  if (currentTemp < lower_temp_limit - 5) {
    return "dangerously cold";
  } else if (currentTemp < lower_temp_limit - 2.5) {
    return "very cold";
  } else if (currentTemp < lower_temp_limit) {
    return "cold";
  } else if (currentTemp > upper_temp_limit + 3) {
    return "dangerously warm";
  } else if (currentTemp > upper_temp_limit + 1.5) {
    return "very warm";
  } else if (currentTemp > upper_temp_limit) {
    return "warm";
  } else {
    return "ideal";
  }
};

const temperatureGaugeColor = ({
  currentTemp,
  lower_temp_limit,
  upper_temp_limit,
}: {
  currentTemp: number;
  lower_temp_limit: number;
  upper_temp_limit: number;
}) => {
  const danger = dangerLevel({
    currentTemp,
    lower_temp_limit,
    upper_temp_limit,
  });
  switch (danger) {
    case "dangerously cold":
      return "indigo";
    case "very cold":
      return "blue";
    case "cold":
      return "cyan";
    case "dangerously warm":
      return "red";
    case "very warm":
      return "orange";
    case "warm":
      return "yellow";
    default:
      return "lime";
  }
};

export const showWaterTemp: React.FC<TankTempBarProps> = ({
  tankDetails,
  currentTemp,
  onRefresh,
}) => {
  const lower_temp_limit = tankDetails?.settings?.lower_temp_limit || 25;
  const upper_temp_limit = tankDetails?.settings?.upper_temp_limit || 30;

  // Determine severity for styling
  const danger = currentTemp != null
    ? dangerLevel({ currentTemp, lower_temp_limit, upper_temp_limit })
    : null;

  // Reusable sx to show pointer cursor on hover
  const clickableSx = {
    cursor: "pointer",
    alignItems: "middle" as const,
  };

  if (currentTemp != null && currentTemp !== 0) {
    const currentTempC = Math.round(currentTemp);
    const currentTempF = Math.round(currentTemp * 1.8 + 32);
    return (
      <Box display="flex" width="100%" justifyContent="center">
        <Box flex="auto 1 1" textAlign="center" />
        <Box flex="auto 1 1" textAlign="center">
          <Button
            onClick={onRefresh}
            sx={{
              ...clickableSx,
              color: temperatureGaugeColor({
                currentTemp,
                lower_temp_limit,
                upper_temp_limit,
              }),
            }}
          >
            <ThermostatIcon />
            <strong>{currentTempC}°C</strong>&nbsp;/&nbsp;
            <strong>{currentTempF}°F</strong>
          </Button>
          <Box
            flex="auto 1 1"
            display="flex"
            textAlign="center"
            justifyContent="center"
            alignItems="center"
          >
            {(currentTemp > upper_temp_limit ||
              currentTemp < lower_temp_limit) && (
              <WarningIcon
                htmlColor="yellow"
                fontSize="small"
                sx={{ ml: 1, height: "8pt", width: "8pt" }}
              />
            )}
            <Typography
              color={danger === "ideal" ? "lime" : "yellow"}
              fontSize={8}
              sx={{ ml: 0.25, mr: 1 }}
              variant="button"
            >
              {danger}
            </Typography>
          </Box>
        </Box>
        <Box flex="auto 1 1" textAlign="center" />
      </Box>
    );
  } else {
    // disconnected / no data state
    return (
      <Button onClick={onRefresh} sx={clickableSx}>
        <ThermostatIcon htmlColor="white" />
        <WarningIcon color="warning" />
      </Button>
    );
  }
};

export const TankTempBar: React.FC<Pick<TankTempBarProps, "tankDetails">> = ({
  tankDetails,
}) => {
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [tankData, setTankData] = useState<Partial<Tank>>(tankDetails || {});

  // Send a tick every 5s, plus initial connect
  useEffect(() => {
    handleUpdateTemp();
    const interval = setInterval(handleUpdateTemp, 5000);
    fetchTankData();
    return () => clearInterval(interval);
  }, []);

  const fetchTankData = async () => {
    if (tankDetails?.id) {
      const tank = await getTankDetails(tankDetails.id);
      if (tank) setTankData(tank);
    }
  };

  onMessage((event) => {
    try {
      const msg = JSON.parse(event.data) as System.Update;
      if (msg.action === System.ParameterUpdate.TEMPERATURE) {
        setCurrentTemp(msg.data.average);
      }
    } catch {
      // ignore
    }
  });

  const handleUpdateTemp = () => {
    // if socket is closed, this should invoke your DAL's reconnect logic
    const msg = {
      action: System.ParameterCheck.TEMPERATURE,
      data: { tank_id: tankData.id },
    };
    sendMessage(msg);
  };

  return (
    <Box>
      <AppBar position="fixed" color="primary" sx={{ top: "auto", bottom: 0 }}>
        <Toolbar
          variant="dense"
          sx={{
            backgroundColor: "black",
            display: "flex",
            justifyContent: "space-around",
          }}
        >
          {showWaterTemp({
            tankDetails: tankData,
            currentTemp: currentTemp ?? 0,
            onRefresh: handleUpdateTemp,
          })}
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default TankTempBar;
