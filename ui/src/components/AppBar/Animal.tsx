import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import MoreIcon from "@mui/icons-material/MoreVert";
import { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { Animal } from "aquario-models";

interface AnimalAppBarProps {
  animalDetails?: Animal;
}

export const AnimalAppBar: React.FC<AnimalAppBarProps> = ({
  animalDetails,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar variant="dense" sx={{ backgroundColor: "black" }}>
          <Link to="/animals">
            <Button size="large" color="primary" sx={{ mr: 2, color: "white" }}>
              <ArrowLeftIcon />
              <Typography
                variant="button"
                component="div"
                sx={{ flexGrow: 1 }}
                alignSelf={"center"}
              >
                Animals
              </Typography>
            </Button>
          </Link>
          <Box sx={{ flexGrow: 1 }}></Box>
          <Typography variant="button" component="div" justifySelf={"center"}>
            {animalDetails?.name}
          </Typography>
          <Box sx={{ flexShrink: 0, flexGrow: 1 }}></Box>
          <Button sx={{ alignItems: "middle", color: "white" }}>
            {currentTime.toLocaleTimeString()}
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default AnimalAppBar;
