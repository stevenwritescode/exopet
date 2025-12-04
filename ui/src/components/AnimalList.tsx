import React, { useState } from "react";
import Button from "@mui/material/Button";
import * as logsDal from "../dal/Log.dal";
import hiAxie from "../assets/axie-hi.png";
import LunchDiningIcon from "@mui/icons-material/LunchDining";

import {
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { DateTime } from "luxon";
import { Animal } from "aquario-models";

const BlinkingButton = styled(Button)({
  animation: "$blink 1s linear infinite",
  "@keyframes blink": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0 },
    "100%": { opacity: 1 },
  },
});

interface AnimalListProps {
  animals: Animal[];
}

// const daysOfWeek = [
//   "Sunday",
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
// ];

const getRelativeTime = (date?: string) => {
  if (!date) {
    return "Never";
  }
  // use luxon to get relative time string
  const dt = DateTime.fromSQL(date);
  return dt.toRelative();
};

const getSeconds = (date?: string) => {
  if (!date) {
    return 0;
  }
  // use luxon to get relative time string
  const dt = DateTime.fromSQL(date);
  const now = DateTime.now().toSeconds();
  return now - dt.toSeconds();
};

const getFeedButtonColor = (lastFeedDate?: string) => {
  if (!lastFeedDate) {
    return "error";
  }
  // use luxon to get relative time string
  const dt = DateTime.fromSQL(lastFeedDate);
  const now = DateTime.now().toSeconds();
  const diff = now - dt.toSeconds();
  if (diff > 86400) {
    return "success";
  } else if (diff > 43200) {
    return "warning";
  } else {
    return "error";
  }
};

const AnimalList: React.FC<AnimalListProps> = ({ animals }) => {
  const [foodType, setFoodType] = useState<string | null>(null);
  const [feedingPrompt, setFeedingPrompt] = useState<boolean>(false);
  const [selectedAnimal, selectAnimal] = useState<string | null>(null);

  if (!animals) {
    animals = [];
  }

  const handleSubmit = (food_type: string) => {
    console.log("Log Feeding");
    const container_id = animals?.find(
      (animal) => animal.id === selectedAnimal
    )?.tank_id;
    if (!selectedAnimal) {
      return;
    }
    logsDal.addFeedingLog({
      action_type: "Feeding",
      animal_id: selectedAnimal,
      container_id,
      log_json: `{"food_type": ${food_type}}`,
    });
  };
  const handleClose = () => {
    console.log("Log Feeding");
    setFeedingPrompt(false);
  };

  const handleGetFoodType = (animalId?: string) => {
    console.log("Request Food Type");
    if (!animalId) return;
    selectAnimal(animalId);
    setFeedingPrompt(true);
  };

  const selectedAnimalName = animals.find(
    (animal) => animal.id === selectedAnimal
  )?.name;

  return (
    <div>
      <Dialog
        open={feedingPrompt}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries((formData as any).entries());
            const email = formJson.email;
            console.log(email);
            handleSubmit(foodType || "");
            handleClose();
          },
        }}
      >
        <DialogTitle>Feed Animal</DialogTitle>
        <DialogContent>
          <DialogContentText>
            What did you feed {selectedAnimalName || "your animal"}?
          </DialogContentText>
          <DialogContent>
            <ToggleButtonGroup value={foodType}>
              {["Pellets", "Live Food", "Other"].map((food) => (
                <ToggleButton value={food} onClick={() => setFoodType(food)}>
                  {food}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </DialogContent>
        </DialogContent>
        <DialogActions>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ color: "white", backgroundColor: "darkorange" }}
          >
            Log Feeding
          </Button>
        </DialogActions>
      </Dialog>
      <Card>
        <CardHeader title="Animals" titleTypographyProps={{ variant: "h6" }} />
        {animals.map((animal) => (
          <React.Fragment>
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                paddingBottom: 0,
                paddingTop: "16px",
              }}
            >
              <img
                src={hiAxie}
                alt="Axie"
                style={{ width: "50px", height: "auto" }}
              />
              <BlinkingButton
                color={getFeedButtonColor(animal?.last_feeding_log?.timestamp)}
                variant="contained"
                onClick={() => handleGetFoodType(animal.id)}
                size="large"
              >
                <LunchDiningIcon />
              </BlinkingButton>
            </CardContent>
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "start",
                justifyContent: "end",
              }}
            >
              <Typography
                variant="button"
                style={{ textAlign: "left", padding: 0 }}
              >
                <strong>Name:</strong> {animal?.name}
              </Typography>
              <Typography
                variant="button"
                style={{ textAlign: "left", padding: 0 }}
              >
                <strong>Species:</strong> {animal?.species}
              </Typography>
              <Typography
                variant="button"
                style={{ textAlign: "left", padding: 0 }}
              >
                <strong>Last Fed:</strong>{" "}
                {getRelativeTime(animal?.last_feeding_log?.timestamp)}
              </Typography>
            </CardContent>
          </React.Fragment>
        ))}
      </Card>
    </div>
  );
};

export default AnimalList;
