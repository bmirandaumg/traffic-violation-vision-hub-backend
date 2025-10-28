import { mkdir, access, rename, copyFile, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const baseDir = process.env.FILES_BASE_DIR || process.cwd();
const processedDir = process.env.PROCESSED_FILES_DIR || 'processed-images';
export const PROCESSED_FILES_DIR = path.join(baseDir, processedDir);

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
  const sourcePath = path.isAbsolute(filePath) ? filePath : path.join(baseDir, filePath);
  const destinationPath = getProcessedFilePath(sourcePath, cruise);

  try {
    const processedBaseDir = await ensureProcessedDirectoryExists();

    const cruiseDir = path.join(PROCESSED_FILES_DIR, cruise);
    try {
      await access(cruiseDir, constants.F_OK);
    } catch {
      await mkdir(cruiseDir, { recursive: true });
      console.log(`Subcarpeta creada: ${cruiseDir}`);
    }
    console.log(`Directorio de procesados: ${processedBaseDir}`);

    try {
      await access(sourcePath, constants.F_OK);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Archivo ya no existe (posiblemente procesado previamente): ${sourcePath}`);
        return destinationPath;
      }
      throw error;
    }

    console.log(`Ruta destino del archivo: ${destinationPath}`);
    try {
      await rename(sourcePath, destinationPath);
    } catch (error) {
      if (typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'EXDEV') {
        await copyFile(sourcePath, destinationPath);
        await unlink(sourcePath);
      } else {
        throw error;
      }
    }
    console.log(`Archivo movido exitosamente a: ${destinationPath}`);

    return destinationPath;
  } catch (error) {
    console.error(`Error moviendo archivo ${sourcePath}:`, error);
    throw new Error(`Error moviendo archivo ${sourcePath}: ${JSON.stringify(error)}`);
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
