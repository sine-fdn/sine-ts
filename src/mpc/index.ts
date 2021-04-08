import { BigNumber } from "bignumber.js";
import {
  DatasetListingApiSuccessResponse,
  NewSession,
} from "../benchmarking/types";
import { FunctionId, SessionId } from "../types";
import { Benchmarking } from "./../benchmarking/main";
import * as mpc from "./static";
import { quantile } from "./stats";
import {
  BenchmarkingRank,
  BenchmarkingResult,
  FunctionCallResult,
} from "./types";

export * from "./types";

/**
 * ZP-1 (sic!) is the maximum representable value
 */
export const Zp = "2199023255531";

type Dataset = DatasetListingApiSuccessResponse["datasets"][0];

export interface MPCClientOpts {
  client: Benchmarking;
}

/**
 * High-level MPC protocol client
 */
export class MPCClient {
  private readonly client: Benchmarking;

  constructor({ client }: MPCClientOpts) {
    this.client = client;
  }

  /**
   * performs call to a named function
   * @param functionId ID of the function to be called
   * @param secretInput secret input to the function call
   * @param delegated whether the function shall be evaluated server-sided only (delegated === TRUE); iff delegated === FALSE, then the entity calling this function will participate in the function evaluation as well
   * @returns Result of the function call :)
   */
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

    const result: Promise<number> = new Promise((resolve, reject) => {
      mpc.connect({
        computationId: sessionId,
        hostname: res.coordinatorUrl,
        party_id: delegated ? 3 : 2,
        party_count: delegated ? 3 : 2,
        Zp,
        onConnect: async (jiff_instance: JIFFClient) => {
          try {
            const result = delegated
              ? await delegatedProtocol(jiff_instance, secretInput)
              : await functionCallProtocol(jiff_instance, secretInput);

            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            jiff_instance.disconnect(true, true);
          }
        },
      });
    });

    return {
      sessionId,
      result,
    };
  }

  /**
   * performs benchmarking against a named dataset given private input(s)
   *
   * Benchmarking here means that a ranking from lowest to highest. The input for the
   * ranking comes from the entity calling into this function.
   *
   * @param dataset the data set to call into ; typically a SDK result from fetching dataset metadata info
   * @param secretData the secret input to be compared
   * @param numShards number of shards to use for performing the benchmarking. If this value is defined, then the "delegated" protocol is used, which means the actual comparisons are carried out only by the backend systems under S-MPC. The parameter also denotes whether "sharding" of the reference data set shall be performed, i.e. whether data comparisons shall be performed in parallel.
   * @returns a {BenchmarkingResult}; i.e. a session id and a promise of the computation result
   */
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
  try {
    const secrets = await mpc.share_dataset_secrets(
      jiff_instance,
      secretInput,
      1,
      2
    );

    const rank = mpc.dotproduct(
      secrets.datasetSecrets,
      secrets.referenceSecrets
    );
    const [result] = await jiff_instance
      .open_array([rank])
      .then((ranks: BigNumber[]) => ranks.map((r) => r.toNumber()));

    return result;
  } catch (error) {
    return Promise.reject(error);
  }
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
  await jiff_instance.share_array(
    secretInput.map((i) => new BigNumber(i)),
    undefined,
    undefined,
    [1, 2]
  );
  const rank = jiff_instance.reshare(undefined, undefined, [1, 2, 3], [1, 2]);
  return jiff_instance.open(rank).then((b: BigNumber) => b.toNumber());
}

async function benchmarkingProtocolDelegated(
  jiff_instance: JIFFClient,
  secretInput: number
): Promise<BenchmarkingRank> {
  await jiff_instance.share_array(
    [new BigNumber(secretInput)],
    undefined,
    undefined,
    [1, 2]
  );
  const rank = jiff_instance.reshare(undefined, undefined, [1, 2, 3], [1, 2]);
  const rankResult =
    (await jiff_instance.open(rank).then((b: BigNumber) => b.toNumber())) + 1;
  const datasetSizes = jiff_instance.share(
    new BigNumber(0),
    undefined,
    [3],
    [1, 2]
  );
  const datasetSize = await jiff_instance
    .open(datasetSizes[1])
    .then((b: BigNumber) => b.toNumber());

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
    (await jiff_instance
      .open(
        mpc.ranking_const(secrets.referenceSecrets[0], secrets.datasetSecrets)
      )
      .then((b: BigNumber) => b.toNumber())) + 1;
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
  return new Promise((resolve, reject) => {
    mpc.connect({
      computationId: sessionId,
      hostname: coordinatorUrl,
      party_id: delegated ? 3 : 2,
      party_count: delegated ? 3 : 2,
      Zp,
      onConnect: async (jiff_instance: JIFFClient) => {
        try {
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

          resolve(res);
        } catch (error) {
          reject(error);
        } finally {
          jiff_instance.disconnect(true, true);
        }
      },
    });
  });
}
