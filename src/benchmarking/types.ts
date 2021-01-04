import { ErrorApiResponse } from "../types";

export type SessionId = string;

export interface NewBenchmarkingSubmission {
  sessionId: SessionId;
  submitter: string;
  integerValues: number[];
}

export interface SplitSubmission {
  processorHostnames: string[];
  data: NewBenchmarkingSubmission[];
}

export type NewSubmissionApiResponse =
  | { success: true; id: string }
  | ErrorApiResponse;

export type ComputationKind = "RANKING";

export interface NewSession {
  title: string;
  numParties: number;
  input: {
    title: string;
    computation: ComputationKind;
  }[];
}

export type NewSessionApiResponse =
  | { success: true; id: SessionId }
  | ErrorApiResponse;

/**
 * API response when GET'ing list of sessions
 */
export type SessionListingApiResponse =
  | SessionListingApiSuccessResponse
  | ErrorApiResponse;

export interface SessionListingApiSuccessResponse {
  success: true;
  sessions: {
    title: string;
    id: string;
    numParties: number;
    numSubmissions: number;
  }[];
}

export type GetSessionApiResponse =
  | GetSessionApiSuccessResponse
  | ErrorApiResponse;

export type ProcessingStatus =
  | "PENDING"
  | "PROCESSING"
  | "FINISHED"
  | "FINISHED_WITH_ERROR";

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
