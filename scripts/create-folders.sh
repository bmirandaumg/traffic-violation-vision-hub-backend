#!/usr/bin/env bash
set -euo pipefail

BASE_IMAGES="/app/images"
BASE_PROCESSED="/app/processed-images"
CRUISES=(
  "Columpio_V_H_Oriente_Z_15"
  "7_avenida_zona_12"
  "Anillo_Perferico_Sur_Z_11"
  "Anillo_Periferico_Norte_Z_7"
  "Anillo_Periferico_Sur_Z_7"
  "Atanasio_Tzul_Norte_zona_12"
  "Atanasio_Tzul_Sur_zona_12"
  "Av_Las_Americas_Norte_zona_14"
  "2calle_Final_Oriente_Z_10"
  "Avenida_Hincapie_Sur_Z_13"
)

mkdir -p "$BASE_IMAGES" "$BASE_PROCESSED"

for cruise in "${CRUISES[@]}"; do
  mkdir -p "$BASE_IMAGES/$cruise"
  mkdir -p "$BASE_PROCESSED/$cruise"
done
