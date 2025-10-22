import { Client } from "pg";
import { getConfig } from "./config.js";
import { logger } from "./logger.js";

let client: Client | null = null;

const getClient = (): Client => {
  if (!client) {
    client = new Client(getConfig().database);
  }
  return client;
};

export const connect = async (): Promise<void> => {
  try {
    const client = getClient();
    await client.connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Error connecting to database:", error);
    throw error;
  }
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  try {
    const client = getClient();
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    logger.error("Error executing query:", error);
    throw error;
  }
};

export const close = async (): Promise<void> => {
  try {
    if (client) {
      await client.end();
      client = null;
      logger.info("Database connection closed");
    }
  } catch (error) {
    logger.error("Error closing database connection:", error);
    throw error;
  }
};

export { getClient };
