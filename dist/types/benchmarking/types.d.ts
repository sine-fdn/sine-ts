import { ErrorApiResponse } from "../types";
export declare type SessionId = string;
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
export declare type ComputationKind = "RANKING";
export interface NewSession {
    title: string;
    numParties: number;
    input: {
        title: string;
        computation: ComputationKind;
    }[];
}
export declare type NewSessionApiResponse = {
    success: true;
    id: SessionId;
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
