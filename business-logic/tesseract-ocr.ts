import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import { OCR_CONFIG, HEADER_PATTERNS } from './ocr-config.js';

interface HeaderInfo {
  date: string;
  time: string;
  location: string;
  speedLimit: string;
  measuredSpeed: string;
}

let sharedWorkerPromise: ReturnType<typeof createWorker> | null = null;
let workerExitHookRegistered = false;

async function getSharedWorker() {
  if (!sharedWorkerPromise) {
    sharedWorkerPromise = createWorker(OCR_CONFIG.tesseract.language, 1, {
      logger: m => {
        if (OCR_CONFIG.logging.logProcessingSteps && m.status === 'recognizing text') {
          console.log(`Tesseract OCR: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    if (!workerExitHookRegistered) {
      workerExitHookRegistered = true;
      process.once('exit', async () => {
        try {
          const workerPromise = sharedWorkerPromise;
          if (workerPromise) {
            const worker = await workerPromise;
            await worker.terminate();
          }
        } catch {
          // Ignorar errores en el cierre
        }
      });
    }
  }

  return sharedWorkerPromise;
}

/**
 * Recorta la parte superior de la imagen que contiene la información del header
 */
async function cropHeaderArea(imagePath: string): Promise<Buffer> {
  try {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 768;
    
    // Usar configuración para el porcentaje del header
    const cropHeight = Math.floor(height * OCR_CONFIG.tesseract.headerCropPercentage);
    
    let imageProcessor = sharp(imagePath)
      .extract({ 
        left: 0, 
        top: 0, 
        width: width,
        height: cropHeight
      });

    // Aplicar preprocesamiento según configuración
    if (OCR_CONFIG.tesseract.imagePreprocessing.greyscale) {
      imageProcessor = imageProcessor.greyscale();
    }
    
    if (OCR_CONFIG.tesseract.imagePreprocessing.sharpen) {
      imageProcessor = imageProcessor.sharpen();
    }
    
    if (OCR_CONFIG.tesseract.imagePreprocessing.enhance) {
      imageProcessor = imageProcessor.normalize();
    }
    
    const imageBuffer = await imageProcessor.png().toBuffer();
    
    return imageBuffer;
  } catch (error) {
    console.error('Error al recortar imagen:', error);
    throw error;
  }
}

/**
 * Extrae información del header usando Tesseract OCR
 */
async function extractHeaderWithTesseract(imagePath: string): Promise<HeaderInfo> {
  const worker = await getSharedWorker();

  try {
    // Recortar la imagen al área del header
    const headerImageBuffer = await cropHeaderArea(imagePath);
    
    // Realizar OCR en el área recortada
    const { data: { text } } = await worker.recognize(headerImageBuffer);
    console.log('Texto extraído del header:', text);
    
    // Parsear el texto extraído usando patrones regulares
    const headerInfo = parseHeaderText(text);
    
    return headerInfo;
  } catch (error) {
    console.error('Error en Tesseract OCR:', error);
    throw error;
  }
}

/**
 * Analiza el texto extraído del header y extrae la información estructurada
 */
function parseHeaderText(text: string): HeaderInfo {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const fullText = lines.join(' ');
  
  if (OCR_CONFIG.logging.logProcessingSteps) {
    console.log('Analizando texto del header:', fullText);
  }
  
  const result: HeaderInfo = {
    date: '',
    time: '',
    location: '',
    speedLimit: '',
    measuredSpeed: ''
  };

  // Usar patrones de configuración para extraer información
  const patterns = HEADER_PATTERNS.spanish;

  // Extraer fecha
  for (const pattern of patterns.date) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      result.date = match[1].trim();
      break;
    }
  }

  // Extraer hora
  for (const pattern of patterns.time) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      result.time = match[1].trim();
      break;
    }
  }

  // Extraer ubicación
  for (const pattern of patterns.location) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      result.location = match[1].trim();
      break;
    }
  }

  // Extraer límite de velocidad
  for (const pattern of patterns.speedLimit) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      // Extraer solo el número, remover "km/h" y espacios
      const speedText = match[1].trim();
      const numberMatch = speedText.match(/(\d+)/);
      result.speedLimit = numberMatch ? numberMatch[1] : speedText;
      break;
    }
  }

  // Extraer velocidad medida
  for (const pattern of patterns.measuredSpeed) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      result.measuredSpeed = match[1].trim();
      break;
    }
  }

  if (OCR_CONFIG.logging.logProcessingSteps) {
    console.log('Información extraída del header:', result);
  }
  
  return result;
}

/**
 * Función principal para OCR del header con reintentos
 */
async function runHeaderOCR(imagePath: string, maxRetries: number = OCR_CONFIG.tesseract.maxRetries): Promise<HeaderInfo> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt} de OCR del header para: ${path.basename(imagePath)}`);
      const result = await extractHeaderWithTesseract(imagePath);
      
      // Validar que al menos tengamos fecha y hora (campos críticos)
      if (result.date && result.time) {
        console.log('OCR del header exitoso');
        return result;
      } else {
        // Error más limpio sin stack trace innecesario
        const missingFields = [];
        if (!result.date) missingFields.push('fecha');
        if (!result.time) missingFields.push('hora');
        throw new Error(`Campos críticos no encontrados: ${missingFields.join(', ')}`);
      }
    } catch (error) {
      lastError = error as Error;
      console.log(`Intento ${attempt} del OCR del header fallido: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        console.log('Reintentando OCR del header...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  const finalError = lastError?.message || 'OCR del header falló';
  console.error(`OCR del header falló después de ${maxRetries} intentos: ${finalError}`);
  throw lastError || new Error('OCR del header falló');
}

export { runHeaderOCR };
export type { HeaderInfo };
