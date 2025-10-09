import { ollamaOCR } from "ollama-ocr";

const TRAFFIC_OCR_SYSTEM_PROMPT = `
Eres un asistente de OCR para análisis de fotomultas. 
Analiza la imagen y devuelve la información estrictamente en formato JSON con la siguiente estructura:

{
  "date": "<fecha en formato dd/mm/yyyy>",
  "time": "<hora en formato HH:mm:ss>",
  "location": "<ubicación>",
  "speedLimit": "<límite de velocidad con unidad>",
  "measuredSpeed": "<velocidad detectada con unidad>",
  "vehicle": {
    "plate": "<placa>"
  }
}

Responde únicamente con el objeto JSON, sin explicaciones adicionales.
`;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo entre reintentos

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runOCRWithRetries(imagePath: string, attempt = 1): Promise<any> {
  try {
    const text = await ollamaOCR({
      model: "minicpm-v",
      filePath: imagePath,
      systemPrompt: TRAFFIC_OCR_SYSTEM_PROMPT,
    });
    console.log('Respuesta cruda del OCR:', text);
    const result = JSON.parse(text);
    
    // Verificar si el resultado tiene la estructura esperada
    if (!result.date || !result.vehicle) {
      throw new Error("Resultado incompleto");
    }

    return result;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`Intento ${attempt} fallido, reintentando en ${RETRY_DELAY/1000} segundos...`);
      await sleep(RETRY_DELAY);
      return runOCRWithRetries(imagePath, attempt + 1);
    }
    return { rawText: `Error después de ${MAX_RETRIES} intentos: ${JSON.stringify(error)}` };
  }
}

async function runOCR(imagePath: string) {
  const result = await runOCRWithRetries(imagePath);
  console.log(result);
  return result;
}

export { runOCR };
