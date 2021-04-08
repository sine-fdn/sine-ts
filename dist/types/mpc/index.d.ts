import { DatasetListingApiSuccessResponse } from "../benchmarking/types";
import { FunctionId } from "../types";
import { Benchmarking } from "./../benchmarking/main";
import { BenchmarkingResult, FunctionCallResult } from "./types";
export * from "./types";
/**
 * ZP-1 (sic!) is the maximum representable value
 */
export declare const Zp = "2199023255531";
declare type Dataset = DatasetListingApiSuccessResponse["datasets"][0];
export interface MPCClientOpts {
    client: Benchmarking;
}
/**
 * High-level MPC protocol client
 */
export declare class MPCClient {
    private readonly client;
    constructor({ client }: MPCClientOpts);
    /**
     * performs call to a named function
     * @param functionId ID of the function to be called
     * @param secretInput secret input to the function call
     * @param delegated whether the function shall be evaluated server-sided only (delegated === TRUE); iff delegated === FALSE, then the entity calling this function will participate in the function evaluation as well
     * @returns Result of the function call :)
     */
    performFunctionCall(functionId: FunctionId, secretInput: number[], delegated: boolean): Promise<FunctionCallResult>;
    /**
     * performs benchmarking against a named dataset given private input(s)
     *
     * Benchmarking here means that a ranking from lowest to highest. The input for the
     * ranking comes from the entity calling into this function.
     *
     * @param dataset the data set to call into ; typically a SDK result from fetching dataset metadata info
     * @param secretData the secret input to be compared
     * @param numShards number of shards to use for performing the benchmarking. If this value is defined, then the "delegated" protocol is used, which means the actual comparisons are carried out only by the backend systems under S-MPC. The parameter also denotes whether "sharding" of the reference data set shall be performed, i.e. whether data comparisons shall be performed in parallel.
     * @returns a {BenchmarkingResult}; i.e. a session id and a promise of the computation result
     */
    performBenchmarking(dataset: Dataset, secretData: number[], numShards?: number): Promise<BenchmarkingResult>;
}
