import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import * as logsDal from "../dal/Log.dal";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
} from "@mui/material";
import { Animal } from "aquario-models";

interface AnimalLogProps {
  tank_id: string | number;
  animals?: Animal[];
}

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const QuickFeedLog: React.FC<AnimalLogProps> = ({}) => {
  const [foodType, setFoodType] = useState<string | null>(null);
  const [animal_id, setAnimalId] = useState<string | number | null>(null);
  const [feedingPrompt, setFeedingPrompt] = useState<boolean>(false);

  const handleSubmit = (foodType: string) => {
    console.log("Log Feeding");
    // logsDal.addFeedingLog(foodType);
  };
  const handleClose = () => {
    console.log("Log Feeding");
    // logsDal.addFeedingLog(foodType);
    setFeedingPrompt(false);
  };

  const handleGetFoodType = () => {
    console.log("Request Food Type");
    setFeedingPrompt(true);
  };

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
            handleClose();
          },
        }}
      >
        <DialogTitle>Feed Animal</DialogTitle>
        <DialogContent>
          <DialogContentText>
            What did you feed your animal?
          </DialogContentText>
          <DialogContentText>
            <TextField
              select
              label="Food Type"
              value={foodType}
              onChange={(event) => setFoodType(event.target.value)}
              fullWidth // Make the select box full width
              style={{ marginBottom: 0, marginTop: 16 }}
            >
              {["Pellets", "Live Food"].map((day) => (
                <MenuItem key={day} value={day}>
                  {day}
                </MenuItem>
              ))}
            </TextField>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button type="submit" variant="contained" color="success" fullWidth>
            Feed
          </Button>
          <Button variant="outlined" onClick={handleClose} fullWidth>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      <Button
        variant="contained"
        color="primary"
        onClick={handleGetFoodType}
        fullWidth
      >
        FEED ANIMAL
      </Button>
    </div>
  );
};

export default QuickFeedLog;
