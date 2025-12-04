import { styled } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import HomeIcon from "@mui/icons-material/Home";
import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  alignItems: "center",
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  // Override media queries injected by theme.mixins.toolbar
  "@media all": {
    minHeight: 64,
  },
}));

interface TankAppBarProps {}

export const MainAppBar: React.FC<TankAppBarProps> = ({}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
  }, []);

  return (
    <Box>
      <AppBar position="static">
      <Toolbar variant="dense" sx={{ backgroundColor: "black" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <Link to="/" style={{ flexGrow: 1 }}>
              <IconButton
                size="large"
                edge="start"
                color="default"
                aria-label="open drawer"
                sx={{ mr: 2 }}
              >
                <HomeIcon />
              </IconButton>
            </Link>
          </Box>
          <Box sx={{ flexGrow: 1 }}></Box>
          <Button sx={{ alignItems: "middle" }} color="info">
            {currentTime.toLocaleTimeString()}
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default MainAppBar;
