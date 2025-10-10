import { runHeaderOCR, type HeaderInfo } from './tesseract-ocr.js';
import { runPlateOCR } from './ai-image-recognition.js';
import path from 'path';

interface CompleteOCRResult {
  date: string;
  time: string;
  location: string;
  speedLimit: string;
  measuredSpeed: string;
  vehicle: {
    plate: string;
  };
  fileName?: string;
  processingInfo?: {
    headerOCRSuccess: boolean;
    plateOCRSuccess: boolean;
    errors?: string[];
  };
}

/**
 * Ejecuta OCR híbrido combinando Tesseract (header) y MiniCPM-V (placa)
 * @param imagePath Ruta de la imagen a procesar
 * @returns Resultado completo del OCR
 */
async function runHybridOCR(imagePath: string): Promise<CompleteOCRResult> {
  console.log(`\n=== Iniciando OCR híbrido para: ${path.basename(imagePath)} ===`);
  
  const result: CompleteOCRResult = {
    date: '',
    time: '',
    location: '',
    speedLimit: '',
    measuredSpeed: '',
    vehicle: {
      plate: ''
    },
    fileName: path.basename(imagePath),
    processingInfo: {
      headerOCRSuccess: false,
      plateOCRSuccess: false,
      errors: []
    }
  };

  // Ejecutar ambos OCR en paralelo para mayor eficiencia
  const [headerResult, plateResult] = await Promise.allSettled([
    runHeaderOCR(imagePath),
    runPlateOCR(imagePath)
  ]);

  // Procesar resultado del header (Tesseract)
  if (headerResult.status === 'fulfilled') {
    console.log('✅ OCR del header exitoso');
    result.date = headerResult.value.date;
    result.time = headerResult.value.time;
    result.location = headerResult.value.location;
    result.speedLimit = headerResult.value.speedLimit;
    result.measuredSpeed = headerResult.value.measuredSpeed;
    result.processingInfo!.headerOCRSuccess = true;
  } else {
    console.log('❌ OCR del header falló:', headerResult.reason);
    result.processingInfo!.errors!.push(`Header OCR: ${headerResult.reason}`);
  }

  // Procesar resultado de la placa (MiniCPM-V)
  if (plateResult.status === 'fulfilled') {
    console.log('✅ OCR de placa exitoso');
    if (plateResult.value.vehicle && plateResult.value.vehicle.plate) {
      result.vehicle.plate = plateResult.value.vehicle.plate;
      result.processingInfo!.plateOCRSuccess = true;
    } else {
      console.log('⚠️ OCR de placa no encontró la placa');
      result.processingInfo!.errors!.push('Plate OCR: No se encontró placa');
    }
  } else {
    console.log('❌ OCR de placa falló:', plateResult.reason);
    result.processingInfo!.errors!.push(`Plate OCR: ${plateResult.reason}`);
  }

  // Validar resultado final
  const isValid = validateOCRResult(result);
  console.log(`\n=== OCR híbrido completado - Válido: ${isValid} ===`);
  console.log('Resultado final:', {
    date: result.date,
    time: result.time,
    location: result.location,
    speedLimit: result.speedLimit,
    measuredSpeed: result.measuredSpeed,
    plate: result.vehicle.plate,
    headerSuccess: result.processingInfo!.headerOCRSuccess,
    plateSuccess: result.processingInfo!.plateOCRSuccess
  });

  return result;
}

/**
 * Valida que el resultado del OCR tenga la información mínima requerida
 */
function validateOCRResult(result: CompleteOCRResult): boolean {
  // Información crítica: fecha, hora y placa
  const hasDate = Boolean(result.date && result.date.length > 0);
  const hasTime = Boolean(result.time && result.time.length > 0);
  const hasPlate = Boolean(result.vehicle.plate && result.vehicle.plate.length > 0);
  
  return hasDate && hasTime && hasPlate;
}

/**
 * Función de compatibilidad para mantener la interfaz existente
 * @param imagePath Ruta de la imagen
 * @returns Resultado en el formato esperado por el sistema actual
 */
async function runOCR(imagePath: string): Promise<CompleteOCRResult> {
  try {
    return await runHybridOCR(imagePath);
  } catch (error) {
    console.error('Error en OCR híbrido:', error);
    
    // Retornar resultado de error en formato compatible
    return {
      date: '',
      time: '',
      location: '',
      speedLimit: '',
      measuredSpeed: '',
      vehicle: {
        plate: ''
      },
      fileName: path.basename(imagePath),
      processingInfo: {
        headerOCRSuccess: false,
        plateOCRSuccess: false,
        errors: [`OCR Híbrido falló: ${error}`]
      }
    };
  }
}

/**
 * Ejecuta solo el OCR del header (para debugging/testing)
 */
async function runHeaderOCROnly(imagePath: string): Promise<HeaderInfo> {
  return await runHeaderOCR(imagePath);
}

/**
 * Ejecuta solo el OCR de placa (para debugging/testing)
 */
async function runPlateOCROnly(imagePath: string): Promise<any> {
  return await runPlateOCR(imagePath);
}

export { 
  runOCR, 
  runHybridOCR, 
  runHeaderOCROnly, 
  runPlateOCROnly,
  validateOCRResult
};
export type { CompleteOCRResult };