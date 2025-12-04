import React, { useEffect, useState } from "react";
import { getTanks } from "../dal/Tank.dal";
import { Card, Typography } from "@mui/material";
import TankCard from "../components/TankCard";
import MainAppBar from "../components/AppBar/Main";
import { Tank } from "aquario-models";

const TankList: React.FC = () => {
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
      <MainAppBar />
      <Card>
        <Typography
          variant="h5"
          style={{ textAlign: "center", paddingTop: "16px" }}
        >
          Tanks
        </Typography>
        {tanks.map((tank) => (
          <TankCard
            key={tank.id}
            name={tank.name}
            tank_id={tank.id}
            type={tank.type}
          ></TankCard>
        ))}
      </Card>
    </React.Fragment>
  );
};

export default TankList;
