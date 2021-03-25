import { DatasetListingApiSuccessResponse } from "../benchmarking/types";
import { FunctionId } from "../types";
import { Benchmarking } from "./../benchmarking/main";
export declare const Zp = "32416190071";
export interface MPCClientOpts {
    client: Benchmarking;
}
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
declare type Dataset = DatasetListingApiSuccessResponse["datasets"][0];
export declare class MPCClient {
    private readonly client;
    constructor({ client }: MPCClientOpts);
    performFunctionCall(functionId: FunctionId, secretInput: number[], delegated: boolean): Promise<FunctionCallResult>;
    performBenchmarking(dataset: Dataset, secretData: number[], numShards?: number): Promise<BenchmarkingResult>;
}
export {};
