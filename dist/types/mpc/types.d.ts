export declare type BenchmarkingQuantile = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/** result of a benchmark computation */
export interface BenchmarkingRank {
    rank: number;
    quantile: BenchmarkingQuantile;
}
export interface BenchmarkingResult {
    results: Promise<BenchmarkingRank[]>;
    sessionId: string;
}
export interface FunctionCallResult {
    sessionId: string;
    result: Promise<number>;
}
