// Inicializar logger
const logger = {
  info: (msg: string) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg: string, err?: unknown) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
};

export { logger };
