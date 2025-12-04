import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Slider from "@mui/material/Slider";
import { TankSettings } from "aquario-models";
import { Switch } from "@mui/material";

interface SettingsDialogProps {
  open: boolean;
  settings: TankSettings;
  onClose: () => void;
  onSave: (settings: TankSettings) => void;
}

// Function to format seconds into minutes and seconds
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  settings,
  onClose,
  onSave,
}) => {
  const [drain_time, setDrainTime] = useState(0);
  const [fill_time, setFillTime] = useState(0);
  const [has_reservoir, setHasReservoir] = useState(false);

  useEffect(() => {
    setDrainTime(settings.drain_time || 0);
    setFillTime(settings.fill_time || 0);
    setHasReservoir(settings.has_reservoir || false);
  }, [settings]);

  const handleSave = () => {
    onSave({ drain_time, fill_time, has_reservoir });
    onClose();
  };
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Tank Settings
          </Typography>
          <Button autoFocus color="inherit" onClick={handleSave}>
            Save
          </Button>
        </Toolbar>
      </AppBar>
      <List>
        <ListItem>
          <div>
            <Typography gutterBottom>Drain Duration:</Typography>
            <Typography gutterBottom>{formatTime(drain_time)}</Typography>
          </div>
          <Slider
            value={drain_time}
            onChange={(e, newValue) => setDrainTime(newValue as number)}
            step={5}
            min={0}
            max={1200} // Up to 10 minutes
            valueLabelFormat={formatTime}
            valueLabelDisplay="auto"
          />
        </ListItem>
        <Divider />
        <ListItem>
          <div>
            <Typography gutterBottom>Fill Duration:</Typography>
            <Typography gutterBottom>{formatTime(fill_time)}</Typography>
          </div>
          <Slider
            value={fill_time}
            onChange={(e, newValue) => setFillTime(newValue as number)}
            step={5}
            min={0}
            max={1200} // Up to 20 minutes
            valueLabelFormat={formatTime}
            valueLabelDisplay="auto"
          />
        </ListItem>
        <Divider />
        <ListItem>
          <Typography gutterBottom>Reservoir Mode:</Typography>
          <Switch
            name="has_reservoir"
            checked={has_reservoir}
            onChange={(e, newValue) => setHasReservoir(newValue)}
          />
        </ListItem>        
        <Divider />
      </List>
    </Dialog>
  );
};

export default SettingsDialog;
