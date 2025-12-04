import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { CardHeader } from "@mui/material";

interface ConditionsDisplayProps {
  currentTemp: number;
  dailyHigh: number;
  dailyLow: number;
  allTimeHigh: number;
  allTimeLow: number;
}

interface TempCardProps {
  label: string;
  value: number;
  backgroundColor?: string;
  fullWidth?: boolean; // New prop to indicate if the card should take full width
}

const TempCard: React.FC<TempCardProps> = ({
  label,
  value,
  backgroundColor = "#424242", // Default to a darker color for dark mode
  fullWidth = false,
}) => (
  <Grid
    item
    xs={fullWidth ? 12 : 6}
    sm={fullWidth ? 12 : 6}
    md={fullWidth ? 12 : 3}
  >
    <Card sx={{ width: "100%", backgroundColor }}>
      <CardContent sx={{ textAlign: "center" }}>
        {" "}
        {/* Centering text */}
        <Typography color="textPrimary" gutterBottom variant="h6">
          {label}
        </Typography>
        <Typography variant="h4" component="div" color="textSecondary">
          {value}°C
        </Typography>
      </CardContent>
    </Card>
  </Grid>
);

const getTemperatureColor = (temperature: number): string => {
  if (temperature < 16) return "#1976d2"; // Blue for cold
  if (temperature > 18) return "#d32f2f"; // Red for hot
  return "#388e3c"; // Green for ideal
};

const ConditionsDisplay: React.FC<ConditionsDisplayProps> = ({
  currentTemp,
  dailyHigh,
  dailyLow,
  allTimeHigh,
  allTimeLow,
}) => {
  return (
    <Card>
      <CardHeader
        title="Water Conditions"
        titleTypographyProps={{ variant: "h6" }}
      />
      <CardContent>
        <Grid container>
          <Grid item sm={4}>
            <TempCard
              label="Temp"
              value={currentTemp}
              backgroundColor={getTemperatureColor(currentTemp)}
              fullWidth
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ConditionsDisplay;
