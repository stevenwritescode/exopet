import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Card, Stack } from "@mui/material";
import { Animal } from "aquario-models";

interface FeedingDialogProps {
  open: boolean;
  animalDetails: Animal;
  onClose: () => void;
  onSave: (log_json: string) => void;
}

// Function to format seconds into minutes and seconds
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const FeedingDialog: React.FC<FeedingDialogProps> = ({
  open,
  animalDetails,
  onClose,
  onSave,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [foodSelection, setFood] = useState(-1);
  const [quantitySelection, setQuantity] = useState(-1);

  const foodTypes = ["Pellet", "Bloodworm", "Earthworm"];
  const foodQuantities = [1, 2, 3, 4];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
  }, []);

  const clearButtons = () => {
    setFood(-1);
    setQuantity(-1);
  };

  const handleSave = () => {
    const log_json = JSON.stringify({
      food_type: foodTypes[foodSelection],
      quantity: foodQuantities[quantitySelection],
    });

    onSave(log_json);
    handleClose();
  };
  const handleClose = () => {
    onClose();
    clearButtons();
  };

  const selectFood = (foodType: number) => {
    setFood(foodType);
  };

  const selectQuantity = (foodQuantity: number) => {
    setQuantity(foodQuantity);
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
            Log Feeding
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
      {(quantitySelection < 0 || foodSelection < 0) && (
        <div>
          <Typography
            sx={{ mt: 2 }}
            variant="h6"
            component="div"
            align="center"
          >
            Food Type
          </Typography>

          <Stack
            display={"flex"}
            flexDirection={"row"}
            justifyContent="space-around"
          >
            {foodTypes.map((foodType, i) => (
              <Card
                key={foodType}
                sx={{
                  textAlign: "center",
                  padding: "24px",
                  margin: "16px",
                  fontSize: 24,
                  flexGrow: 1,
                  backgroundColor: foodSelection === i ? "lightblue" : "grey",
                  color: foodSelection === i ? "darkblue" : "white",
                  border: foodSelection === i ? "solid 2px darkblue" : "0px",
                }}
                onClick={() => selectFood(i)}
              >
                {foodType}
              </Card>
            ))}
          </Stack>
          <Typography
            sx={{ mt: 2 }}
            variant="h6"
            component="div"
            align="center"
          >
            Quantity
          </Typography>
          <Stack
            display={"flex"}
            flexDirection={"row"}
            justifyContent="space-around"
          >
            {foodQuantities.map((quantity, i) => (
              <Card
                key={quantity}
                sx={{
                  textAlign: "center",
                  padding: "24px",
                  margin: "16px",
                  fontSize: 24,
                  flexGrow: 1,
                  backgroundColor:
                    quantitySelection === i ? "lightblue" : "grey",
                  color: quantitySelection === i ? "darkblue" : "white",
                  border:
                    quantitySelection === i ? "solid 2px darkblue" : "0px",
                }}
                onClick={() => selectQuantity(i)}
              >
                {quantity}
                {i >= foodQuantities.length - 1 && "+"}
              </Card>
            ))}
          </Stack>
        </div>
      )}

      {quantitySelection > -1 && foodSelection > -1 && (
        <Box
          display={"flex"}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
        >
          <Typography
            sx={{ mt: 6 }}
            variant="h4"
            component="div"
            align="center"
          >
            Add this log?
          </Typography>
          <Typography
            sx={{ mt: 4 }}
            variant="h6"
            component="div"
            align="center"
          >
            Fed {quantitySelection + 1}{" "}
            {quantitySelection + 1 >= foodQuantities.length && "or more"}{" "}
            {foodTypes[foodSelection]}
            {quantitySelection > 0 && "s"} to {animalDetails.name}.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ mt: 4 }}
            onClick={handleSave}
          >
            Add Log
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 4 }}
            onClick={handleClose}
          >
            Cancel
          </Button>
        </Box>
      )}
    </Dialog>
  );
};

export default FeedingDialog;
