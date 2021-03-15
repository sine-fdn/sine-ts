import { DatasetListingApiSuccessResponse } from "../benchmarking/types";
import { Benchmarking } from "./../benchmarking/main";
export interface MPCClientOpts {
    client: Benchmarking;
    coordinatorUrl: string;
}
export interface BenchmarkingResult {
    results: Promise<number[]>;
    sessionId: string;
}
declare type Dataset = DatasetListingApiSuccessResponse["datasets"][0];
export declare class MPCClient {
    private readonly client;
    private readonly coordinatorUrl;
    constructor({ client, coordinatorUrl }: MPCClientOpts);
    performBenchmarking(dataset: Dataset, secretData: number[], numShards?: number): Promise<BenchmarkingResult>;
}
export {};
