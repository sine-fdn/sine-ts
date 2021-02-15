import { ErrorApiResponse, FunctionId, SessionId } from "./../types";

export type FunctionCallApiResponse =
  | ErrorApiResponse
  | FunctionCallApiSuccessResponse;

export interface FunctionMetadata {
  id: FunctionId;
  inputs: string[];
  outputs: string[];
}

export interface FunctionCallApiSuccessResponse {
  success: true;
  sessionId: SessionId;
}

export type FunctionListingApiResponse =
  | ErrorApiResponse
  | FunctionListingApiSuccessResponse;

export interface FunctionListingApiSuccessResponse {
  success: true;
  functions: FunctionMetadata[];
}

/** HTTP POST body for a function creation request */
export type NewFunctionRequest = FunctionMetadata & {
  inputMatrix: number[][];
};

/** API response from creating a new function */
export type NewFunctionApiResponse =
  | ErrorApiResponse
  | NewFunctionApiSuccessResponse;

/** success response after creating a new function :-) */
export interface NewFunctionApiSuccessResponse {
  success: true;
}
