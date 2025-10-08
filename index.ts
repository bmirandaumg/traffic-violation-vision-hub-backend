import chokidar, { FSWatcher } from "chokidar";
import async from "async";
import path, { resolve } from "path";
import { logger } from "./modules/logger";
import { runOCR } from "./business-logic/ai-image-recognition";
import { resolvePath } from "./business-logic/file-explode";
import { log } from "console";
import { processRecord } from "./business-logic/db-process";
import { moveFileToProcessed, toRelativePath } from "./business-logic/file-utils";

// Configuración
interface Config {
  watchDir: string;
  watchOptions: chokidar.WatchOptions;
  cargoSize: number;
}

const CONFIG: Config = {
  watchDir: "./images", // Directorio a observar
  watchOptions: {
    ignored: (path, stats) => stats?.isFile() && !path.endsWith(".jpg"),
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 4000,
      pollInterval: 300,
    },
    usePolling: false,
    depth: 3,
  },
  cargoSize: 1,
};

logger.info("Iniciando el sistema de monitoreo de archivos...");

const watcher: FSWatcher = chokidar.watch(CONFIG.watchDir, CONFIG.watchOptions);

const cargo = async.cargo(
  (tasks: string[], callback: (err?: Error) => void) => {
    async
      .mapLimit(
        tasks,
        CONFIG.cargoSize,
        async (filePath: string): Promise<void> => {
          try {
            logger.info(`Procesando archivo: ${filePath}`);
            console.log('Antes de llamar a resolvePath:', filePath);
            const jsonFilePath = resolvePath(filePath);
            console.log('Después de llamar a resolvePath:', jsonFilePath);
            logger.info(`Ruta resuelta: ${JSON.stringify(jsonFilePath)}`);
            const ocrResult = await runOCR(filePath);
            logger.info(`Resultado OCR: ${JSON.stringify(ocrResult)}`);

            // Mover el archivo a la carpeta de procesados
            const newPath = await moveFileToProcessed(filePath);
            const newPathRelative = toRelativePath(newPath);

            await processRecord(
              jsonFilePath,
              ocrResult,
              newPathRelative
            );

            logger.info(`Archivo procesado exitosamente: ${filePath} movido a ${newPathRelative}`);



          } catch (err) {
            logger.error(`Error procesando archivo: ${filePath}`, err);
          }
        }
      )
      .then((): void => {
        callback();
      })
      .catch((err: Error): void => {
        logger.error("Error en el procesamiento por lotes:", err);
        callback(err);
      });
  }
);

watcher
  .on("ready", () => logger.info(`Iniciando monitoreo en ${CONFIG.watchDir}`))
  .on("add", (filePath: string) => {
    logger.info(`Nuevo archivo detectado: ${filePath}`);
    cargo.push(filePath);
  })
  .on("error", (err: unknown) => {
    if (err instanceof Error) {
      logger.error("Error en el watcher:", err);
    } else {
      logger.error("Error en el watcher:", new Error(String(err)));
    }
  });

process.on("SIGINT", () => {
  logger.info("Cerrando el proceso...");
  watcher.close();
  process.exit(0);
});
