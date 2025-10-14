import { logger } from "../modules/logger";
import { connect, query, close } from "../modules/pg-connector";

/**
 * Convierte fecha de formato DD/MM/YYYY a YYYY-MM-DD
 */
function convertTesseractDate(tesseractDate: string): string | null {
  if (!tesseractDate || typeof tesseractDate !== 'string') return null;
  
  const match = tesseractDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  
  const [, day, month, year] = match;
  const paddedDay = day.padStart(2, '0');
  const paddedMonth = month.padStart(2, '0');
  
  return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Combina datos de Tesseract con fallback del path
 * Prioridad: Tesseract > Path
 */
function mergeDataWithFallback(pathData: any, ocrResult: any) {
  const tesseractData = ocrResult?.processingInfo?.headerOCRSuccess ? {
    date: ocrResult.date,
    location: ocrResult.location
  } : null;

  logger.info(`Datos disponibles - Tesseract: ${JSON.stringify(tesseractData)}, Path: ${JSON.stringify(pathData)}`);

  // Usar fecha de Tesseract si está disponible, sino del path
  let finalDate = pathData.date; // fallback
  if (tesseractData?.date) {
    const convertedDate = convertTesseractDate(tesseractData.date);
    if (convertedDate) {
      finalDate = convertedDate;
      logger.info(`Usando fecha de Tesseract: ${tesseractData.date} → ${convertedDate}`);
    } else {
      logger.error(`Fecha de Tesseract inválida: ${tesseractData.date}, usando path: ${pathData.date}`);
    }
  } else {
    logger.info(`Sin fecha de Tesseract, usando path: ${pathData.date}`);
  }

  // Usar location de Tesseract si está disponible, sino cruise del path
  let finalCruise = pathData.cruise; // fallback
  if (tesseractData?.location && tesseractData.location.trim() !== '') {
    finalCruise = tesseractData.location.trim();
    logger.info(`Usando ubicación de Tesseract: ${finalCruise}`);
  } else {
    logger.info(`Sin ubicación de Tesseract, usando cruise del path: ${pathData.cruise}`);
  }

  return {
    date: finalDate,
    cruise: finalCruise,
    photoName: pathData.photoName // siempre del path
  };
}

async function processRecord(jsonFilePath: any, ocrResult: any, filePath: string) {
  await connect();
  try {
    // Combinar datos de Tesseract con fallback del path
    const finalData = mergeDataWithFallback(jsonFilePath, ocrResult);
    
    const cruiseExist = "SELECT id FROM cruise WHERE cruise_name = $1";
    let cruiseId;
    const cruiseRes = await query(cruiseExist, [finalData.cruise]);

    if (cruiseRes.rows.length > 0) {
      logger.info(`Crucero existente encontrado: ${finalData.cruise}`);
      cruiseId = cruiseRes.rows[0].id;
    } else {
      logger.info(`Creando nuevo crucero: ${finalData.cruise}`);
      const insertCruise =
        "INSERT INTO cruise (cruise_name) VALUES ($1) RETURNING id";
      console.log({ insertCruise })
      const newCruiseRes = await query(insertCruise, [finalData.cruise]);
      cruiseId = newCruiseRes.rows[0].id;
    }

    const insertQuery =
      "INSERT INTO public.photo (photo_date, id_cruise, photo_name, photo_path, photo_info) VALUES ($1, $2, $3, $4, $5)";
    const values = [
      finalData.date,
      cruiseId,
      finalData.photoName,
      filePath,
      ocrResult,
    ];

    await query(insertQuery, values);
    logger.info(
      `Registro insertado para archivo: ${finalData.photoName} - Fecha: ${finalData.date}, Cruise: ${finalData.cruise}`
    );
  } catch (err) {
    logger.error("Error inserting record:", err);
    throw err;
  } finally {
    await close();
  }
}

export { processRecord };
