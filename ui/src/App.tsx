import { useState } from "react";
import "./App.css";

import { ThemeProvider } from "@emotion/react";
import theme from "./theme";
import CssBaseline from "@mui/material/CssBaseline";
import { Stack } from "@mui/material";
import TankList from "./views/TankList";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TankDetail from "./views/TankDetail";
import AnimalList from "./views/AnimalList";
import AnimalDetail from "./views/AnimalDetail";
import Home from "./views/Home";

function App() {
  const [nextWaterChange, setNextWaterChange] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drainDuration, setDrainDuration] = useState<number>(0);
  const [fillDuration, setFillDuration] = useState<number>(0);

  const handleSettingsSave = (
    newDrainDuration: number,
    newFillDuration: number
  ) => {
    setDrainDuration(newDrainDuration);
    setFillDuration(newFillDuration);
    // Additional logic for handling settings change
  };

  const currentTemp = 17;
  const dailyHigh = 18;
  const dailyLow = 16;
  const allTimeHigh = 18;
  const allTimeLow = 16;

  const handleScheduleChange = (day: number, time: string) => {
    const currentTime = new Date();
    const nextChange = new Date();

    nextChange.setDate(
      currentTime.getDate() + ((7 + day - currentTime.getDay()) % 7)
    );
    const [hours, minutes] = time.split(":").map(Number);
    nextChange.setHours(hours, minutes, 0, 0);

    // If the calculated time is in the past, schedule it for the next week
    if (nextChange <= currentTime) {
      nextChange.setDate(nextChange.getDate() + 7);
    }

    setNextWaterChange(nextChange);
  };

  return (
    <Stack sx={{ width: "100%" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Add CssBaseline here */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tanks" element={<TankList />} />
          <Route path="/animals" element={<AnimalList />} />
          <Route path="/tank/:tank_id" element={<TankDetail />} />
          <Route path="/animal/:animal_id" element={<AnimalDetail />} />
        </Routes>
      </ThemeProvider>
    </Stack>
  );
}

export default App;
