import { mkdir, access, rename } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const baseDir = process.env.FILES_BASE_DIR || process.cwd();
const processedDir = process.env.PROCESSED_FILES_DIR || 'processed-images';
export const PROCESSED_FILES_DIR = `${baseDir}/${processedDir}`;

export async function ensureProcessedDirectoryExists(): Promise<string> {
  const processingPath = PROCESSED_FILES_DIR;
  
  try {
    await access(processingPath, constants.F_OK);
  } catch {
    await mkdir(processingPath, { recursive: true });
  }
  
  return processingPath;
}

export function getProcessedFilePath(originalFilePath: string, cruise: string): string {
  const fileName = path.basename(originalFilePath);
  return path.join(PROCESSED_FILES_DIR, cruise, fileName);
}

export async function moveFileToProcessed(filePath: string, cruise: string): Promise<string> {

  try {
    // Verificar y crear el directorio base de procesados si no existe
    const processedBaseDir = await ensureProcessedDirectoryExists();
    // Construir la ruta de la subcarpeta del crucero
    const cruiseDir = path.join(PROCESSED_FILES_DIR, cruise);
    try {
      await access(cruiseDir, constants.F_OK);
    } catch {
      await mkdir(cruiseDir, { recursive: true });
      console.log(`Subcarpeta creada: ${cruiseDir}`);
    }
    console.log(`Directorio de procesados: ${processedBaseDir}`);

    // Verificar que el archivo origen existe
    await access(filePath, constants.F_OK);

    // Obtener la nueva ruta del archivo usando la función
    const newPath = getProcessedFilePath(filePath, cruise);
    console.log(`Ruta destino del archivo: ${newPath}`);

    // Mover el archivo
    await rename(filePath, newPath);
    console.log(`Archivo movido exitosamente a: ${newPath}`);

    return newPath;
  } catch (error) {
    console.error(`Error moviendo archivo ${filePath}:`, error);
    throw new Error(`Error moviendo archivo ${filePath}: ${JSON.stringify(error)}`);
  }
}

export function toRelativePath(absolutePath: string): string {

const normalizedAbsolute = path.normalize(absolutePath);
const normalizedBase = path.normalize(PROCESSED_FILES_DIR);

if (!normalizedAbsolute.startsWith(normalizedBase)) {
  return absolutePath;
}

const relativePath = normalizedAbsolute.substring(normalizedBase.length)
  .replace(/^[/\\]+/, '');

return relativePath;
}
