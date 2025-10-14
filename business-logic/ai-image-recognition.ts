import { ollamaOCR } from "ollama-ocr";
import { OCR_CONFIG } from './ocr-config.js';

// Patrones de validación para placas guatemaltecas
const PLATE_PATTERNS = {
  particular: /^[P]{1}\d{3}[A-Z]{3}$/,     // P123ABC - Particulares
  moto: /^[M]{1}\d{3}[A-Z]{3}$/,           // M123ABC - Motocicletas  
  comercial: /^[C]{1}\d{3}[A-Z]{3}$/,      // C123ABC - Comerciales
  
  // Fallback para otros tipos con formato válido 1+3+3
  unknown: /^[A-Z]{1}\d{3}[A-Z]{3}$/       // X123ABC - Otros tipos no identificados
};

/**
 * Valida el formato de una placa guatemalteca
 */
function validatePlateFormat(plate: string): { isValid: boolean, type?: string } {
  const cleanPlate = plate.toUpperCase().replace(/[-\s]/g, '');
  
  for (const [type, pattern] of Object.entries(PLATE_PATTERNS)) {
    if (pattern.test(cleanPlate)) {
      return { isValid: true, type };
    }
  }
  
  return { isValid: false };
}

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

    // Validar formato de la placa
    const plateText = result.vehicle.plate.trim();
    const validation = validatePlateFormat(plateText);
    
    if (!validation.isValid) {
      throw new Error(`Formato de placa inválido: ${plateText}. Se espera formato X123ABC`);
    }

    if (OCR_CONFIG.logging.logProcessingSteps) {
      console.log(`✅ Placa válida detectada: ${plateText} (tipo: ${validation.type})`);
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
