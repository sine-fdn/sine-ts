import { GetSessionApiResponse, NewBenchmarkingSubmission, NewSession, NewSessionApiResponse, SplitSubmission, NewSubmissionApiResponse, SessionListingApiResponse, DatasetListingApiResponse } from "./types";
export interface BenchmarkingOpts {
    baseUrl?: string;
    fetch?: Window["fetch"];
}
export interface ListSessionsOpts {
    status?: "processing" | "finished";
}
/**
 * Accessor class to the Benchmarking API
 */
export declare class Benchmarking {
    private readonly opts;
    private readonly fetch;
    constructor({ baseUrl, fetch, }: BenchmarkingOpts);
    /**
     * Creates a new Submission suitable for {newSubmission}
     *
     * @param template template data which is then distributed among the hosts in {processorHostnames}
     * @param processorHostnames list of hosts to share the {template} data with
     */
    computeSubmission(template: NewBenchmarkingSubmission, processorHostnames: string[]): SplitSubmission;
    /**
     * submits data to a set of hosts. The {submission} typically stems from this.{computeSubmission}
     *
     * @param submission
     */
    newSubmission(submission: SplitSubmission): Promise<NewSubmissionApiResponse>;
    /**
     * creates a new benchmarking session, yielding a {SessionId}.
     * @param data description of the benchmarking session
     */
    newSession(data: NewSession): Promise<NewSessionApiResponse>;
    /**
     * lists sessions by session status (pending, processing, finished), yielding a list of session ids
     * @param opts
     */
    listSessions(opts: ListSessionsOpts): Promise<SessionListingApiResponse>;
    /**
     * retrieves metadata about a benchmarking session given a {SessionId}
     *
     * @param sessionId the sesssionId...
     */
    getSession(sessionId: string): Promise<GetSessionApiResponse>;
    /**
     * listing of all existing datasets
     */
    listDatasets(): Promise<DatasetListingApiResponse>;
    /**
     * starts a benchmarking session against a pre-existing dataset
     * @param data cs
     */
    newDatasetSession(datasetId: string, data: NewSession): Promise<NewSessionApiResponse>;
}
