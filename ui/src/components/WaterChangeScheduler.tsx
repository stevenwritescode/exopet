import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

interface WaterChangeSchedulerProps {
  onScheduleChange: (day: number, time: string) => void;
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

const WaterChangeScheduler: React.FC<WaterChangeSchedulerProps> = ({
  onScheduleChange,
}) => {
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const handleDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDay(event.target.value);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(event.target.value);
  };

  const handleSubmit = () => {
    const dayIndex = daysOfWeek.indexOf(selectedDay);
    if (dayIndex > -1 && selectedTime) {
      onScheduleChange(dayIndex, selectedTime);
    }
  };

  return (
    <div>
      <TextField
        select
        label="Day of the Week"
        value={selectedDay}
        onChange={handleDayChange}
        fullWidth // Make the select box full width
        style={{ marginBottom: 8 }}
      >
        {daysOfWeek.map((day) => (
          <MenuItem key={day} value={day}>
            {day}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Time"
        type="time"
        value={selectedTime}
        onChange={handleTimeChange}
        InputLabelProps={{
          shrink: true,
        }}
        inputProps={{
          step: 300, // 5 minutes
        }}
        fullWidth // Make the time input full width
        style={{ marginBottom: 8 }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        fullWidth
      >
        Set Weekly Schedule
      </Button>
      <Button variant="contained" fullWidth color="secondary">
        Run Water Change
      </Button>
    </div>
  );
};

export default WaterChangeScheduler;
