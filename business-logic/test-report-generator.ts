import { generateThesisReport } from './thesis-report-generator.js';

// Generar reporte con el archivo de métricas actual
const metricsFile = './metrics/metrics-2025-10-10T05-59-03.json';
const outputDir = './reports';

console.log('🚀 Generando reporte de tesis...');
generateThesisReport(metricsFile, outputDir);