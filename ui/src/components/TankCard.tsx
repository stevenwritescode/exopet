import {
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";

function ManageTankButton({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/tank/${id}`);
  };

  return (
    <Button variant="contained" color="primary" onClick={handleClick}>
      {children}
    </Button>
  );
}

interface TankCardProps {
  name?: string;
  tank_id: string;
  type?: string;
}

const TankCard: React.FC<TankCardProps> = (tank: TankCardProps) => {
  return (
    <React.Fragment>
      <Card
        sx={{
          minWidth: 275,
          backgroundColor: "#252525",
          color: "#fff",
          margin: "10px",
          padding: "0 16px",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <CardContent sx={{
          padding: "8px 0",
        }}>
          <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
            {tank.name}
          </Typography>
          <Typography variant="h5" component="div"></Typography>
          <Typography color="text.secondary">
            {tank.type}
          </Typography>
        </CardContent>
        <CardActions>
          <ManageTankButton id={tank.tank_id}>
            Manage
          </ManageTankButton>
        </CardActions>
      </Card>
    </React.Fragment>
  );
};

export default TankCard;
