/***
 * Common types among the different subsystems
 *
 */
export declare type SessionId = string;
export declare type FunctionId = string;
export declare type ComputationKind = "RANKING" | "RANKING_DATASET" | "RANKING_DATASET_DELEGATED" | "FUNCTION_CALL" | "FUNCTION_CALL_DELEGATED";
/** minimal type for error reponses from an API */
export interface ErrorApiResponse {
    success: false;
    message: string;
}
