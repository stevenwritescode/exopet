import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Card, Grid } from "@mui/material";
import { Animal } from "aquario-models";
import { DateTime } from "luxon";
import DeleteIcon from "@mui/icons-material/Delete";
import { deleteFeedingLog } from "../dal/Log.dal"; // adjust path as needed

interface FeedingLogProps {
  open: boolean;
  animalDetails: Animal;
  logs?: any[];
  onClose: () => void;
  onLogDeleted?: () => void; // new prop
}

// Function to format seconds into minutes and seconds
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const FeedingLogs: React.FC<FeedingLogProps> = ({
  open,
  animalDetails,
  logs,
  onClose,
  onLogDeleted,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handleDeleteLog = async (logId: string) => {
  if (window.confirm("Are you sure you want to delete this feeding log?")) {
    await deleteFeedingLog(logId);
    onLogDeleted?.();
  }
};


  return (
    <Dialog open={open} onClose={handleClose} fullScreen>
      <AppBar sx={{ position: "relative" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box justifySelf={"flex-start"} flex={"33.3% 0 1"}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography
            sx={{
              textAlign: "center",
              alignSelf: "center",
              justifySelf: "center",
            }}
            variant="h6"
            component="div"
          >
            Feeding Logs
          </Typography>
          <Box justifySelf="flex-end" flex={"33.3% 0 1"}>
            <Typography
              sx={{ textAlign: "right" }}
              variant="button"
              component="div"
            >
              {currentTime.toLocaleTimeString()}
            </Typography>
          </Box>
          {/* <Button autoFocus color="inherit" onClick={handleSave}>
            Save
          </Button> */}
        </Toolbar>
      </AppBar>
      <div>
        <Typography
          sx={{ mt: 1, mb: 1 }}
          variant="h6"
          component="div"
          align="center"
        >
          {animalDetails.name}
        </Typography>
        <div
          style={{
            overflowY: "auto",
            height: "275px",
          }}
        >
          {logs &&
            logs.map((log, i) => (
              <Card
                key={i}
                sx={{
                  position: "relative",
                  display: "flex",
                  textAlign: "left",
                  alignItems: "flex-start",
                  margin: "8px",
                  padding: "8px",
                  fontSize: 24,
                  flexDirection: "column",
                }}
              >
                <IconButton
                  size="small"
                  sx={{ position: "absolute", top: 4, right: 4 }}
                  onClick={() => handleDeleteLog(log.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>

                <Typography
                  variant="button"
                  sx={{
                    textAlign: "center",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  {log.action_type}
                </Typography>
                <Box
                  display="flex"
                  justifyContent={"space-between"}
                  width={"100%"}
                >
                  <Box display="flex" flexDirection={"column"}>
                    <Typography variant="button">
                      <strong style={{ color: "#AAA" }}>Date:</strong>{" "}
                      {log.timestamp
                        ? DateTime.fromSQL(log.timestamp, { zone: "utc" })
                            .toLocal()
                            .toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)
                        : "N/A"}
                    </Typography>
                    <Typography variant="button">
                      <strong style={{ color: "#AAA" }}>Time:</strong>{" "}
                      {log.timestamp
                        ? DateTime.fromSQL(log.timestamp, { zone: "utc" })
                            .toLocal()
                            .toLocaleString(DateTime.TIME_WITH_SECONDS)
                        : "N/A"}
                    </Typography>
                  </Box>
                  <Box
                    display="flex"
                    flexDirection={"column"}
                    textAlign={"justify"}
                  >
                    <Typography variant="button">
                      <strong style={{ color: "#AAA" }}>Food Type:</strong>{" "}
                      {log?.log_json?.food_type || "N/A"}
                    </Typography>
                    <Typography variant="button" textAlign={"justify"}>
                      <strong style={{ color: "#AAA" }}>Quantity:</strong>{" "}
                      {log?.log_json?.quantity || "N/A"}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            ))}
        </div>
      </div>
    </Dialog>
  );
};

export default FeedingLogs;
