// Configuración para el sistema de OCR híbrido

export const OCR_CONFIG = {
  // Configuración de Tesseract para OCR del header
  tesseract: {
    language: 'spa', // Idioma para OCR
    workerOptions: {
      logger: {
        enabled: true,
        level: 'info'
      }
    },
    // Porcentaje de la imagen que se considera "header" (desde arriba)
    headerCropPercentage: 0.15,
    // Máximo número de reintentos
    maxRetries: 2,
    // Configuraciones adicionales para mejorar la precisión
    imagePreprocessing: {
      greyscale: true,
      sharpen: true,
      enhance: true
    }
  },
  
  // Configuración de modelos AI para OCR de placas
  miniCPM: {
    model: 'minicpm-v', // ✅ CONFIRMADO: MiniCPM-V es superior (100% vs 0% de LLaVA)
    ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
    maxRetries: 3,
    retryDelay: 1000, // milisegundos
    language: 'english', // Inglés para mejor precisión en estructuras JSON
    keepAlive: {
      enabled: process.env.OLLAMA_KEEP_ALIVE_ENABLED !== 'false',
      intervalMs: parseInt(process.env.OLLAMA_PING_INTERVAL || '120000'), // 2 minutos por defecto
      value: process.env.OLLAMA_KEEP_ALIVE || '30m'
    },
    request: {
      maxContextTokens: parseInt(process.env.OLLAMA_MAX_CONTEXT_TOKENS || '2048'),
      maxOutputTokens: parseInt(process.env.OLLAMA_MAX_OUTPUT_TOKENS || '64'),
      temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0),
      format: process.env.OLLAMA_RESPONSE_FORMAT || 'json'
    },
    plateCrop: {
      topOffset: 0.15,
      bottomMargin: 0.05,
      leftMargin: 0.05,
      rightMargin: 0.05,
      targetWidth: 640,
      jpegQuality: 72
    }
  },
  
  // Configuración de validación
  validation: {
    // Campos requeridos para considerar el resultado válido
    requiredFields: ['date', 'time', 'vehicle.plate'],
    // Patrones de validación
    patterns: {
      date: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      time: /^\d{1,2}:\d{2}:\d{2}$/,
      plate: /^[A-Z0-9\-]{4,10}$/i
    }
  },
  
  // Configuración de logging
  logging: {
    enabled: true,
    logRawText: true,
    logProcessingSteps: true
  }
};

// Configuración de patrones específicos para el parsing del header
export const HEADER_PATTERNS = {
  // Patrones para detectar información en español
  spanish: {
    date: [
      /Fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/
    ],
    time: [
      /Hora:\s*(\d{1,2}:\d{2}:\d{2})/i,
      /(\d{1,2}:\d{2}:\d{2})/
    ],
    location: [
      /Auto\s+Loc\d*:\s*([A-Z0-9_]+)/i,
      /Loc\d*:\s*([A-Z0-9_\-\s]+?)(?=\s+ID|$)/i,
      /Ubicaci[óo]n:\s*([^0-9\n]+?)(?=\s+[A-Z]|$)/i
    ],
    speedLimit: [
      /L[íi]mite\s+de\s+Velocidad:\s*(\d+\s*km\/h)/i,
      /L[íi]mite:\s*(\d+\s*km\/h)/i,
      /(\d+\s*km\/h).*l[íi]mite/i
    ],
    measuredSpeed: [
      /Velocidad:\s*[-~](\d+)\s*km\/h\s*\(DEP\)/i,
      /[-~](\d+)\s*km\/h\s*\(DEP\)/i,
      /Velocidad:\s*[-~]?(\d+)\s*km\/h/i,
      /Velocidad:\s*[-~]?(\d+\s*km\/h)/i
    ]
  }
};

export default { OCR_CONFIG, HEADER_PATTERNS };
