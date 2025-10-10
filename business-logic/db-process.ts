import { logger } from "../modules/logger";
import { connect, query, close } from "../modules/pg-connector";

async function processRecord(jsonFilePath: any, ocrResult: any, filePath: string) {
  await connect();
  try {
    const cruiseExist = "SELECT id FROM cruise WHERE cruise_name = $1";
    let cruiseId;
    const cruiseRes = await query(cruiseExist, [jsonFilePath.cruise]);

    if (cruiseRes.rows.length > 0) {
      logger.info(`Crucero existente encontrado: ${jsonFilePath.cruise}`);
      cruiseId = cruiseRes.rows[0].id;
    } else {
      logger.info(`Creando nuevo crucero: ${jsonFilePath.cruise}`);
      const insertCruise =
        "INSERT INTO cruise (cruise_name) VALUES ($1) RETURNING id";
      console.log({ insertCruise })
      const newCruiseRes = await query(insertCruise, [jsonFilePath.cruise]);
      cruiseId = newCruiseRes.rows[0].id;
    }

    const insertQuery =
      "INSERT INTO public.photo (photo_date, id_cruise, photo_name, photo_path, photo_info) VALUES ($1, $2, $3, $4, $5)";
    const values = [
      jsonFilePath.date,
      cruiseId,
      jsonFilePath.photoName,
      filePath,
      ocrResult,
    ];

    await query(insertQuery, values);
    logger.info(
      `Registro insertado para archivo: ${jsonFilePath.photoName}`
    );
  } catch (err) {
    logger.error("Error inserting record:", err);
    throw err;
  } finally {
    await close();
  }
}

export { processRecord };
