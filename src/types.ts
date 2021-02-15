/***
 * Common types among the different subsystems
 *
 */

export type SessionId = string;

export type FunctionId = string;

export type ComputationKind = "RANKING" | "FUNCTION_CALL";

/** minimal type for error reponses from an API */
export interface ErrorApiResponse {
  success: false;
  message: string;
}
