import sharp from 'sharp';
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
const OLLAMA_HOST = OCR_CONFIG.miniCPM.ollamaHost.replace(/\/$/, '');
const OLLAMA_CHAT_ENDPOINT = `${OLLAMA_HOST}/api/chat`;
const OLLAMA_GENERATE_ENDPOINT = `${OLLAMA_HOST}/api/generate`;

let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Inicia un ping periódico al modelo para mantenerlo en memoria.
 */
function ensureKeepAlive() {
  if (!OCR_CONFIG.miniCPM.keepAlive.enabled || keepAliveInterval) {
    return;
  }

  keepAliveInterval = setInterval(() => {
    sendKeepAlivePing().catch(error => {
      console.warn('⚠️ Ping de keep-alive fallido:', error);
    });
  }, OCR_CONFIG.miniCPM.keepAlive.intervalMs);

  process.once('exit', () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  });
}

async function sendKeepAlivePing(): Promise<void> {
  try {
    await fetch(OLLAMA_GENERATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OCR_CONFIG.miniCPM.model,
        prompt: 'ping',
        keep_alive: OCR_CONFIG.miniCPM.keepAlive.value,
        stream: false,
        options: {
          num_predict: 1
        }
      })
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Crea un recorte optimizado con resize y compresión para reducir el payload.
 */
async function createOptimizedPlateCrop(imagePath: string): Promise<Buffer> {
  const config = OCR_CONFIG.miniCPM.plateCrop;
  const metadata = await sharp(imagePath).metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error('No se pudo obtener las dimensiones de la imagen');
  }

  const topStart = Math.max(0, Math.floor(height * (config.topOffset)));
  const bottomEnd = Math.floor(height * (1 - config.bottomMargin));
  const leftStart = Math.max(0, Math.floor(width * config.leftMargin));
  const rightEnd = Math.floor(width * (1 - config.rightMargin));

  const cropWidth = Math.max(1, rightEnd - leftStart);
  const cropHeight = Math.max(1, bottomEnd - topStart);

  if (OCR_CONFIG.logging.logProcessingSteps) {
    const originalArea = width * height;
    const cropArea = cropWidth * cropHeight;
    console.log(`📐 Crop optimizado: ${cropWidth}x${cropHeight} (${Math.round((cropArea / originalArea) * 100)}% del área)`);
  }

  return await sharp(imagePath)
    .extract({
      left: leftStart,
      top: topStart,
      width: cropWidth,
      height: cropHeight
    })
    .resize({
      width: OCR_CONFIG.miniCPM.plateCrop.targetWidth,
      fit: 'inside',
      withoutEnlargement: true
    })
    .greyscale()
    .jpeg({
      quality: OCR_CONFIG.miniCPM.plateCrop.jpegQuality,
      chromaSubsampling: '4:4:4'
    })
    .toBuffer();
}

/**
 * Realiza la llamada al endpoint de chat de Ollama usando fetch nativo.
 */
async function ollamaChatWithImage(base64Image: string): Promise<string> {
  const response = await fetch(OLLAMA_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OCR_CONFIG.miniCPM.model,
      keep_alive: OCR_CONFIG.miniCPM.keepAlive.value,
      stream: false,
      options: {
        num_ctx: OCR_CONFIG.miniCPM.request.maxContextTokens,
        num_predict: OCR_CONFIG.miniCPM.request.maxOutputTokens,
        temperature: OCR_CONFIG.miniCPM.request.temperature,
        top_p: 0.1,
        format: OCR_CONFIG.miniCPM.request.format
      },
      messages: [
        {
          role: 'system',
          content: PLATE_OCR_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: 'Extrae la placa en formato JSON.',
          images: [base64Image]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en respuesta de Ollama (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.message?.content;

  if (!content) {
    throw new Error('La respuesta de Ollama no contiene contenido');
  }

  return content;
}

/**
 * Parser robusto para extraer JSON incluso si hay texto adicional.
 */
function extractJSONFromResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`No se pudo extraer JSON válido de la respuesta: ${text.substring(0, 120)}...`);
  }
}


async function runPlateOCRWithRetries(imagePath: string, attempt = 1): Promise<any> {
  try {
    ensureKeepAlive();

    console.log(`🎯 [Intento ${attempt}] OCR de placa optimizado...`);
    const cropBuffer = await createOptimizedPlateCrop(imagePath);
    const base64Image = cropBuffer.toString('base64');

    const text = await ollamaChatWithImage(base64Image);
    
    if (OCR_CONFIG.logging.logRawText) {
      console.log('Respuesta cruda del OCR de placa:', text);
    }

    const result = extractJSONFromResponse(text);
    
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
