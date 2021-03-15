import {
  DatasetListingApiSuccessResponse,
  NewSession,
} from "../benchmarking/types";
import { FunctionId, SessionId } from "../types";
import { Benchmarking } from "./../benchmarking/main";
import * as mpc from "./static";

export interface MPCClientOpts {
  client: Benchmarking;
  coordinatorUrl: string;
}

export interface BenchmarkingResult {
  results: Promise<number[]>;
  sessionId: string;
}

export interface FunctionCallResult {
  sessionId: string;
  result: Promise<number>;
}

type Dataset = DatasetListingApiSuccessResponse["datasets"][0];

export class MPCClient {
  private readonly client: Benchmarking;
  private readonly coordinatorUrl: string;

  constructor({ client, coordinatorUrl }: MPCClientOpts) {
    this.client = client;
    this.coordinatorUrl = coordinatorUrl;
  }

  async performFunctionCall(
    functionId: FunctionId,
    secretInput: number[]
  ): Promise<FunctionCallResult> {
    const res = await this.client.newFunctionCall(functionId);
    if (!res.success) {
      return Promise.reject(res);
    }

    const sessionId = res.sessionId;

    const result: Promise<number> = new Promise((resolve) => {
      mpc.connect({
        computationId: sessionId,
        hostname: this.coordinatorUrl,
        party_id: 2,
        party_count: 2,
        onConnect: async (jiff_instance: JIFFClient) => {
          console.log("connected!");

          const result = await functionCallProtocol(jiff_instance, secretInput);
          const res = await jiff_instance.open_array([result]);
          console.log("result is: ", res);

          jiff_instance.disconnect(true, true);
          resolve(res[0]);
        },
      });
    });

    return {
      sessionId,
      result,
    };
  }

  async performBenchmarking(
    dataset: Dataset,
    secretData: number[],
    numShards?: number
  ): Promise<BenchmarkingResult> {
    const delegated = numShards !== undefined;
    const session: NewSession = {
      title: dataset.name,
      numParties: delegated ? 3 : 2,
      input: dataset.dimensions.map((d) => ({
        title: d,
        computation: "RANKING",
        options: numShards
          ? {
              delegated: true,
              numShards: 1,
              shardId: 0,
            }
          : undefined,
      })),
    };

    const sessionRes = await this.client.newDatasetSession(dataset.id, session);
    if (!sessionRes.success) {
      return Promise.reject(sessionRes);
    }
    const sessionId = sessionRes.id;
    return {
      sessionId,
      results: datasetBenchmarking(
        this.coordinatorUrl,
        sessionId,
        secretData,
        delegated
      ).then((results) => results.map((r) => r + 1)),
    };
  }
}

async function functionCallProtocol(
  jiff_instance: JIFFClient,
  secretInput: number[]
): Promise<SecretShare> {
  const secrets = await mpc.share_dataset_secrets(
    jiff_instance,
    secretInput,
    1,
    2
  );

  return mpc.dotproduct(secrets.datasetSecrets, secrets.referenceSecrets);
}

/**
 * performs the MPC protocol against a single dimension
 * @param jiff_instance low-level MPC connection
 * @param secretInput user-level input vector (to remain secret)
 */
async function benchmarkingProtocolDelegated(
  jiff_instance: JIFFClient,
  secretInput: number
): Promise<number> {
  await jiff_instance.share_array([secretInput], undefined, undefined, [1, 2]);
  const rank = jiff_instance.reshare(undefined, undefined, [1, 2, 3], [1, 2]);
  return await jiff_instance.open(rank);
}

async function benchmarkingProtocolDirect(
  jiff_instance: JIFFClient,
  secretInput: number
): Promise<number> {
  const secrets = await mpc.share_dataset_secrets(
    jiff_instance,
    [secretInput],
    1,
    2
  );

  return await jiff_instance.open(
    mpc.ranking_const(secrets.referenceSecrets[0], secrets.datasetSecrets)
  );
}

async function benchmarkingProtocol(
  jiff_instance: JIFFClient,
  secretInput: number,
  delegated: boolean
): Promise<number> {
  return await (delegated
    ? benchmarkingProtocolDelegated(jiff_instance, secretInput)
    : benchmarkingProtocolDirect(jiff_instance, secretInput));
}

async function datasetBenchmarking(
  coordinatorUrl: string,
  sessionId: SessionId,
  secretData: number[],
  delegated = false
): Promise<number[]> {
  return new Promise((resolve) => {
    mpc.connect({
      computationId: sessionId,
      hostname: coordinatorUrl,
      party_id: delegated ? 3 : 2,
      party_count: delegated ? 3 : 2,
      onConnect: async (jiff_instance: JIFFClient) => {
        const res: number[] = [];
        for (const dimension in secretData) {
          res.push(
            await benchmarkingProtocol(
              jiff_instance,
              secretData[dimension],
              delegated
            )
          );
        }

        jiff_instance.disconnect(true, true);
        resolve(res);
      },
    });
  });
}
