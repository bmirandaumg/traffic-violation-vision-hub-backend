# Sistema OCR Híbrido para Análisis de Fotomultas

## 📋 Descripción

Este sistema utiliza una arquitectura híbrida que combina dos tecnologías de OCR para maximizar la precisión y eficiencia en el análisis de fotomultas:

- **Tesseract.js**: Para extraer información del header (fecha, hora, ubicación, velocidades)
- **MiniCPM-V con Ollama**: Para identificar placas de vehículos

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Imagen de Fotomulta                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 hybrid-ocr.ts (Orchestrator)               │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   tesseract-ocr.ts      │   │  ai-image-recognition.ts│
│   ┌─────────────────┐   │   │  ┌─────────────────┐    │
│   │ Recorta Header  │   │   │  │ Analiza Imagen  │    │
│   │ (15% superior)  │   │   │  │ Completa        │    │
│   └─────────────────┘   │   │  └─────────────────┘    │
│   ┌─────────────────┐   │   │  ┌─────────────────┐    │
│   │ OCR Tradicional │   │   │  │ Extrae Solo     │    │
│   │ (Tesseract)     │   │   │  │ Placa           │    │
│   └─────────────────┘   │   │  └─────────────────┘    │
└─────────────────────────┘   └─────────────────────────┘
                │                           │
                ▼                           ▼
      ┌─────────────────┐         ┌─────────────────┐
      │ Header Info     │         │ Vehicle Plate   │
      │ - date          │         │ - plate         │
      │ - time          │         └─────────────────┘
      │ - location      │
      │ - speedLimit    │
      │ - measuredSpeed │
      └─────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                ┌─────────────────────────┐
                │   Resultado Combinado   │
                │   (JSON Estructura)     │
                └─────────────────────────┘
```

## 📁 Estructura de Archivos

```
business-logic/
├── hybrid-ocr.ts              # Orquestador principal
├── tesseract-ocr.ts           # OCR tradicional para header
├── ai-image-recognition.ts    # OCR con IA para placas
└── ocr-config.ts              # Configuraciones del sistema

Nota: El antiguo script de pruebas `test-hybrid-ocr.ts` fue retirado durante la simplificación. Las pruebas ahora se realizan ejecutando directamente el watcher o invocando las funciones desde un script temporal.
```

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

Proyecto inicializado con Bun. Instala dependencias (incluye sharp y tesseract.js declaradas en package.json si corresponde):

```bash
bun install
```

### 2. Configurar Variables de Entorno

Asegúrate de que tu archivo `.env` contenga las configuraciones necesarias:

```env
FILES_BASE_DIR=/ruta/del/proyecto
IMAGES_DIR=images
PROCESSED_FILES_DIR=processed-images
```

### 3. Configurar Ollama (MiniCPM-V)

Requisitos:
1. Ollama instalado
2. Modelo descargado:
  ```bash
  ollama pull minicpm-v
  ```
3. Servidor en ejecución (generalmente automático). Si necesitas arrancarlo manualmente:
  ```bash
  ollama serve
  ```

## 📖 Uso

### Uso Básico (desde código)

```typescript
import { runOCR } from './business-logic/hybrid-ocr';

async function procesarImagen() {
  const resultado = await runOCR('./path/to/image.jpg');
  console.log(resultado);
}
```

### Uso Avanzado (APIs internas)

```typescript
import { 
  runHybridOCR, 
  runHeaderOCROnly, 
  runPlateOCROnly 
} from './business-logic/hybrid-ocr';

// OCR completo híbrido
const completo = await runHybridOCR('./image.jpg');

// Solo header
const header = await runHeaderOCROnly('./image.jpg');

// Solo placa
const placa = await runPlateOCROnly('./image.jpg');
```

## 🔧 Configuración

El archivo `ocr-config.ts` permite personalizar el comportamiento del sistema:

```typescript
export const OCR_CONFIG = {
  tesseract: {
    language: 'spa',              // Idioma para Tesseract
    headerCropPercentage: 0.15,   // % de imagen para header
    maxRetries: 2                 // Reintentos máximos
  },
  miniCPM: {
    model: 'minicpm-v',          // Modelo de IA
    maxRetries: 3,               // Reintentos máximos
    retryDelay: 1000             // Delay entre reintentos
  }
};
```

## 📊 Estructura de Respuesta

```typescript
interface CompleteOCRResult {
  date: string;              // Fecha (DD/MM/YYYY)
  time: string;              // Hora (HH:MM:SS)
  location: string;          // Ubicación
  speedLimit: string;        // Límite de velocidad
  measuredSpeed: string;     // Velocidad medida
  vehicle: {
    plate: string;           // Placa del vehículo
  };
  fileName?: string;         // Nombre del archivo
  processingInfo?: {         // Información de procesamiento
    headerOCRSuccess: boolean;
    plateOCRSuccess: boolean;
    errors?: string[];
  };
}
```

## 🧪 Pruebas

El script dedicado de pruebas fue eliminado. Opciones actuales:

1. Colocar imágenes nuevas en el árbol observado (`./images/...`) y ejecutar el watcher:
  ```bash
  bun run index.ts
  ```
2. Crear un script temporal, por ejemplo `scripts/manual-test.ts`:
  ```typescript
  import { runOCR } from '../business-logic/hybrid-ocr';
  const main = async () => {
    const r = await runOCR('./processed-images/ejemplo.jpg');
    console.log(r);
  };
  main();
  ```
  Y ejecutarlo:
  ```bash
  bun run scripts/manual-test.ts
  ```
3. Para depurar solo header o placa: usar `runHeaderOCROnly` o `runPlateOCROnly` en un script similar.

Si más adelante se necesita un runner formal se puede reintroducir uno bajo `scripts/`.

## 💡 Ventajas del Sistema Híbrido

### ✅ Tesseract para Header
- **Velocidad**: Más rápido para texto estructurado
- **Precisión**: Excelente para números y texto claro
- **Confiabilidad**: Menos dependiente de conectividad
- **Costo**: Gratuito y local

### ✅ MiniCPM-V para Placas
- **Contexto**: Entiende el contexto visual de vehículos
- **Flexibilidad**: Maneja placas en diferentes ángulos/condiciones
- **Inteligencia**: Puede inferir placas parcialmente ocultas

### ✅ Combinación
- **Eficiencia**: Cada herramienta hace lo que mejor sabe hacer
- **Robustez**: Si una falla, la otra puede compensar
- **Escalabilidad**: Fácil de ajustar y optimizar por separado

## 🔍 Troubleshooting

### Problemas Comunes

1. **Tesseract no encuentra texto**
   - Verificar calidad de imagen
   - Ajustar `headerCropPercentage` en configuración
   - Revisar patrones en `HEADER_PATTERNS`

2. **MiniCPM-V no detecta placa**
   - Verificar que Ollama esté corriendo
   - Confirmar que el modelo está disponible
   - Revisar conectividad

3. **Errores de formato**
   - Verificar que las imágenes estén en formato JPG/PNG
   - Confirmar rutas de archivos
   - Revisar permisos de archivos

## 📈 Monitoreo y Logs

El sistema incluye logging detallado:

```typescript
// Habilitar logs en ocr-config.ts
export const OCR_CONFIG = {
  logging: {
    enabled: true,
    logRawText: true,          // Ver texto crudo extraído
    logProcessingSteps: true   // Ver pasos de procesamiento
  }
};
```

## 🔄 Migración desde Sistema Anterior

Si vienes del sistema anterior (solo MiniCPM-V), el cambio es transparente:

```typescript
// Antes
import { runOCR } from './business-logic/ai-image-recognition';

// Ahora
import { runOCR } from './business-logic/hybrid-ocr';

// El API es el mismo, pero internamente usa el sistema híbrido
```

## 🎯 Próximas Mejoras (Backlog sugerido)

- [ ] Cache / memo de placas recientes (evitar reprocesar mismas imágenes)
- [ ] Validación cruzada simple (heurísticas sobre longitud de placa y patrón regional)
- [ ] Modo degradado si IA de placa falla (solo header)
- [ ] Interfaz web ligera (preview + JSON)
- [ ] Soporte adicional: WebP / HEIC (si surge necesidad)

Nota: Métricas detalladas fueron desactivadas al eliminar el módulo de métricas. Si se requieren nuevamente, se puede reintroducir un collector ligero solo con tiempos promedio y tasa de éxito.