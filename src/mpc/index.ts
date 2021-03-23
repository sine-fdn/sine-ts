import {
  DatasetListingApiSuccessResponse,
  NewSession,
} from "../benchmarking/types";
import { FunctionId, SessionId } from "../types";
import { Benchmarking } from "./../benchmarking/main";
import * as mpc from "./static";

export const Zp = 24499973;

export interface MPCClientOpts {
  client: Benchmarking;
}

export type BenchmarkingQuantile = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/** result of a benchmark computation */
export interface BenchmarkingRank {
  rank: number;
  quantile: BenchmarkingQuantile;
}

export interface BenchmarkingResult {
  results: Promise<BenchmarkingRank[]>;
  sessionId: string;
}

export interface FunctionCallResult {
  sessionId: string;
  result: Promise<number>;
}

type Dataset = DatasetListingApiSuccessResponse["datasets"][0];

export class MPCClient {
  private readonly client: Benchmarking;

  constructor({ client }: MPCClientOpts) {
    this.client = client;
  }

  async performFunctionCall(
    functionId: FunctionId,
    secretInput: number[],
    delegated: boolean
  ): Promise<FunctionCallResult> {
    const res = await this.client.newFunctionCall(functionId, delegated);
    if (!res.success) {
      return Promise.reject(res);
    }

    const sessionId = res.sessionId;

    const result: Promise<number> = new Promise((resolve) => {
      mpc.connect({
        computationId: sessionId,
        hostname: res.coordinatorUrl,
        party_id: delegated ? 3 : 2,
        party_count: delegated ? 3 : 2,
        Zp,
        onConnect: async (jiff_instance: JIFFClient) => {
          const result = delegated
            ? await delegatedProtocol(jiff_instance, secretInput)
            : await functionCallProtocol(jiff_instance, secretInput);

          jiff_instance.disconnect(true, true);
          resolve(result);
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
        sessionRes.coordinatorUrl,
        sessionId,
        secretData,
        delegated
      ),
    };
  }
}

async function functionCallProtocol(
  jiff_instance: JIFFClient,
  secretInput: number[]
): Promise<number> {
  const secrets = await mpc.share_dataset_secrets(
    jiff_instance,
    secretInput,
    1,
    2
  );

  const rank = mpc.dotproduct(secrets.datasetSecrets, secrets.referenceSecrets);
  const [result] = await jiff_instance.open_array([rank]);

  return result;
}

/**
 * performs the MPC protocol against a single dimension
 * @param jiff_instance low-level MPC connection
 * @param secretInput user-level input vector (to remain secret)
 */
async function delegatedProtocol(
  jiff_instance: JIFFClient,
  secretInput: number[]
): Promise<number> {
  await jiff_instance.share_array(secretInput, undefined, undefined, [1, 2]);
  const rank = jiff_instance.reshare(undefined, undefined, [1, 2, 3], [1, 2]);
  return jiff_instance.open(rank);
}

function quantile(rank: number, datasetSize: number): BenchmarkingQuantile {
  console.log("quantile", rank, datasetSize);
  if (datasetSize == 0) return 1;

  const q = 1 + Math.floor((rank / datasetSize) * 10);
  return Math.max(1, Math.min(10, q)) as BenchmarkingQuantile;
}

async function benchmarkingProtocolDelegated(
  jiff_instance: JIFFClient,
  secretInput: number
): Promise<BenchmarkingRank> {
  await jiff_instance.share_array([secretInput], undefined, undefined, [1, 2]);
  const rank = jiff_instance.reshare(undefined, undefined, [1, 2, 3], [1, 2]);
  const rankResult = (await jiff_instance.open(rank)) + 1;
  const datasetSizes = jiff_instance.share(0, undefined, [3], [1, 2]);
  const datasetSize = await jiff_instance.open(datasetSizes[1]);

  return { rank: rankResult, quantile: quantile(rankResult, datasetSize) };
}

async function benchmarkingProtocolDirect(
  jiff_instance: JIFFClient,
  secretInput: number
): Promise<BenchmarkingRank> {
  const secrets = await mpc.share_dataset_secrets(
    jiff_instance,
    [secretInput],
    1,
    2
  );

  const datasetSize = secrets.datasetSecrets.length + 1;
  const rank =
    (await jiff_instance.open(
      mpc.ranking_const(secrets.referenceSecrets[0], secrets.datasetSecrets)
    )) + 1;
  return { rank, quantile: quantile(rank, datasetSize) };
}

async function benchmarkingProtocol(
  jiff_instance: JIFFClient,
  secretInput: number,
  delegated: boolean
): Promise<BenchmarkingRank> {
  return await (delegated
    ? benchmarkingProtocolDelegated(jiff_instance, secretInput)
    : benchmarkingProtocolDirect(jiff_instance, secretInput));
}

async function datasetBenchmarking(
  coordinatorUrl: string,
  sessionId: SessionId,
  secretData: number[],
  delegated = false
): Promise<BenchmarkingRank[]> {
  return new Promise((resolve) => {
    mpc.connect({
      computationId: sessionId,
      hostname: coordinatorUrl,
      party_id: delegated ? 3 : 2,
      party_count: delegated ? 3 : 2,
      Zp,
      onConnect: async (jiff_instance: JIFFClient) => {
        const res: BenchmarkingRank[] = [];

        for (const dimension in secretData) {
          res.push(
            await benchmarkingProtocol(
              jiff_instance,
              secretData[dimension],
              delegated
            )
          );
        }

        console.log("res", res);

        jiff_instance.disconnect(true, true);
        resolve(res);
      },
    });
  });
}
