import computeShares from "./computeShares";
import {
  GetSessionApiResponse,
  NewBenchmarkingSubmission,
  NewSession,
  NewSessionApiResponse,
  SplitSubmission,
  NewSubmissionApiResponse,
  SessionListingApiResponse,
  DatasetListingApiResponse,
} from "./types";

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
export class Benchmarking {
  private readonly opts: BenchmarkingOpts;
  private readonly fetch: Window["fetch"];

  constructor({
    baseUrl = "https://benchmarking.sine.foundation",
    fetch = window.fetch,
  }: BenchmarkingOpts) {
    this.opts = { baseUrl };
    this.fetch = fetch;
  }

  /**
   * Creates a new Submission suitable for {newSubmission}
   *
   * @param template template data which is then distributed among the hosts in {processorHostnames}
   * @param processorHostnames list of hosts to share the {template} data with
   */
  computeSubmission(
    template: NewBenchmarkingSubmission,
    processorHostnames: string[]
  ): SplitSubmission {
    const shares = template.integerValues.map((v) =>
      computeShares(v, processorHostnames.length)
    );

    return {
      data: processorHostnames.map((_, idx) => ({
        ...template,
        integerValues: shares.map((share) => share[idx]),
      })),
      processorHostnames,
    };
  }

  /**
   * submits data to a set of hosts. The {submission} typically stems from this.{computeSubmission}
   *
   * @param submission
   */
  async newSubmission(
    submission: SplitSubmission
  ): Promise<NewSubmissionApiResponse> {
    const { processorHostnames, data } = submission;
    if (processorHostnames.length === 0) {
      return { success: false, message: "No processors given" };
    }
    if (processorHostnames.length !== data.length) {
      return { success: false, message: "Unexpected args" };
    }

    const results = await Promise.all(
      processorHostnames.map((hostname, idx) =>
        this.fetch(`${hostname}/api/v1/${data[idx].sessionId}`, {
          method: "POST",
          body: JSON.stringify(data[idx]),
        }).then(
          async (req) =>
            req.json().catch((error) => ({
              success: false,
              message: `Failed to convert body from API. Error is: ${error}`,
            })) as Promise<NewSubmissionApiResponse>
        )
      )
    );

    for (const idx in results) {
      if (!results[idx].success) {
        return results[idx];
      }
    }

    return results[0];
  }

  /**
   * creates a new benchmarking session, yielding a {SessionId}.
   * @param data description of the benchmarking session
   */
  async newSession(data: NewSession): Promise<NewSessionApiResponse> {
    return this.fetch(`${this.opts.baseUrl}/api/v1`, {
      method: "POST",
      body: JSON.stringify(data),
    }).then(async (req) =>
      req.json().catch((error) => ({
        success: false,
        message: `Failed to convert body from API. Error is: ${error}`,
      }))
    );
  }

  /**
   * lists sessions by session status (pending, processing, finished), yielding a list of session ids
   * @param opts
   */
  async listSessions(
    opts: ListSessionsOpts
  ): Promise<SessionListingApiResponse> {
    const url =
      `${this.opts.baseUrl}/api/v1` +
      (opts.status ? `?status=${opts.status}` : "");

    return this.fetch(url)
      .then((r) => r.json())
      .catch((error) => ({
        success: false,
        message: `Failed to parse server response: ${error}`,
      }));
  }

  /**
   * retrieves metadata about a benchmarking session given a {SessionId}
   *
   * @param sessionId the sesssionId...
   */
  async getSession(sessionId: string): Promise<GetSessionApiResponse> {
    return this.fetch(`${this.opts.baseUrl}/api/v1/${sessionId}`)
      .then((r) => r.json())
      .catch((error) => ({
        success: false,
        message: `Failed to parse server response: ${error}`,
      }))
      .then((res: GetSessionApiResponse) =>
        res.success ? Promise.resolve(res) : Promise.reject(res)
      );
  }

  /**
   * listing of all existing datasets
   */
  async listDatasets(): Promise<DatasetListingApiResponse> {
    const url = `${this.opts.baseUrl}/api/v1/benchmarking/dataset`;

    return this.fetch(url)
      .then((r) => r.json())
      .catch((error) => ({
        success: false,
        message: `Failed to parse server response: ${error}`,
      }));
  }

  /**
   * starts a benchmarking session against a pre-existing dataset
   * @param data cs
   */
  async newDatasetSession(
    datasetId: string,
    data: NewSession
  ): Promise<NewSessionApiResponse> {
    return fetch(
      `${this.opts.baseUrl}/api/v1/benchmarking/dataset/${datasetId}/new_session`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    )
      .then((req) => req.json())
      .catch((error) => ({
        success: false,
        message: `Failed to convert body from API. Error is: ${error}`,
      }));
  }
}
