// api.ts

import { Animal } from "aquario-models";
import axios from "axios";

const API_BASE_URL = `http://${process.env.REACT_APP_API_HOST}:${process.env.REACT_APP_API_PORT}`; // Replace with actual IP and port

// Functions for Animals
export const addAnimal = async (
  tank_id: number,
  name: string,
  species: string
): Promise<Animal> => {
  try {
    const response = await axios.post<Animal>(`${API_BASE_URL}/animal`, {
      tank_id,
      name,
      species,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding animal", error);
    throw error;
  }
};

export const getAnimals = async (): Promise<Animal[]> => {
  try {
    const response = await axios.get<Animal[]>(`${API_BASE_URL}/animal/all`);
    return response.data;
  } catch (error) {
    console.error("Error fetching animals", error);
    throw error;
  }
};

// Add other necessary functions

export const getAnimalDetails = async (
  animal_id?: string | number
): Promise<{
  animal: Animal;
  logs: any[];
}> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/animal/${animal_id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching animals", error);
    throw error;
  }
};
