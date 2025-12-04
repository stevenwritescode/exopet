import {
  Button,
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import FeedingDialog from "./FeedingDialog";
import { Animal } from "aquario-models";
import { addFeedingLog } from "../dal/Log.dal";
import { getAnimalDetails } from "../dal/Animal.dal";

const logFeeding = async ({
  animal_id,
  container_id,
  log_json,
}: {
  animal_id?: string;
  container_id?: string;
  log_json: string;
}) => {
  await addFeedingLog({
    animal_id,
    action_type: "Feeding",
    container_id,
    log_json,
  });
};

function ManageAnimalButton({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/animal/${id}`);
  };

  return (
    <Button variant="contained" color="primary" onClick={handleClick}>
      {children}
    </Button>
  );
}

type AnimalCardProps = Animal;

const AnimalCard: React.FC<AnimalCardProps> = (animal: AnimalCardProps) => {
  const [feedingDialog, toggleFeedingDialog] = useState<boolean>(false);

  function FeedAnimalButton({
    id,
    children,
  }: {
    id?: string;
    children: React.ReactNode;
  }) {
    const handleClick = () => {
      toggleFeedingDialog(!feedingDialog);
    };

    return (
      <Button
        variant="contained"
        color="success"
        onClick={handleClick}
        style={{ color: "white" }}
      >
        {children}
      </Button>
    );
  }

  return (
    <React.Fragment>
      <FeedingDialog
        animalDetails={animal}
        open={feedingDialog}
        onClose={() => toggleFeedingDialog(false)}
        onSave={() =>
          logFeeding({
            animal_id: animal.id,
            container_id: animal.enclosure_id,
            log_json: "",
          })
        }
      />
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
        <CardContent
          sx={{
            padding: "8px 0",
          }}
        >
          <Typography sx={{ fontSize: 20 }} color="text.secondary" gutterBottom>
            {animal.name}
          </Typography>
          <Typography variant="h5" component="div"></Typography>
          <Typography sx={{ mb: 1.5 }} color="text.secondary">
            {animal.species}
          </Typography>
        </CardContent>
        <CardActions>
          <ManageAnimalButton id={animal.id}>Manage</ManageAnimalButton>
          <FeedAnimalButton id={animal.id}>Feed</FeedAnimalButton>
        </CardActions>
      </Card>
    </React.Fragment>
  );
};

export default AnimalCard;
