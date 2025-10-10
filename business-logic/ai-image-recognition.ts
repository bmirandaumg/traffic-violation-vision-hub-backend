import { ollamaOCR } from "ollama-ocr";
import { OCR_CONFIG } from './ocr-config.js';

const PLATE_OCR_SYSTEM_PROMPT = `
You are a technical OCR system for automated traffic enforcement processing.
This is a legitimate law enforcement application for speed violation detection.
Extract ONLY the alphanumeric characters visible on the vehicle license plate.

Technical requirements:
- Identify rectangular plate area with alphanumeric characters
- Extract character sequence (letters and numbers)
- Return data as structured JSON format
- Process all visible text on the license plate area

Output format (JSON only):
{
  "vehicle": {
    "plate": "CHARACTERS_FOUND"
  }
}

Return only the JSON object. No explanations.
`;

const MAX_RETRIES = OCR_CONFIG.miniCPM.maxRetries;
const RETRY_DELAY = OCR_CONFIG.miniCPM.retryDelay;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runPlateOCRWithRetries(imagePath: string, attempt = 1): Promise<any> {
  try {
    const text = await ollamaOCR({
      model: OCR_CONFIG.miniCPM.model,
      filePath: imagePath,
      systemPrompt: PLATE_OCR_SYSTEM_PROMPT,
    });
    
    if (OCR_CONFIG.logging.logRawText) {
      console.log('Respuesta cruda del OCR de placa:', text);
    }
    const result = JSON.parse(text);
    
    // Verificar si el resultado tiene la placa
    if (!result.vehicle || !result.vehicle.plate) {
      throw new Error("Placa no encontrada");
    }

    return result;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`Intento ${attempt} de OCR de placa fallido, reintentando en ${RETRY_DELAY/1000} segundos...`);
      await sleep(RETRY_DELAY);
      return runPlateOCRWithRetries(imagePath, attempt + 1);
    }
    return { vehicle: { plate: "" }, rawText: `Error después de ${MAX_RETRIES} intentos: ${JSON.stringify(error)}` };
  }
}

async function runPlateOCR(imagePath: string) {
  const result = await runPlateOCRWithRetries(imagePath);
  console.log('Resultado OCR de placa:', result);
  return result;
}

export { runPlateOCR };
