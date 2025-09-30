import path from "path";

function resolvePath(filePath) {
  const pathSplit = filePath.split(path.sep); // Dividir la ruta en partes
  const photoDateStr = pathSplit[1]; // Ejemplo: "15082024"
  const cruise = pathSplit[2]; // Ejemplo: "2calle_Final_Oriente_Z_10"
  const photoName = path.basename(filePath); // Ejemplo: "16-03-2024-09-17-46-0.jpg"
  const date = processDate(photoDateStr);
  return { date, cruise, photoName };
}

function processDate(dateStr) {
  if (dateStr.length !== 8) {
    throw new Error("Formato de fecha inválido. Se espera DDMMYYYY.");
  }
  const day = dateStr.slice(0, 2);
  const month = dateStr.slice(2, 4) - 1;
  const year = dateStr.slice(4, 8);
  return `${year}-${month}-${day}`; // Formato ISO: YYYY-MM-DD
}

export { resolvePath };
