import axios from "axios";
import { Animal, Log, Tank } from "aquario-models";

// Add other interfaces as needed for animals, feedings, etc.
// api.ts

const API_BASE_URL = `http://${process.env.REACT_APP_API_HOST}:${process.env.REACT_APP_API_PORT}`; // Replace with actual IP and port

export const addTank = async (name: string): Promise<Tank> => {
  try {
    const response = await axios.post<Tank>(`${API_BASE_URL}/tank`, {
      name,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding tank", error);
    throw error;
  }
};

export const getTanks = async (): Promise<Tank[]> => {
  try {
    const response = await axios.get<Tank[]>(`${API_BASE_URL}/tank/all`);
    return response.data;
  } catch (error) {
    console.error("Error fetching tanks", error);
    throw error;
  }
};

export const getTankDetails = async (
  tank_id?: string | number
): Promise<Tank> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tank/${tank_id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching tanks", error);
    throw error;
  }
};

export const getAnimalsForTank = async (
  tank_id?: string | number
): Promise<Animal[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tank/${tank_id}/animals`);
    return response.data;
  } catch (error) {
    console.error("Error fetching tanks", error);
    throw error;
  }
};

export const getLogsForTank = async (
  tank_id?: string | number
): Promise<Log[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tank/${tank_id}/logs`);
    return response.data;
  } catch (error) {
    console.error("Error fetching tanks", error);
    throw error;
  }
};

export const updateTankSettings = async (tank: Tank): Promise<Log[]> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/tank/${tank.id}/settings`,
      { settings: tank.settings }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching tanks", error);
    throw error;
  }
};
