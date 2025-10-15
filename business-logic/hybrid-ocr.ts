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
  
  // Métricas de tiempo
  const startTime = Date.now();
  let headerTime = 0;
  let plateTime = 0;
  
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

  // Ejecutar OCR del header primero para liberar CPU antes de Ollama
  const headerStartTime = Date.now();
  let headerResult: HeaderInfo | null = null;
  let headerError: unknown = null;

  try {
    headerResult = await runHeaderOCR(imagePath);
    console.log('✅ OCR del header exitoso');
  } catch (error) {
    headerError = error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('❌ OCR del header falló:', errorMessage);
    result.processingInfo!.errors!.push(`Header OCR: ${errorMessage}`);
  } finally {
    headerTime = Date.now() - headerStartTime;
  }

  if (headerResult) {
    result.date = headerResult.date;
    result.time = headerResult.time;
    result.location = headerResult.location;
    result.speedLimit = headerResult.speedLimit;
    result.measuredSpeed = headerResult.measuredSpeed;
    result.processingInfo!.headerOCRSuccess = true;
  }

  // Ejecutar OCR de placas después del header para evitar contención
  const plateStartTime = Date.now();
  let plateResult: any = null;
  let plateError: unknown = null;

  try {
    plateResult = await runPlateOCR(imagePath);
    console.log('✅ OCR de placa exitoso');
  } catch (error) {
    plateError = error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('❌ OCR de placa falló:', errorMessage);
    result.processingInfo!.errors!.push(`Plate OCR: ${errorMessage}`);
  } finally {
    plateTime = Date.now() - plateStartTime;
  }

  if (plateResult && plateResult.vehicle && plateResult.vehicle.plate) {
    result.vehicle.plate = plateResult.vehicle.plate;
    result.processingInfo!.plateOCRSuccess = true;
  } else if (!plateError) {
    console.log('⚠️ OCR de placa no encontró la placa');
    result.processingInfo!.errors!.push('Plate OCR: No se encontró placa');
  }

  // Calcular tiempo total
  const totalTime = Date.now() - startTime;

  // (Métricas deshabilitadas: se eliminó ocr-metrics.ts)

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
  console.log(`⏱️ Tiempos -> header: ${headerTime}ms, placa: ${plateTime}ms`);

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

/**
 * Genera reporte de métricas de rendimiento
 */
// Stubs de métricas (desactivadas)
function generateMetricsReport(): string { return 'Metrics disabled'; }
function exportMetricsData() { return {}; }
function resetMetrics(): void { /* noop */ }

export { 
  runOCR, 
  runHybridOCR, 
  runHeaderOCROnly, 
  runPlateOCROnly,
  validateOCRResult,
  generateMetricsReport,
  exportMetricsData,
  resetMetrics
};
export type { CompleteOCRResult };
