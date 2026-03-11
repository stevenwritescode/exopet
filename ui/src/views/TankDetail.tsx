import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, IconButton, Stack, Typography } from "@mui/material";
import SettingsDialog from "../components/SettingsDialog";
import { useParams } from "react-router-dom";
import {
  getAnimalsForTank,
  getLogsForTank,
  getTankDetails,
  updateTankSettings,
} from "../dal/Tank.dal";
import { styled } from "@mui/material/styles";
import TankAppBar from "../components/AppBar/Tank";
import {
  initWebSocket,
  onMessage,
  onConnectionChange,
  sendMessage,
  runWaterChange,
  fillTank,
  drainTank,
  reset,
} from "../dal/Maintenance.dal";
import CircularProgress from "@mui/material/CircularProgress";
import { Animal, System, Tank, TankSettings } from "aquario-models";
import tempImage from "../assets/axie-cakepop.jpg";
import TankTempBar from "../components/AppBar/TankTemp";
import SettingsIcon from "@mui/icons-material/Settings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import OpacityIcon from "@mui/icons-material/Opacity";

interface TankProps {
  tank_id?: string | number;
  animals?: Animal[];
  logs?: any[];
}

const Item = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1),
  textAlign: "center",
  lineHeight: "1",
}));

const TankDetail: React.FC<TankProps> = () => {
  const navigate = useNavigate();

  // WebSocket connection state
  const [wsConnected, setWsConnected] = useState(false);

  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [serviceStatus, setStatus] = useState(System.State.IDLE);
  const serviceStatusRef = useRef(serviceStatus);
  const [waterChangeInProgress, setWaterChangeState] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tankSettings, setTankSettings] = useState<TankSettings>({});
  const [tankAnimals, setTankAnimals] = useState<Animal[]>([]);
  const [tankLogs, setTankLogs] = useState<any[]>([]);
  const [waterChangeProgress, setWaterChangeProgress] = useState(0);
  const [drainProgress, setDrainProgress] = useState(0);
  const [fillProgress, setFillProgress] = useState(0);
  const fillProgressRef = useRef(fillProgress);
  const drainProgressRef = useRef(drainProgress);
  const waterChangeProgressRef = useRef(waterChangeProgress);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [tankDetails, setTankDetails] = useState<Tank>({
    id: "",
    service_status: System.State.IDLE,
    settings: {
      volume: 0,
      vol_unit: "gallons",
      drain_time: 0,
      fill_time: 0,
      res_fill_time: 0,
      has_reservoir: false,
      lower_temp_limit: 0,
      upper_temp_limit: 0,
    },
  });
  const [waterFull, setWaterFull] = useState(false);
  const tank_id = useParams<{ tank_id: string }>().tank_id;

  // send a WS request to check the float switch
  const handleCheckWaterLevel = () => {
    sendMessage({
      action: System.ParameterCheck.WATER_LEVEL,
      data: { tank_id },
    });
  };

  // send a cancel job request
  const handleCancel = () => {
    setCancelInProgress(true);
    sendMessage({
      action: System.ServiceRequest.CANCEL_WATER_CHANGE,
      data: { tank_id },
    });
  };

  // keep refs up‑to‑date for your progress loop
  useEffect(() => {
    serviceStatusRef.current = serviceStatus;
    fillProgressRef.current = fillProgress;
    drainProgressRef.current = drainProgress;
    waterChangeProgressRef.current = waterChangeProgress;
  }, [serviceStatus, drainProgress, fillProgress, waterChangeProgress]);

  // MAIN EFFECT: init WS, subscribe, start polls & data loads
  useEffect(() => {
    // 1) Start (and auto‑reconnect) the socket and track connection
    initWebSocket();
    onConnectionChange(setWsConnected);

    // 2) Subscribe to messages
    onMessage((event) => {
        const msg = JSON.parse(event.data);
        switch (msg.action) {
          case System.ParameterUpdate.WATER_LEVEL:
            setWaterFull(!!msg.data.waterFull);
            break;
          case System.ParameterUpdate.TEMPERATURE:
            setCurrentTemp(msg.data.average);
            break;
          case System.ServiceUpdate.WATER_CHANGE_COMPLETE:
            setStatus(System.State.IDLE);
            setWaterChangeState(false);
            setWaterChangeProgress(100);
            break;
          case System.ServiceUpdate.FILL_COMPLETE:
            setStatus(System.State.IDLE);
            break;
          case System.ServiceUpdate.DRAIN_COMPLETE:
            setStatus(System.State.IDLE);
            break;
          case System.ServiceUpdate.WATER_CHANGE_BEGAN:
            setWaterChangeState(true);
            setWaterChangeProgress(0);
            break;
          case System.ServiceUpdate.FILL_BEGAN:
            setStatus(
              waterChangeInProgress
                ? System.State.WATER_CHANGE_FILLING_TANK
                : System.State.FILLING_TANK
            );
            setFillProgress(0);
            break;
          case System.ServiceUpdate.DRAIN_BEGAN:
            setStatus(
              waterChangeInProgress
                ? System.State.WATER_CHANGE_DRAINING
                : System.State.DRAINING
            );
            setDrainProgress(100);
            break;
          case System.ServiceUpdate.STATE_RESET:
            setStatus(System.State.IDLE);
            setCancelInProgress(false);
            break;
        }
    });

    // 3) Fire initial checks & start intervals
    handleCheckWaterLevel();
    const levelIv = setInterval(handleCheckWaterLevel, 5000);

    const svcIv = setInterval(() => {
      const s = serviceStatusRef.current;
      if (s === System.State.WATER_CHANGE_DRAINING) {
        const dt = tankDetails.settings.drain_time || 1;
        setDrainProgress((d) => d - (100 / dt) * 2);
      } else if (s === System.State.WATER_CHANGE_FILLING_TANK) {
        const ft = tankDetails.settings.fill_time || 1;
        setFillProgress((f) => f + 100 / ft / 2);
      } else if (s === System.State.FILLING_TANK) {
        const ft = tankDetails.settings.fill_time || 1;
        setFillProgress((f) => f + 100 / ft / 2);
      } else if (s === System.State.DRAINING) {
        const dt = tankDetails.settings.drain_time || 1;
        setDrainProgress((d) => d - 100 / dt / 2);
      } else {
        setWaterChangeState(false);
        setDrainProgress(0);
        setFillProgress(0);
      }
    }, 500);

    // 4) Load initial data
    getTankDetails(tank_id).then((d) => {
      setTankDetails(d);
      setStatus(d.service_status);
    });
    getAnimalsForTank(tank_id).then(setTankAnimals);
    getLogsForTank(tank_id).then(setTankLogs);

    return () => {
      clearInterval(levelIv);
      clearInterval(svcIv);
    };
  }, [tank_id]);

  const openAnimalPage = (animal_id?: string) =>
    navigate(`/animal/${animal_id}`);

  const handleSettingsSave = (settings: TankSettings) => {
    const s = { ...tankDetails.settings, ...settings };
    setTankSettings(s);
    updateTankSettings({ ...tankDetails, settings: s });
  };

  const handleWaterChange = () => runWaterChange({ tank_id });
  const handleFillTank = () => fillTank({ tank_id });
  const handleDrainTank = () => drainTank({ tank_id });

  return (
    <>
      <SettingsDialog
        open={settingsOpen}
        settings={tankDetails.settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      <TankAppBar tankDetails={tankDetails} currentTemp={currentTemp} />

      {/* Connection Status Indicator */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2 }}>
        <Typography variant="button">WebSocket:</Typography>
        <Button
          size="small"
          variant="text"
          startIcon={
            wsConnected ? (
              <CheckCircleIcon color="success" />
            ) : (
              <CancelIcon color="error" />
            )
          }
        >
          {wsConnected ? "Connected" : "Disconnected"}
        </Button>
      </Stack>

      {/* Animals */}
      <Stack direction="column" justifyContent="center">
        <Item variant="button">Animals</Item>
        <Stack
          spacing={2}
          direction="row"
          justifyContent="center"
          sx={{ p: 2, color: "#aabbff" }}
        >
          {tankAnimals.length ? (
            tankAnimals.map((a) => (
              <Button
                key={a.id}
                variant="outlined"
                color="inherit"
                onClick={() => openAnimalPage(a.id)}
              >
                <Avatar src={tempImage} sx={{ width: 48, height: 48, mr: 2 }} />
                {a.name}
              </Button>
            ))
          ) : (
            <Item variant="button">No animals in this tank</Item>
          )}
        </Stack>
      </Stack>

      {/* Maintenance controls */}
      <Stack direction="column" justifyContent="center">
        <Item variant="button">
          Maintenance{" "}
          <IconButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Item>
        {/* Water change / fill / drain buttons */}
        <Stack spacing={2} direction="row" sx={{ p: 2, color: "#aabbff" }}>
          <Button
            fullWidth
            size="large"
            variant={
              serviceStatus > System.State.IDLE && !waterChangeInProgress
                ? "contained"
                : "outlined"
            }
            onClick={handleWaterChange}
            disabled={serviceStatus > System.State.IDLE}
          >
            {waterChangeInProgress && (
              <CircularProgress
                size={20}
                sx={{ mr: 2, color: "#aa00aa" }}
                variant="determinate"
                value={waterChangeProgress}
              />
            )}
            {waterChangeInProgress ? "Changing Water" : "Change Water"}
          </Button>
          <Button
            fullWidth
            size="large"
            variant={
              serviceStatus !== System.State.FILLING_TANK &&
              serviceStatus > System.State.IDLE
                ? "contained"
                : "outlined"
            }
            onClick={handleFillTank}
            disabled={serviceStatus > System.State.IDLE}
          >
            {serviceStatus === System.State.FILLING_TANK && (
              <CircularProgress
                size={20}
                sx={{ mr: 2 }}
                variant="determinate"
                value={fillProgress}
              />
            )}
            {serviceStatus === System.State.FILLING_TANK
              ? "Filling Tank"
              : "Fill Tank"}
          </Button>
          <Button
            fullWidth
            size="large"
            variant={
              serviceStatus !== System.State.DRAINING &&
              serviceStatus > System.State.IDLE
                ? "contained"
                : "outlined"
            }
            onClick={handleDrainTank}
            disabled={serviceStatus > System.State.IDLE}
          >
            {serviceStatus === System.State.DRAINING && (
              <CircularProgress
                size={20}
                sx={{ mr: 2 }}
                variant="determinate"
                value={drainProgress}
              />
            )}
            {serviceStatus === System.State.DRAINING
              ? "Draining Tank"
              : "Drain Tank"}
          </Button>
        </Stack>
        {serviceStatus > System.State.IDLE && (
          <Button
            fullWidth
            size="large"
            variant="contained"
            color="inherit"
            onClick={handleCancel}
            disabled={cancelInProgress}
            sx={{ m: 2 }}
          >
            {cancelInProgress ? (
              <CircularProgress size={20} sx={{ mr: 2, color: "#999" }} />
            ) : null}
            {cancelInProgress ? "Cancelling..." : "Cancel Job"}
          </Button>
        )}
      </Stack>

      {/* Temp & float-switch bar */}
      {tankDetails.id && <TankTempBar tankDetails={tankDetails} />}

      {/* Water level indicator */}
      <Stack
        direction="row"
        justifyContent="center"
        alignItems="center"
        spacing={1}
        sx={{ mt: 2 }}
      >
        <Typography variant="button">Water Level:</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={
            waterFull ? (
              <CheckCircleIcon color="success" />
            ) : (
              <OpacityIcon color="primary" />
            )
          }
          onClick={handleCheckWaterLevel}
        >
          {waterFull ? "Full" : "Not Full"}
        </Button>
      </Stack>
    </>
  );
};

export default TankDetail;
