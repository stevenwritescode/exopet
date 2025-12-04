// api.ts

import { Log } from "aquario-models";
import axios from "axios";

const API_BASE_URL = `http://${process.env.REACT_APP_API_HOST}:${process.env.REACT_APP_API_PORT}`; // Replace with actual IP and port

// Functions for Feeding Logs
export const addFeedingLog = async ({
  animal_id,
  action_type,
  container_id,
  log_json,
}: {
  animal_id?: string;
  action_type?: string;
  container_id?: string | number;
  log_json: string;
}): Promise<Log> => {
  try {
    const response = await axios.post<Log>(`${API_BASE_URL}/log/feeding`, {
      action_type,
      animal_id,
      container_id,
      log_json,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding feeding log", error);
    throw error;
  }
};

export const getLogsForAnimal = async (
  animal_id?: string | number
): Promise<Log[]> => {
  try {
    const response = await axios.get<Log[]>(
      `${API_BASE_URL}/logs/animal/${animal_id}`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching feeding logs for animal ${animal_id}`,
      error
    );
    throw error;
  }
};

export const getAllFeedingLogs = async (): Promise<Log[]> => {
  try {
    const response = await axios.get<Log[]>(`${API_BASE_URL}/logs/feedings`);
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching feeding logs`,
      error
    );
    throw error;
  }
};

export const deleteFeedingLog = async (logId: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/log/feeding/${logId}`);
  } catch (error) {
    console.error(`Error deleting feeding log ${logId}`, error);
    throw error;
  }
};



// Add other necessary functions
