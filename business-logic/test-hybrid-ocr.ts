import { runOCR, runHeaderOCROnly, runPlateOCROnly, generateMetricsReport, exportMetricsData, resetMetrics } from './hybrid-ocr.js';
import path from 'path';
import fs from 'fs';

/**
 * Script de prueba para el sistema OCR híbrido
 * Procesa todas las imágenes de una carpeta especificada
 */
async function testHybridOCR() {
  console.log('🧪 === INICIANDO PRUEBAS DEL SISTEMA OCR HÍBRIDO ===\n');
  
  // Carpeta de prueba (ajustar según tu estructura)
  const testFolderPath = './images/06042025/Columpio_V_H_Oriente_Z_15';
  
  if (!fs.existsSync(testFolderPath)) {
    console.log('❌ No se encontró la carpeta de prueba en:', testFolderPath);
    console.log('📁 Carpetas disponibles en ./images/:');
    
    // Mostrar qué carpetas están disponibles
    try {
      const imagesDir = './images';
      if (fs.existsSync(imagesDir)) {
        const folders = fs.readdirSync(imagesDir);
        folders.forEach((folder: string) => {
          const folderPath = path.join(imagesDir, folder);
          if (fs.statSync(folderPath).isDirectory()) {
            const subfolders = fs.readdirSync(folderPath);
            subfolders.forEach((subfolder: string) => {
              const subfolderPath = path.join(folderPath, subfolder);
              if (fs.statSync(subfolderPath).isDirectory()) {
                const files = fs.readdirSync(subfolderPath).filter((file: string) => 
                  file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg') || file.toLowerCase().endsWith('.png')
                );
                if (files.length > 0) {
                  console.log(`   📁 ${folder}/${subfolder}/ - ${files.length} imagen(es)`);
                }
              }
            });
          }
        });
      }
    } catch (error) {
      console.log('Error listando carpetas:', error);
    }
    
    console.log('\n💡 Cambia la ruta testFolderPath en el archivo para usar una carpeta existente');
    return;
  }

  // Obtener todas las imágenes de la carpeta
  const imageFiles = fs.readdirSync(testFolderPath).filter((file: string) => 
    file.toLowerCase().endsWith('.jpg') || 
    file.toLowerCase().endsWith('.jpeg') || 
    file.toLowerCase().endsWith('.png')
  );

  if (imageFiles.length === 0) {
    console.log('❌ No se encontraron imágenes en la carpeta:', testFolderPath);
    return;
  }

  console.log(`📁 Carpeta de prueba: ${testFolderPath}`);
  console.log(`📷 Encontradas ${imageFiles.length} imágenes`);
  console.log('═'.repeat(80));

  const results: any[] = [];

  // Procesar cada imagen
  for (let i = 0; i < imageFiles.length; i++) {
    const imageFile = imageFiles[i];
    const imagePath = path.join(testFolderPath, imageFile);
    
    console.log(`\n🔄 [${i + 1}/${imageFiles.length}] Procesando: ${imageFile}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      
      // OCR Híbrido completo
      const hybridResult = await runOCR(imagePath);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Procesado en ${processingTime}ms`);
      console.log(`📊 Resultado:`, {
        fecha: hybridResult.date,
        hora: hybridResult.time,
        ubicacion: hybridResult.location,
        limitVel: hybridResult.speedLimit,
        velMedida: hybridResult.measuredSpeed,
        placa: hybridResult.vehicle.plate,
        headerOK: hybridResult.processingInfo?.headerOCRSuccess,
        placaOK: hybridResult.processingInfo?.plateOCRSuccess
      });

      results.push({
        file: imageFile,
        processingTime,
        result: hybridResult,
        success: hybridResult.processingInfo?.headerOCRSuccess && hybridResult.processingInfo?.plateOCRSuccess
      });

    } catch (error) {
      console.log(`❌ Error procesando ${imageFile}:`, error);
      results.push({
        file: imageFile,
        error: error,
        success: false
      });
    }
  }

  // Resumen final
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 === RESUMEN DE RESULTADOS ===');
  console.log('═'.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const avgTime = results
    .filter(r => r.processingTime)
    .reduce((sum, r) => sum + r.processingTime, 0) / Math.max(1, results.filter(r => r.processingTime).length);

  console.log(`📈 Procesadas: ${results.length} imágenes`);
  console.log(`✅ Exitosas: ${successful} (${Math.round(successful/results.length*100)}%)`);
  console.log(`❌ Fallidas: ${failed} (${Math.round(failed/results.length*100)}%)`);
  console.log(`⏱️  Tiempo promedio: ${Math.round(avgTime)}ms por imagen`);
  
  if (failed > 0) {
    console.log('\n❌ Archivos con errores:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.file}: ${r.error || 'Error desconocido'}`);
    });
  }

  console.log('\n✅ === PRUEBAS COMPLETADAS ===');
}

// Ejecutar pruebas si este archivo se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const inputPath = args[0];
    
    // Verificar si es un archivo o una carpeta
    if (fs.existsSync(inputPath)) {
      const stats = fs.statSync(inputPath);
      
      if (stats.isFile()) {
        console.log('🎯 Modo: Imagen individual');
        testSingleImage(inputPath)
          .then(() => process.exit(0))
          .catch((error) => {
            console.error('💥 Error en prueba individual:', error);
            process.exit(1);
          });
      } else if (stats.isDirectory()) {
        console.log('🎯 Modo: Carpeta completa');
        // Modificar la función para usar la carpeta pasada como argumento
        console.log('🧪 === INICIANDO PRUEBAS DEL SISTEMA OCR HÍBRIDO ===\n');
        
        // Usar la ruta pasada como argumento
        const testFolderPath = inputPath;
        
        // Aquí iría el mismo código de testHybridOCR pero usando testFolderPath del argumento
        // Por simplicidad, llamamos la función original y actualizamos la ruta internamente
        testHybridOCRWithCustomPath(testFolderPath)
          .then(() => process.exit(0))
          .catch((error) => {
            console.error('💥 Error fatal en las pruebas:', error);
            process.exit(1);
          });
      }
    } else {
      console.error('❌ La ruta especificada no existe:', inputPath);
      console.log('\n💡 Uso:');
      console.log('  Carpeta completa: npx ts-node test-hybrid-ocr.ts ./path/to/folder');
      console.log('  Imagen individual: npx ts-node test-hybrid-ocr.ts ./path/to/image.jpg');
      process.exit(1);
    }
  } else {
    console.log('🎯 Modo: Carpeta predeterminada');
    testHybridOCR()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('💥 Error fatal en las pruebas:', error);
        process.exit(1);
      });
  }
}

// Función auxiliar para usar ruta personalizada
async function testHybridOCRWithCustomPath(customPath: string) {
  const testFolderPath = customPath;
  
  if (!fs.existsSync(testFolderPath)) {
    console.log('❌ No se encontró la carpeta de prueba en:', testFolderPath);
    return;
  }

  // Reutilizar la lógica de testHybridOCR pero con la ruta personalizada
  const imageFiles = fs.readdirSync(testFolderPath).filter((file: string) => 
    file.toLowerCase().endsWith('.jpg') || 
    file.toLowerCase().endsWith('.jpeg') || 
    file.toLowerCase().endsWith('.png')
  );

  if (imageFiles.length === 0) {
    console.log('❌ No se encontraron imágenes en la carpeta:', testFolderPath);
    return;
  }

  // Reiniciar métricas para esta sesión de prueba
  resetMetrics();
  
  console.log(`📁 Carpeta de prueba: ${testFolderPath}`);
  console.log(`📷 Encontradas ${imageFiles.length} imágenes`);
  console.log('🧪 Iniciando nueva sesión de métricas...');
  console.log('═'.repeat(80));

  const results: any[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const imageFile = imageFiles[i];
    const imagePath = path.join(testFolderPath, imageFile);
    
    console.log(`\n🔄 [${i + 1}/${imageFiles.length}] Procesando: ${imageFile}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const hybridResult = await runOCR(imagePath);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Procesado en ${processingTime}ms`);
      console.log(`📊 Resultado:`, {
        fecha: hybridResult.date,
        hora: hybridResult.time,
        ubicacion: hybridResult.location,
        limitVel: hybridResult.speedLimit,
        velMedida: hybridResult.measuredSpeed,
        placa: hybridResult.vehicle.plate,
        headerOK: hybridResult.processingInfo?.headerOCRSuccess,
        placaOK: hybridResult.processingInfo?.plateOCRSuccess
      });

      results.push({
        file: imageFile,
        processingTime,
        result: hybridResult,
        success: hybridResult.processingInfo?.headerOCRSuccess && hybridResult.processingInfo?.plateOCRSuccess
      });

    } catch (error) {
      console.log(`❌ Error procesando ${imageFile}:`, error);
      results.push({
        file: imageFile,
        error: error,
        success: false
      });
    }
  }

  // Resumen final (mismo código)
  console.log('\n═'.repeat(80));
  console.log('📊 === RESUMEN DE RESULTADOS ===');
  console.log('═'.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const avgTime = results
    .filter(r => r.processingTime)
    .reduce((sum, r) => sum + r.processingTime, 0) / Math.max(1, results.filter(r => r.processingTime).length);

  console.log(`📈 Procesadas: ${results.length} imágenes`);
  console.log(`✅ Exitosas: ${successful} (${Math.round(successful/results.length*100)}%)`);
  console.log(`❌ Fallidas: ${failed} (${Math.round(failed/results.length*100)}%)`);
  console.log(`⏱️  Tiempo promedio: ${Math.round(avgTime)}ms por imagen`);
  
  if (failed > 0) {
    console.log('\n❌ Archivos con errores:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.file}: ${r.error || 'Error desconocido'}`);
    });
  }

  // Generar reporte detallado de métricas
  console.log('\n' + generateMetricsReport());

  // Exportar métricas como JSON para análisis posterior
  const metricsData = exportMetricsData();
  const metricsFileName = `metrics-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
  
  try {
    fs.writeFileSync(metricsFileName, JSON.stringify(metricsData, null, 2));
    console.log(`💾 Métricas exportadas a: ${metricsFileName}`);
  } catch (error) {
    console.log('⚠️ No se pudieron exportar las métricas:', error);
  }

  console.log('\n✅ === PRUEBAS COMPLETADAS ===');
}

/**
 * Prueba una sola imagen específica con análisis detallado
 */
async function testSingleImage(imagePath: string) {
  console.log('🧪 === PRUEBA DE IMAGEN INDIVIDUAL ===\n');
  
  if (!fs.existsSync(imagePath)) {
    console.log('❌ No se encontró la imagen:', imagePath);
    return;
  }

  console.log('📸 Imagen:', path.basename(imagePath));
  console.log('📁 Ruta completa:', imagePath);
  console.log('─'.repeat(60));

  try {
    // Prueba 1: OCR Híbrido completo
    console.log('\n🔄 Prueba 1: OCR Híbrido Completo');
    const hybridResult = await runOCR(imagePath);
    console.log('Resultado híbrido:', JSON.stringify(hybridResult, null, 2));

    // Prueba 2: Solo OCR del header (Tesseract)
    console.log('\n🔄 Prueba 2: Solo OCR del Header (Tesseract)');
    try {
      const headerResult = await runHeaderOCROnly(imagePath);
      console.log('Resultado header:', JSON.stringify(headerResult, null, 2));
    } catch (error) {
      console.log('❌ Error en OCR del header:', error);
    }

    // Prueba 3: Solo OCR de placa (MiniCPM-V)
    console.log('\n🔄 Prueba 3: Solo OCR de Placa (MiniCPM-V)');
    try {
      const plateResult = await runPlateOCROnly(imagePath);
      console.log('Resultado placa:', JSON.stringify(plateResult, null, 2));
    } catch (error) {
      console.log('❌ Error en OCR de placa:', error);
    }

    console.log('\n✅ === PRUEBA INDIVIDUAL COMPLETADA ===');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

export { testHybridOCR, testSingleImage };