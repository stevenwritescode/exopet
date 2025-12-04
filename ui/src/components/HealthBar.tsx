import React from "react";
import Button from "@mui/material/Button";
import { Card } from "@mui/material";
import { styled } from "@mui/material/styles";
import { DateTime } from "luxon";
import { Label } from "@mui/icons-material";
import { Animal } from "aquario-models";

const BlinkingButton = styled(Button)({
  animation: "$blink 1s linear infinite",
  "@keyframes blink": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0 },
    "100%": { opacity: 1 },
  },
});

interface AnimalHealthBarProps {
  animal: Animal;
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
    return "error";
  } else if (diff > 43200) {
    return "success";
  } else {
    return "warning";
  }
};

const AnimalHealthBar: React.FC<AnimalHealthBarProps> = ({ animal }) => {
  return (
    <div>
      <Card>
        <Card sx={{ display: "flex" }}>
          <Label>Health</Label>
        </Card>
      </Card>
    </div>
  );
};

export default AnimalHealthBar;
