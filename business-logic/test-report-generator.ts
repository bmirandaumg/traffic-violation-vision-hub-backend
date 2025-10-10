import { generateThesisReport } from './thesis-report-generator.js';

// Generar reporte con el archivo de métricas actual
const metricsFile = './metrics-2025-10-10T05-59-03.json';
const outputDir = './reportes_tesis';

console.log('🚀 Generando reporte de tesis...');
generateThesisReport(metricsFile, outputDir);