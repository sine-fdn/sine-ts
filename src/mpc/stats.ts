import { BenchmarkingQuantile } from "./types";

export function quantile(
  rank: number,
  datasetSize: number
): BenchmarkingQuantile {
  if (datasetSize == 0) return 1;

  const r = Math.max(1, rank > datasetSize ? datasetSize : rank);
  const q = Math.ceil((r / datasetSize) * Math.min(datasetSize, 10));
  return q as BenchmarkingQuantile;
}
