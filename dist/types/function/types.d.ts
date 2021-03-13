import { ErrorApiResponse, FunctionId, SessionId } from "./../types";
export declare type FunctionCallApiResponse = ErrorApiResponse | FunctionCallApiSuccessResponse;
export interface FunctionMetadata {
    id: FunctionId;
    inputs: string[];
    outputs: string[];
}
export interface FunctionCallApiSuccessResponse {
    success: true;
    sessionId: SessionId;
}
export declare type FunctionListingApiResponse = ErrorApiResponse | FunctionListingApiSuccessResponse;
export interface FunctionListingApiSuccessResponse {
    success: true;
    functions: FunctionMetadata[];
}
