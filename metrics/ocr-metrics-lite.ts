// business-logic/ocr-metrics-lite.ts
class OCRMetricsLite {
  headerTimes: number[] = [];
  plateTimes: number[] = [];
  headerSuccess: number = 0;
  plateSuccess: number = 0;
  total: number = 0;

  record(headerMs: number, plateMs: number, headerOk: boolean, plateOk: boolean) {
    this.headerTimes.push(headerMs);
    this.plateTimes.push(plateMs);
    this.total++;
    if (headerOk) this.headerSuccess++;
    if (plateOk) this.plateSuccess++;
  }

  getSummary() {
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : '0';
    return {
      total: this.total,
      headerSuccess: this.headerSuccess,
      plateSuccess: this.plateSuccess,
      avgHeaderMs: avg(this.headerTimes),
      avgPlateMs: avg(this.plateTimes),
      headerRate: this.total ? ((this.headerSuccess / this.total) * 100).toFixed(1) : '0',
      plateRate: this.total ? ((this.plateSuccess / this.total) * 100).toFixed(1) : '0'
    };
  }

  printSummary() {
    const s = this.getSummary();
    console.log(`\n📊 OCR Métricas:`);
    console.log(`Procesadas: ${s.total} | Header OK: ${s.headerSuccess} (${s.headerRate}%) | Placa OK: ${s.plateSuccess} (${s.plateRate}%)`);
    console.log(`Promedio header: ${s.avgHeaderMs}ms | Promedio placa: ${s.avgPlateMs}ms\n`);
  }
}

export const ocrMetricsLite = new OCRMetricsLite();