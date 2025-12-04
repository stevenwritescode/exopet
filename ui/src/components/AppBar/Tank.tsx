import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WarningIcon from "@mui/icons-material/Warning";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import { useEffect, useState } from "react";
import { Button, Icon, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { Tank } from "aquario-models";

interface TankAppBarProps {
  tankDetails?: Partial<Tank>;
  currentTemp: number | null;
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

export const showWaterTemp: React.FC<TankAppBarProps> = ({
  tankDetails,
  currentTemp,
}: TankAppBarProps) => {
  const lower_temp_limit = tankDetails?.settings?.lower_temp_limit || 25,
    upper_temp_limit = tankDetails?.settings?.upper_temp_limit || 30;
  if (currentTemp) {
    const currentTempC = Math.round(currentTemp);
    const currentTempF = Math.round(currentTemp * 1.8 + 32);
    const danger = dangerLevel({
      currentTemp,
      lower_temp_limit,
      upper_temp_limit,
    });
    return (
      <Button
        sx={{
          alignItems: "middle",
          color: temperatureGaugeColor({
            currentTemp,
            lower_temp_limit,
            upper_temp_limit,
          }),
        }}
      >
        {(currentTemp > upper_temp_limit || currentTemp < lower_temp_limit) && (
          <WarningIcon htmlColor="yellow" />
        )}
        <Typography
          color={danger == "ideal" ? "lime" : "yellow"}
          fontSize={8}
          sx={{ ml: 1, mr: 1, mt: 0.25 }}
        >
          {danger}
        </Typography>
        <ThermostatIcon />
        <strong>{currentTempC}°C</strong>&nbsp;&nbsp;/&nbsp;&nbsp;
        <strong>{currentTempF}°F</strong>
      </Button>
    );
  } else {
    return (
      <Button sx={{ alignItems: "middle" }}>
        <ThermostatIcon htmlColor="white" />
        <WarningIcon color="warning" />
      </Button>
    );
  }
};

export const TankAppBar: React.FC<TankAppBarProps> = ({
  tankDetails,
  currentTemp,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
  }, []);

  return (
    <Box>
      <AppBar position="static">
        <Toolbar variant="dense" sx={{ backgroundColor: "black" }}>
          <Box
            sx={{
              flex: "0 1 33.3%",
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <Link to="/tanks">
              <Button size="large" sx={{ mr: 2, color: "white" }}>
                <ArrowLeftIcon />
                <Typography variant="button" component="div">
                  Tanks
                </Typography>
              </Button>
            </Link>
          </Box>
          <Box
            sx={{
              flex: "0 1 33.3%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Typography variant="button" component="div" textAlign={"center"}>
              {tankDetails?.name}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: "0 0 33.3%",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button sx={{ alignItems: "middle", color: "white" }}>
              {currentTime.toLocaleTimeString()}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default TankAppBar;
