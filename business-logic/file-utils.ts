import { mkdir, access, rename } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const baseDir = process.env.FILES_BASE_DIR || process.cwd();
const processedDir = process.env.PROCESSED_FILES_DIR || 'processed-images';
export const PROCESSED_FILES_DIR = `${baseDir}/${processedDir}`;

export async function ensureProcessedDirectoryExists(): Promise<string> {
  const processingPath = path.join(process.cwd(), PROCESSED_FILES_DIR);
  
  try {
    await access(processingPath, constants.F_OK);
  } catch {
    await mkdir(processingPath, { recursive: true });
  }
  
  return processingPath;
}

export function getProcessedFilePath(originalFilePath: string): string {
  const fileName = path.basename(originalFilePath);
  return path.join(process.cwd(), PROCESSED_FILES_DIR, fileName);
}

export async function moveFileToProcessed(filePath: string): Promise<string> {
  try {
    // Verificar y crear el directorio si no existe
    const processedDir = await ensureProcessedDirectoryExists();
    console.log(`Directorio de procesados: ${processedDir}`);
    
    // Verificar que el archivo origen existe
    await access(filePath, constants.F_OK);
    
    // Obtener la nueva ruta del archivo
    const newPath = getProcessedFilePath(filePath);
    
    // Mover el archivo
    await rename(filePath, newPath);
    console.log(`Archivo movido exitosamente a: ${newPath}`);
    
    return newPath;
  } catch (error) {
    throw new Error(`Error moviendo archivo ${filePath}: ${JSON.stringify(error)}`);
  }
}

export function toRelativePath(absolutePath: string): string {
  const currentDir = process.cwd();
  // Normalizar las rutas para manejar diferentes separadores de directorios
  const normalizedAbsolute = path.normalize(absolutePath);
  const normalizedCurrent = path.normalize(currentDir);
  
  // Si la ruta absoluta no comienza con el directorio actual, retornar la ruta original
  if (!normalizedAbsolute.startsWith(normalizedCurrent)) {
    return absolutePath;
  }
  
  // Remover el directorio actual y cualquier separador inicial
  const relativePath = normalizedAbsolute.substring(normalizedCurrent.length)
    .replace(/^[/\\]+/, '');
  
  return relativePath;
}
