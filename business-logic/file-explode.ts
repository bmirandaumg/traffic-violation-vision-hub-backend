import path from "path";

function resolvePath(filePath: string) {
  const pathSplit = filePath.split(path.sep); // Dividir la ruta en partes
  const cruise = pathSplit[1]; // Ejemplo: "2calle_Final_Oriente_Z_10"
  // const photoDateStr = pathSplit[1]; // Ejemplo: "15082024"
  const photoDateStr = pathSplit[2]; // Ejemplo: "15082024"
  // const cruise = pathSplit[2]; // Ejemplo: "2calle_Final_Oriente_Z_10"
  const photoName = path.basename(filePath); // Ejemplo: "16-03-2024-09-17-46-0.jpg"
  const date = processDate(photoDateStr); 
  return { date, cruise, photoName };
}

function processDate(dateStr: string) {
  console.log(`processDate: dateStr=${dateStr}`);
  if (dateStr.length !== 8) {
    throw new Error("Formato de fecha inválido. Se espera DDMMYYYY.");
  }
  const day = dateStr.slice(0, 2);
  const month = dateStr.slice(2, 4);
  const year = dateStr.slice(4, 8);
  const isoDate = `${year}-${month}-${day}`; // Sin usar Date
  console.log(`processDate: dateStr=${dateStr}, day=${day}, month=${month}, year=${year}, isoDate=${isoDate}`);
  return isoDate;
}

export { resolvePath };
