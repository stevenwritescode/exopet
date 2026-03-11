import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { Stack, TextField } from "@mui/material";
import { Animal } from "aquario-models";

interface AnimalEditDialogProps {
  open: boolean;
  animalDetails: Animal;
  onClose: () => void;
  onSave: (fields: Partial<Pick<Animal, "name" | "species" | "species_latin" | "notes">>) => void;
}

const AnimalEditDialog: React.FC<AnimalEditDialogProps> = ({
  open,
  animalDetails,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [speciesLatin, setSpeciesLatin] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setName(animalDetails.name || "");
    setSpecies(animalDetails.species || "");
    setSpeciesLatin(animalDetails.species_latin || "");
    setNotes(animalDetails.notes || "");
  }, [animalDetails]);

  const handleSave = () => {
    onSave({ name, species, species_latin: speciesLatin, notes });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Edit Animal
          </Typography>
          <Button autoFocus color="inherit" onClick={handleSave}>
            Save
          </Button>
        </Toolbar>
      </AppBar>
      <Stack spacing={3} sx={{ p: 3 }}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          variant="outlined"
        />
        <TextField
          label="Species"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          fullWidth
          variant="outlined"
        />
        <TextField
          label="Species (Latin)"
          value={speciesLatin}
          onChange={(e) => setSpeciesLatin(e.target.value)}
          fullWidth
          variant="outlined"
        />
        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          variant="outlined"
          multiline
          rows={3}
        />
      </Stack>
    </Dialog>
  );
};

export default AnimalEditDialog;
