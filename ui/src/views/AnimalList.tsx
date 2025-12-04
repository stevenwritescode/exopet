import React, { useEffect, useState } from "react";
import { getAnimals } from "../dal/Animal.dal";
import { Button, Card, Typography } from "@mui/material";
import AnimalCard from "../components/AnimalCard";
import MainAppBar from "../components/AppBar/Main";
import { Animal } from "aquario-models";


const AnimalList: React.FC = () => {
  // State for storing the list of animals
  const [animals, setAnimals] = useState<Animal[]>([]);

  useEffect(() => {
    // Fetch the list of animals when the component mounts
    const fetchAnimals = async () => {
      try {
        const data = await getAnimals();
        console.log(data);
        if (data.length) {
          setAnimals(data);
        }
      } catch (error) {
        console.error("Failed to fetch animals:", error);
      }
    };

    fetchAnimals();
  }, []); // Empty dependency array to run only on mount

  return (
    <React.Fragment>
      <MainAppBar/>
      <Card>
        <Typography
          variant="h5"
          style={{ textAlign: "center", paddingTop: "16px" }}
        >
          Animals
        </Typography>
          {animals.map((animal) => (
            <AnimalCard
              key={animal.id}
              name={animal.name}
              id={animal.id}
            ></AnimalCard>
          ))}
      </Card>
    </React.Fragment>
  );
};

export default AnimalList;
