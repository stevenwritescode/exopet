import React, { useEffect, useState } from "react";
import { getTanks } from "../dal/Tank.dal";
import { Card, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { Tank } from "aquario-models";

const Home: React.FC = () => {
  // State for storing the list of tanks
  const [tanks, setTanks] = useState<Tank[]>([]);

  useEffect(() => {
    // Fetch the list of tanks when the component mounts
    const fetchTanks = async () => {
      try {
        const data = await getTanks();
        console.log(data);
        if (data.length) {
          setTanks(data);
        }
      } catch (error) {
        console.error("Failed to fetch tanks:", error);
      }
    };

    fetchTanks();
  }, []); // Empty dependency array to run only on mount

  return (
    <React.Fragment>
      <div
        style={{
          height: "100%",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack justifyContent="space-around" alignItems="center" flex="25% 0 1">
          <Typography variant="h4">TankHub</Typography>
        </Stack>
        <Stack
          flexDirection="row"
          justifyContent="space-around"
          alignItems="center"
          flex="50% 0 1"
        >
          <Link
            to="/tanks"
            style={{
              flex: "50% 1",
              padding: "32px",
              margin: "16px",
              textAlign: "center",
              fontSize: "24px",
              textDecoration: "none",
            }}
          >
            <Card
              sx={{
                padding: "32px",
                margin: "16px",
                textAlign: "center",
                fontSize: "24px",
              }}
            >
              Aquariums
            </Card>
          </Link>
          <Link
            to="/animals"
            style={{
              flex: "50% 1",
              padding: "32px",
              margin: "16px",
              textAlign: "center",
              fontSize: "24px",
              textDecoration: "none",

            }}
          >
            <Card
              style={{
                padding: "32px",
                margin: "16px",
                textAlign: "center",
                fontSize: "24px",
              }}
            >
              Animals
            </Card>
          </Link>
        </Stack>
      </div>
    </React.Fragment>
  );
};

export default Home;
