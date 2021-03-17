import { DatasetListingApiSuccessResponse } from "../benchmarking/types";
import { FunctionId } from "../types";
import { Benchmarking } from "./../benchmarking/main";
export interface MPCClientOpts {
    client: Benchmarking;
    coordinatorUrl: string;
}
export interface BenchmarkingResult {
    results: Promise<number[]>;
    sessionId: string;
}
export interface FunctionCallResult {
    sessionId: string;
    result: Promise<number>;
}
declare type Dataset = DatasetListingApiSuccessResponse["datasets"][0];
export declare class MPCClient {
    private readonly client;
    private readonly coordinatorUrl;
    constructor({ client, coordinatorUrl }: MPCClientOpts);
    performFunctionCall(functionId: FunctionId, secretInput: number[], delegated: boolean): Promise<FunctionCallResult>;
    performBenchmarking(dataset: Dataset, secretData: number[], numShards?: number): Promise<BenchmarkingResult>;
}
export {};
