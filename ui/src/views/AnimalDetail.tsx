import React, { useEffect, useState } from "react";
import { Avatar, Box, Card, Stack, Typography } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { getAnimalDetails } from "../dal/Animal.dal";
import { getTankDetails } from "../dal/Tank.dal";
import { initWebSocket, onMessage } from "../dal/Maintenance.dal";
import { styled } from "@mui/material/styles";
import AnimalAppBar from "../components/AppBar/Animal";
import FeedingDialog from "../components/FeedingDialog";
import DescriptionIcon from "@mui/icons-material/Description";
import LunchDiningIcon from "@mui/icons-material/LunchDining";
import ClockIcon from "@mui/icons-material/PunchClock";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import tempImage from "../assets/axie-cakepop.jpg";
import { addFeedingLog } from "../dal/Log.dal";
import FeedingLogs from "../components/FeedingLogs";
import TankTempBar from "../components/AppBar/TankTemp";
import { Animal, Log, Tank, System } from "aquario-models";
import { DateTime } from "luxon";

interface AnimalProps {
  animal?: Animal;
  logs?: any[];
}

const Item = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1),
  textAlign: "center",
  lineHeight: "1",
}));

const PulseBox = styled(Box)(({ theme }) => ({
  animation: "pulse 2s infinite",
  borderRadius: "15px",
  "@keyframes pulse": {
    "0%": { boxShadow: "0 0 0 0 rgba(0, 255, 0, 0.4)" },
    "70%": { boxShadow: "0 0 0 20px rgba(0, 255, 0, 0)" },
    "100%": { boxShadow: "0 0 0 0 rgba(0, 255, 0, 0)" },
  },
}));

const AnimalDetail: React.FC<AnimalProps> = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [latestFeeding, setLatestFeeding] = useState<Log | null>(null);
  const [feedingDialog, toggleFeedingDialog] = useState(false);
  const [feedingLogDialog, toggleFeedingLog] = useState(false);
  const [tankDetails, setTankDetails] = useState<Tank>({
    id: "",
    service_status: 0,
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
  const [animalDetails, setAnimalDetails] = useState<{ animal: Animal; logs?: any[] }>({
    animal: {
      id: "",
      tank_id: "",
      name: "",
      species: "",
      species_latin: "",
      last_feeding_log: {
        timestamp: new Date().toISOString(),
        log_type: "null",
        log_json: "{}",
      },
    },
    logs: [],
  });

  const animal_id = useParams<{ animal_id: string }>().animal_id!;
  const navigate = useNavigate();

  const FEEDING_OK_HOURS = 48;
  const FEEDING_URGENT_HOURS = 72;

  const fetchAnimal = async () => {
    try {
      const data = await getAnimalDetails(animal_id);
      setAnimalDetails(data);
      setLatestFeeding(data.logs[0] || null);
      if (data.animal.enclosure_id) {
        const tank = await getTankDetails(data.animal.enclosure_id);
        setTankDetails(tank);
      }
    } catch (error) {
      console.error("Failed to fetch animal details:", error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchAnimal();

    initWebSocket();
    onMessage((evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.action === System.ParameterUpdate.TEMPERATURE) {
        setCurrentTemp(msg.data.average);
      }
    });

    return () => clearInterval(timer);
  }, [animal_id]);

  const lastFedTime = latestFeeding
    ? DateTime.fromSQL(latestFeeding.timestamp, { zone: "utc" }).toLocal()
    : null;
  const feedingDiffHours = lastFedTime
    ? DateTime.now().diff(lastFedTime, "hours").hours
    : Infinity;

  const canFeed = feedingDiffHours >= FEEDING_OK_HOURS;
  const urgentToFeed = feedingDiffHours >= FEEDING_URGENT_HOURS;
  const feedLabel = !latestFeeding ? "FEED!" : feedingDiffHours < FEEDING_OK_HOURS ? "FED" : "FEED!";

  const handleFeedClick = () => toggleFeedingDialog(!feedingDialog);
  const handleLogsClick = () => toggleFeedingLog(!feedingLogDialog);
  const goToTankDetail = () => {
    if (animalDetails.animal.enclosure_id) {
      navigate(`/tank/${animalDetails.animal.enclosure_id}`);
    }
  };

  const addLog = async (log_json: string) => {
    await addFeedingLog({
      animal_id,
      action_type: "Feeding",
      container_id: animalDetails.animal.tank_id,
      log_json,
    });
    await fetchAnimal();
  };

  return (
    <>
      <AnimalAppBar animalDetails={animalDetails.animal} />
      <FeedingLogs
        animalDetails={animalDetails.animal}
        logs={animalDetails.logs}
        open={feedingLogDialog}
        onClose={() => toggleFeedingLog(false)}
        onLogDeleted={() => fetchAnimal()}
      />
      <FeedingDialog
        animalDetails={animalDetails.animal}
        open={feedingDialog}
        onClose={() => toggleFeedingDialog(false)}
        onSave={addLog}
      />
      <Stack direction="row" justifyContent="space-around" alignItems="flex-start" height="100%">
        <Stack spacing={2} direction="column" alignItems="center" flexGrow={1} p={3}>
          <Typography variant="button" fontSize={28} textAlign="center">
            {animalDetails.animal.name}
          </Typography>
          <Avatar src={tempImage} sx={{ width: 128, height: 128 }} />
          <Typography variant="button" fontSize={18} color="grey" textAlign="center">
            {animalDetails.animal.species}
          </Typography>
          <Typography fontSize={18} fontStyle="italic" color="grey" textAlign="center">
            {animalDetails.animal.species_latin}
          </Typography>
          <Item variant="button">{animalDetails.animal.notes}</Item>
        </Stack>
        <Stack spacing={2} direction="column" p={3} alignItems="center">
          <Card onClick={goToTankDetail} sx={{ p: 1, borderRadius: 2, cursor: 'pointer', width: 200 }}>
            <Typography variant="button" fontSize={10} display="flex" justifyContent="center" alignItems="center">
              <BuildCircleIcon sx={{ mr: 1 }} />Tank Maintenance
            </Typography>
          </Card>
          <Card sx={{ p: 1, borderRadius: 2, cursor: 'pointer', width: 200 }} onClick={handleLogsClick}>
            <Typography variant="button" fontSize={12} display="flex" justifyContent="center" alignItems="center">
              <DescriptionIcon sx={{ mr: 1 }} />View Feeding Logs
            </Typography>
          </Card>
          {urgentToFeed ? (
            <PulseBox>
              <Card onClick={handleFeedClick} sx={{ p: 3, borderRadius: 2, bgcolor: 'green', cursor: 'pointer', width: 200 }}>
                <Typography variant="button" fontSize={24} display="flex" justifyContent="center" alignItems="center">
                  <LunchDiningIcon sx={{ mr: 1, fontSize: 48 }} />{feedLabel}
                </Typography>
              </Card>
            </PulseBox>
          ) : (
            <Card onClick={() => canFeed && handleFeedClick()} sx={{ p: 3, borderRadius: 2, bgcolor: canFeed ? 'green' : '#888', opacity: canFeed ? 1 : 0.6, cursor: canFeed ? 'pointer' : 'default', width: 200 }}>
              <Typography variant="button" fontSize={24} display="flex" justifyContent="center" alignItems="center">
                <LunchDiningIcon sx={{ mr: 1, fontSize: 48 }} />{feedLabel}
              </Typography>
            </Card>
          )}
          <Typography variant="button" fontSize={12} display="flex" justifyContent="center" alignItems="center" sx={{ color: urgentToFeed ? '#faa' : canFeed ? '#afa' : '#999', width: 200 }} onClick={handleFeedClick}>
            <ClockIcon sx={{ mr: 1 }} />
            {!latestFeeding
              ? `${animalDetails.animal.name} has not been fed yet.`
              : urgentToFeed
              ? 'Needs to be fed ASAP!'
              : canFeed
              ? 'Ready for feeding.'
              : 'Recently fed.'}
            {latestFeeding &&
              ` Ate ${latestFeeding.log_json.quantity} ${latestFeeding.log_json.food_type}${latestFeeding.log_json.quantity > 1 ? 's' : ''} at ${DateTime.fromSQL(latestFeeding.timestamp, { zone: 'utc' }).toLocal().toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)}`}
          </Typography>
        </Stack>
        {tankDetails.id && <TankTempBar tankDetails={tankDetails} />}      
      </Stack>
    </>
  );
};

export default AnimalDetail;
