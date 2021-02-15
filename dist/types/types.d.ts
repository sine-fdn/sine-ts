/***
 * Common types among the different subsystems
 *
 */
export declare type SessionId = string;
export declare type FunctionId = string;
export declare type ComputationKind = "RANKING" | "FUNCTION_CALL";
/** minimal type for error reponses from an API */
export interface ErrorApiResponse {
    success: false;
    message: string;
}
