// Sistema de métricas para OCR híbrido

interface OCRMetrics {
  // Métricas generales
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  successRate: number;
  
  // Métricas de Tesseract (Header)
  tesseract: {
    processed: number;
    successful: number;
    failed: number;
    successRate: number;
    averageProcessingTime: number;
    fieldSuccessRates: {
      date: number;
      time: number;
      location: number;
      speedLimit: number;
      measuredSpeed: number;
    };
  };
  
  // Métricas de AI OCR (Placas)
  aiOCR: {
    processed: number;
    successful: number;
    failed: number;
    successRate: number;
    averageProcessingTime: number;
    retryStats: {
      firstAttemptSuccess: number;
      secondAttemptSuccess: number;
      thirdAttemptSuccess: number;
      totalFailures: number;
    };
  };
  
  // Métricas de tiempo
  performance: {
    averageTotalTime: number;
    averageHeaderTime: number;
    averagePlateTime: number;
    slowestImage: { fileName: string; time: number };
    fastestImage: { fileName: string; time: number };
  };
  
  // Métricas por sesión
  session: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    imagesPerMinute: number;
  };
}

class OCRMetricsCollector {
  private metrics: OCRMetrics;
  private processingTimes: number[] = [];
  private headerTimes: number[] = [];
  private plateTimes: number[] = [];
  private fieldStats = {
    date: { success: 0, total: 0 },
    time: { success: 0, total: 0 },
    location: { success: 0, total: 0 },
    speedLimit: { success: 0, total: 0 },
    measuredSpeed: { success: 0, total: 0 }
  };

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): OCRMetrics {
    return {
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      successRate: 0,
      tesseract: {
        processed: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        fieldSuccessRates: {
          date: 0,
          time: 0,
          location: 0,
          speedLimit: 0,
          measuredSpeed: 0
        }
      },
      aiOCR: {
        processed: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        retryStats: {
          firstAttemptSuccess: 0,
          secondAttemptSuccess: 0,
          thirdAttemptSuccess: 0,
          totalFailures: 0
        }
      },
      performance: {
        averageTotalTime: 0,
        averageHeaderTime: 0,
        averagePlateTime: 0,
        slowestImage: { fileName: '', time: 0 },
        fastestImage: { fileName: '', time: Infinity }
      },
      session: {
        startTime: new Date(),
        imagesPerMinute: 0
      }
    };
  }

  // Registrar resultado de procesamiento completo
  recordProcessing(result: {
    fileName: string;
    success: boolean;
    totalTime: number;
    headerResult?: {
      success: boolean;
      time: number;
      fields: {
        date: string;
        time: string;
        location: string;
        speedLimit: string;
        measuredSpeed: string;
      };
    };
    plateResult?: {
      success: boolean;
      time: number;
      attempts: number;
    };
  }) {
    this.metrics.totalProcessed++;
    
    if (result.success) {
      this.metrics.totalSuccessful++;
    } else {
      this.metrics.totalFailed++;
    }

    // Registrar tiempo total
    this.processingTimes.push(result.totalTime);
    
    // Actualizar imagen más rápida/lenta
    if (result.totalTime > this.metrics.performance.slowestImage.time) {
      this.metrics.performance.slowestImage = {
        fileName: result.fileName,
        time: result.totalTime
      };
    }
    
    if (result.totalTime < this.metrics.performance.fastestImage.time) {
      this.metrics.performance.fastestImage = {
        fileName: result.fileName,
        time: result.totalTime
      };
    }

    // Registrar métricas de Tesseract
    if (result.headerResult) {
      this.recordTesseractResult(result.headerResult);
    }

    // Registrar métricas de AI OCR
    if (result.plateResult) {
      this.recordAIOCRResult(result.plateResult);
    }

    // Recalcular métricas
    this.updateCalculatedMetrics();
  }

  private recordTesseractResult(headerResult: any) {
    this.metrics.tesseract.processed++;
    this.headerTimes.push(headerResult.time);
    
    if (headerResult.success) {
      this.metrics.tesseract.successful++;
      
      // Registrar éxito de campos individuales
      Object.keys(headerResult.fields).forEach(field => {
        if (this.fieldStats[field as keyof typeof this.fieldStats]) {
          this.fieldStats[field as keyof typeof this.fieldStats].total++;
          if (headerResult.fields[field] && headerResult.fields[field].trim() !== '') {
            this.fieldStats[field as keyof typeof this.fieldStats].success++;
          }
        }
      });
    } else {
      this.metrics.tesseract.failed++;
    }
  }

  private recordAIOCRResult(plateResult: any) {
    this.metrics.aiOCR.processed++;
    this.plateTimes.push(plateResult.time);
    
    if (plateResult.success) {
      this.metrics.aiOCR.successful++;
      
      // Registrar estadísticas de reintentos
      switch (plateResult.attempts) {
        case 1:
          this.metrics.aiOCR.retryStats.firstAttemptSuccess++;
          break;
        case 2:
          this.metrics.aiOCR.retryStats.secondAttemptSuccess++;
          break;
        case 3:
          this.metrics.aiOCR.retryStats.thirdAttemptSuccess++;
          break;
      }
    } else {
      this.metrics.aiOCR.failed++;
      this.metrics.aiOCR.retryStats.totalFailures++;
    }
  }

  private updateCalculatedMetrics() {
    // Tasas de éxito
    this.metrics.successRate = (this.metrics.totalSuccessful / this.metrics.totalProcessed) * 100;
    this.metrics.tesseract.successRate = (this.metrics.tesseract.successful / this.metrics.tesseract.processed) * 100;
    this.metrics.aiOCR.successRate = (this.metrics.aiOCR.successful / this.metrics.aiOCR.processed) * 100;

    // Tiempos promedio
    this.metrics.performance.averageTotalTime = this.average(this.processingTimes);
    this.metrics.performance.averageHeaderTime = this.average(this.headerTimes);
    this.metrics.performance.averagePlateTime = this.average(this.plateTimes);
    this.metrics.tesseract.averageProcessingTime = this.average(this.headerTimes);
    this.metrics.aiOCR.averageProcessingTime = this.average(this.plateTimes);

    // Tasas de éxito por campo
    Object.keys(this.fieldStats).forEach(field => {
      const fieldKey = field as keyof typeof this.fieldStats;
      const stats = this.fieldStats[fieldKey];
      if (stats.total > 0) {
        (this.metrics.tesseract.fieldSuccessRates as any)[field] = (stats.success / stats.total) * 100;
      }
    });

    // Métricas de sesión
    const now = new Date();
    const sessionDuration = (now.getTime() - this.metrics.session.startTime.getTime()) / 1000; // segundos
    this.metrics.session.imagesPerMinute = (this.metrics.totalProcessed / sessionDuration) * 60;
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  // Generar reporte de métricas
  generateReport(): string {
    const m = this.metrics;
    
    return `
📊 === REPORTE DE MÉTRICAS OCR HÍBRIDO ===
═══════════════════════════════════════════

📈 RESUMEN GENERAL:
  • Total procesadas: ${m.totalProcessed}
  • Exitosas: ${m.totalSuccessful} (${m.successRate.toFixed(1)}%)
  • Fallidas: ${m.totalFailed} (${(100 - m.successRate).toFixed(1)}%)

🔤 TESSERACT (HEADER):
  • Procesadas: ${m.tesseract.processed}
  • Tasa de éxito: ${m.tesseract.successRate.toFixed(1)}%
  • Tiempo promedio: ${m.tesseract.averageProcessingTime.toFixed(0)}ms
  • Éxito por campo:
    - Fecha: ${m.tesseract.fieldSuccessRates.date.toFixed(1)}%
    - Hora: ${m.tesseract.fieldSuccessRates.time.toFixed(1)}%
    - Ubicación: ${m.tesseract.fieldSuccessRates.location.toFixed(1)}%
    - Límite velocidad: ${m.tesseract.fieldSuccessRates.speedLimit.toFixed(1)}%
    - Velocidad medida: ${m.tesseract.fieldSuccessRates.measuredSpeed.toFixed(1)}%

🤖 AI OCR (PLACAS):
  • Procesadas: ${m.aiOCR.processed}
  • Tasa de éxito: ${m.aiOCR.successRate.toFixed(1)}%
  • Tiempo promedio: ${m.aiOCR.averageProcessingTime.toFixed(0)}ms
  • Reintentos:
    - 1er intento: ${m.aiOCR.retryStats.firstAttemptSuccess} éxitos
    - 2do intento: ${m.aiOCR.retryStats.secondAttemptSuccess} éxitos
    - 3er intento: ${m.aiOCR.retryStats.thirdAttemptSuccess} éxitos
    - Fallos totales: ${m.aiOCR.retryStats.totalFailures}

⚡ RENDIMIENTO:
  • Tiempo total promedio: ${m.performance.averageTotalTime.toFixed(0)}ms
  • Imagen más rápida: ${m.performance.fastestImage.fileName} (${m.performance.fastestImage.time.toFixed(0)}ms)
  • Imagen más lenta: ${m.performance.slowestImage.fileName} (${m.performance.slowestImage.time.toFixed(0)}ms)
  • Velocidad: ${m.session.imagesPerMinute.toFixed(1)} imágenes/minuto

⏱️  SESIÓN:
  • Inicio: ${m.session.startTime.toLocaleString()}
  • Duración: ${((Date.now() - m.session.startTime.getTime()) / 1000 / 60).toFixed(1)} minutos
  • Productividad: ${m.session.imagesPerMinute.toFixed(1)} img/min

═══════════════════════════════════════════
    `;
  }

  // Exportar métricas como JSON
  exportMetrics(): OCRMetrics {
    return { ...this.metrics };
  }

  // Resetear métricas
  reset() {
    this.metrics = this.initializeMetrics();
    this.processingTimes = [];
    this.headerTimes = [];
    this.plateTimes = [];
    this.fieldStats = {
      date: { success: 0, total: 0 },
      time: { success: 0, total: 0 },
      location: { success: 0, total: 0 },
      speedLimit: { success: 0, total: 0 },
      measuredSpeed: { success: 0, total: 0 }
    };
  }
}

// Instancia global del collector
export const metricsCollector = new OCRMetricsCollector();
export { OCRMetricsCollector };
export type { OCRMetrics };