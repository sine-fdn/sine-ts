import { CoordinatorUrl } from "./../types";
import { ComputationKind, ErrorApiResponse, SessionId } from "../types";
export interface NewBenchmarkingSubmission {
    sessionId: SessionId;
    submitter: string;
    integerValues: number[];
}
export interface SplitSubmission {
    processorHostnames: string[];
    data: NewBenchmarkingSubmission[];
}
export declare type NewSubmissionApiResponse = {
    success: true;
    id: string;
} | ErrorApiResponse;
export declare type ComputationOptions = BenchmarkingComputationOptions;
export interface BenchmarkingComputationOptions {
    delegated: true;
    numShards: number;
    shardId: number;
}
/**
 * description of a new benchmarking session
 */
export interface NewSession {
    title: string;
    numParties: number;
    input: {
        title: string;
        computation: ComputationKind;
        options?: ComputationOptions;
    }[];
}
export declare type NewSessionApiResponse = {
    success: true;
    id: SessionId;
} | ErrorApiResponse;
export declare type NewDatasetSessionApiResponse = {
    success: true;
    id: SessionId;
    coordinatorUrl: CoordinatorUrl;
} | ErrorApiResponse;
/**
 * API response when GET'ing list of sessions
 */
export declare type SessionListingApiResponse = SessionListingApiSuccessResponse | ErrorApiResponse;
export interface SessionListingApiSuccessResponse {
    success: true;
    sessions: {
        title: string;
        id: string;
        numParties: number;
        numSubmissions: number;
    }[];
}
export declare type DatasetListingApiResponse = DatasetListingApiSuccessResponse | ErrorApiResponse;
export interface DatasetListingApiSuccessResponse {
    success: true;
    datasets: {
        name: string;
        id: string;
        dimensions: string[];
        inputDimensions: string[];
    }[];
}
export declare type GetSessionApiResponse = GetSessionApiSuccessResponse | ErrorApiResponse;
export declare type ProcessingStatus = "PENDING" | "PROCESSING" | "FINISHED" | "FINISHED_WITH_ERROR";
export interface GetSessionApiSuccessResponse {
    success: true;
    id: string;
    title: string;
    numParties: number;
    inputTitles: string[];
    processorHostnames: string[];
    inputComputations: ComputationKind[];
    process: {
        status: ProcessingStatus;
    } | null;
    submissions: {
        submitter: string;
    }[];
    results: {
        integerResults: number[];
        submission: {
            submitter: string;
        };
    }[];
}
