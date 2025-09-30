import dotenv from "dotenv";
dotenv.config();

const getConfig = () => {
  return {
    database: {
      user: process.env.DB_USER || "muniadmin",
      password: process.env.DB_PASSWORD || "Muni@2024",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "emetra_remisiones",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };
};

export { getConfig };
