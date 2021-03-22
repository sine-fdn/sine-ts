import JIFFClient from 'jiff-mpc/lib/jiff-client.js';

const ZP = 24499973;

function mkRandomBytes(bytesNeeded) {
  const randomBytes = new Uint8Array(bytesNeeded);

  if (typeof window === "undefined") {
    return randomBytes;
  }

  return window.crypto.getRandomValues(randomBytes);
}

function random(max) {
  if (max > 562949953421312) {
    throw new RangeError("Max value should be smaller than or equal to 2^49");
  }

  const bitsNeeded = Math.ceil(Math.log(max) / Math.log(2));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const maxValue = Math.pow(256, bytesNeeded); // Keep trying until we find a random value within bounds

  while (true) {
    // eslint-disable-line
    const randomBytes = mkRandomBytes(bytesNeeded);
    let randomValue = 0;

    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = randomValue * 256 + randomBytes[i];
    } // randomValue should be smaller than largest multiple of max within maxBytes


    if (randomValue < maxValue - maxValue % max) {
      return randomValue % max;
    }
  }
}

function mod(x, y) {
  if (x < 0) {
    return x % y + y;
  }

  return x % y;
}

function computeShares(n, numParties, zP = ZP) {
  const randBits = Array.from({
    length: numParties - 1
  }, () => mod(random(zP), zP));
  const summed = randBits.reduce((lhs, rhs) => mod(lhs + rhs, zP), 0);
  const lastNumber = mod(n - summed, zP);
  randBits.push(lastNumber);
  return randBits;
}

/**
 * Accessor class to the Benchmarking API
 */

class Benchmarking {
  constructor({
    baseUrl = "https://benchmarking.sine.foundation",
    fetch = window.fetch
  }) {
    this.opts = {
      baseUrl
    };
    this.fetch = fetch;
  }
  /**
   * Creates a new Submission suitable for {newSubmission}
   *
   * @param template template data which is then distributed among the hosts in {processorHostnames}
   * @param processorHostnames list of hosts to share the {template} data with
   */


  computeSubmission(template, processorHostnames) {
    const shares = template.integerValues.map(v => computeShares(v, processorHostnames.length));
    return {
      data: processorHostnames.map((_, idx) => ({ ...template,
        integerValues: shares.map(share => share[idx])
      })),
      processorHostnames
    };
  }
  /**
   * submits data to a set of hosts. The {submission} typically stems from this.{computeSubmission}
   *
   * @param submission
   */


  async newSubmission(submission) {
    const {
      processorHostnames,
      data
    } = submission;

    if (processorHostnames.length === 0) {
      return {
        success: false,
        message: "No processors given"
      };
    }

    if (processorHostnames.length !== data.length) {
      return {
        success: false,
        message: "Unexpected args"
      };
    }

    const results = await Promise.all(processorHostnames.map((hostname, idx) => this.fetch(`${hostname}/api/v1/${data[idx].sessionId}`, {
      method: "POST",
      body: JSON.stringify(data[idx])
    }).then(async req => req.json().catch(error => ({
      success: false,
      message: `Failed to convert body from API. Error is: ${error}`
    })))));

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


  async newSession(data) {
    return this.fetch(`${this.opts.baseUrl}/api/v1`, {
      method: "POST",
      body: JSON.stringify(data)
    }).then(async req => req.json().catch(error => ({
      success: false,
      message: `Failed to convert body from API. Error is: ${error}`
    })));
  }
  /**
   * lists sessions by session status (pending, processing, finished), yielding a list of session ids
   * @param opts
   */


  async listSessions(opts) {
    const url = `${this.opts.baseUrl}/api/v1` + (opts.status ? `?status=${opts.status}` : "");
    return this.fetch(url).then(r => r.json()).catch(error => ({
      success: false,
      message: `Failed to parse server response: ${error}`
    }));
  }
  /**
   * retrieves metadata about a benchmarking session given a {SessionId}
   *
   * @param sessionId the sesssionId...
   */


  async getSession(sessionId) {
    return this.fetch(`${this.opts.baseUrl}/api/v1/${sessionId}`).then(r => r.json()).catch(error => ({
      success: false,
      message: `Failed to parse server response: ${error}`
    })).then(res => res.success ? Promise.resolve(res) : Promise.reject(res));
  }
  /**
   * listing of all existing datasets
   */


  async listDatasets() {
    const url = `${this.opts.baseUrl}/api/v1/benchmarking/dataset`;
    return this.fetch(url).then(r => r.json()).catch(error => ({
      success: false,
      message: `Failed to parse server response: ${error}`
    }));
  }
  /**
   * starts a benchmarking session against a pre-existing dataset
   * @param data cs
   */


  async newDatasetSession(datasetId, data) {
    return this.fetch(`${this.opts.baseUrl}/api/v1/benchmarking/dataset/${datasetId}/new_session`, {
      method: "POST",
      body: JSON.stringify(data)
    }).then(req => req.json()).catch(error => ({
      success: false,
      message: `Failed to convert body from API. Error is: ${error}`
    }));
  }
  /**
   * Starts a new MPC session to evaluate a named function
   *
   * @param functionId id of function to call
   */


  async newFunctionCall(functionId, delegated = false) {
    return this.fetch(`${this.opts.baseUrl}/api/v1/benchmarking/function/${functionId}/exec${delegated ? "?delegated" : ""}`, {
      method: "POST"
    }).then(req => req.json()).catch(error => ({
      success: false,
      message: `Failed to convert body from API. Error is: ${error}`
    }));
  }

}

class SINE {
  constructor({
    baseDomain = "sine.foundation"
  }) {
    this.opts = {
      baseDomain
    };
    this.benchmarking = new Benchmarking({
      baseUrl: `https://benchmarking.${this.opts.baseDomain}`
    });
  }

}

const DEFAULT_JIFF_OPTIONS = {
  crypto_provider: true,
  onError: function (_, error) {
    console.error("ERROR ", error);
  }
};
function connect({
  computationId,
  hostname,
  ...opts
}) {
  return new JIFFClient(hostname, computationId, { ...DEFAULT_JIFF_OPTIONS,
    ...opts
  });
}
async function share_dataset_secrets(jiff_instance, secrets, dataset_node_id, other_node_id) {
  const dataset = await jiff_instance.share_array(secrets);
  const referenceSecrets = dataset[other_node_id];
  const datasetSecrets = dataset[dataset_node_id];

  if (!referenceSecrets || !datasetSecrets) {
    console.log("dump", referenceSecrets, datasetSecrets, dataset);
    throw new Error("Protocol invariant(s) failed");
  }

  return {
    datasetSecrets,
    referenceSecrets
  };
}
function dotproduct(lhs, rhs) {
  if (lhs.length !== rhs.length) {
    throw new Error("Protocal invariant failed");
  }

  return lhs.reduce((prev, scalar, idx) => scalar.smult(rhs[idx]).add(prev), 0);
}
function sort(secrets_in) {
  function oddEvenSort(a, lo, n) {
    if (n > 1) {
      const m = Math.floor(n / 2);
      oddEvenSort(a, lo, m);
      oddEvenSort(a, lo + m, m);
      oddEvenMerge(a, lo, n, 1);
    }
  } // lo: lower bound of indices, n: number of elements, r: step


  function oddEvenMerge(a, lo, n, r) {
    const m = r * 2;

    if (m < n) {
      oddEvenMerge(a, lo, n, m);
      oddEvenMerge(a, lo + r, n, m);

      for (let i = lo + r; i + r < lo + n; i += m) {
        compareExchange(a, i, i + r);
      }
    } else {
      compareExchange(a, lo, lo + r);
    }
  }

  function compareExchange(a, i, j) {
    if (j >= a.length || i >= a.length) {
      return;
    }

    const x = a[i];
    const y = a[j];
    const cmp = x.gt(y);
    a[i] = cmp.if_else(x, y);
    a[j] = cmp.if_else(y, x);
  }

  const secrets = secrets_in.map(s => s.add(0));
  oddEvenSort(secrets, 0, secrets.length);
  return secrets;
}
function ranking(secrets_sorted, secrets) {
  const ranks = Array.from({
    length: secrets.length
  }, () => 0);

  for (let i = 0; i < secrets_sorted.length; i++) {
    for (let j = 0; j < secrets.length; j++) {
      const cmp = secrets_sorted[i].seq(secrets[j]);
      ranks[j] = cmp.if_else(i + 1, ranks[j]);
    }
  }

  return ranks; //TODO
}
function ranking_const(my_secret, secrets_sorted) {
  // construct a "0" w/o resorting to a jiff_client
  let result = my_secret.sub(my_secret);

  for (let i = 0; i < secrets_sorted.length; ++i) {
    const cmp = my_secret.sgt(secrets_sorted[i]);
    result = result.add(cmp);
  }

  return result;
}

var _static = /*#__PURE__*/Object.freeze({
  __proto__: null,
  connect: connect,
  share_dataset_secrets: share_dataset_secrets,
  dotproduct: dotproduct,
  sort: sort,
  ranking: ranking,
  ranking_const: ranking_const
});

const Zp = 24499973;
class MPCClient {
  constructor({
    client
  }) {
    this.client = client;
  }

  async performFunctionCall(functionId, secretInput, delegated) {
    const res = await this.client.newFunctionCall(functionId, delegated);

    if (!res.success) {
      return Promise.reject(res);
    }

    const sessionId = res.sessionId;
    const result = new Promise(resolve => {
      connect({
        computationId: sessionId,
        hostname: res.coordinatorUrl,
        party_id: delegated ? 3 : 2,
        party_count: delegated ? 3 : 2,
        Zp,
        onConnect: async jiff_instance => {
          const result = delegated ? await delegatedProtocol(jiff_instance, secretInput) : await functionCallProtocol(jiff_instance, secretInput);
          jiff_instance.disconnect(true, true);
          resolve(result);
        }
      });
    });
    return {
      sessionId,
      result
    };
  }

  async performBenchmarking(dataset, secretData, numShards) {
    const delegated = numShards !== undefined;
    const session = {
      title: dataset.name,
      numParties: delegated ? 3 : 2,
      input: dataset.dimensions.map(d => ({
        title: d,
        computation: "RANKING",
        options: numShards ? {
          delegated: true,
          numShards: 1,
          shardId: 0
        } : undefined
      }))
    };
    const sessionRes = await this.client.newDatasetSession(dataset.id, session);

    if (!sessionRes.success) {
      return Promise.reject(sessionRes);
    }

    const sessionId = sessionRes.id;
    return {
      sessionId,
      results: datasetBenchmarking(sessionRes.coordinatorUrl, sessionId, secretData, delegated).then(results => results.map(r => r + 1))
    };
  }

}

async function functionCallProtocol(jiff_instance, secretInput) {
  const secrets = await share_dataset_secrets(jiff_instance, secretInput, 1, 2);
  const rank = dotproduct(secrets.datasetSecrets, secrets.referenceSecrets);
  const [result] = await jiff_instance.open_array([rank]);
  return result;
}
/**
 * performs the MPC protocol against a single dimension
 * @param jiff_instance low-level MPC connection
 * @param secretInput user-level input vector (to remain secret)
 */


async function delegatedProtocol(jiff_instance, secretInput) {
  await jiff_instance.share_array(secretInput, undefined, undefined, [1, 2]);
  const rank = jiff_instance.reshare(undefined, undefined, [1, 2, 3], [1, 2]);
  return await jiff_instance.open(rank);
}

async function benchmarkingProtocolDirect(jiff_instance, secretInput) {
  const secrets = await share_dataset_secrets(jiff_instance, [secretInput], 1, 2);
  return await jiff_instance.open(ranking_const(secrets.referenceSecrets[0], secrets.datasetSecrets));
}

async function benchmarkingProtocol(jiff_instance, secretInput, delegated) {
  return await (delegated ? delegatedProtocol(jiff_instance, [secretInput]) : benchmarkingProtocolDirect(jiff_instance, secretInput));
}

async function datasetBenchmarking(coordinatorUrl, sessionId, secretData, delegated = false) {
  return new Promise(resolve => {
    connect({
      computationId: sessionId,
      hostname: coordinatorUrl,
      party_id: delegated ? 3 : 2,
      party_count: delegated ? 3 : 2,
      Zp,
      onConnect: async jiff_instance => {
        const res = [];

        for (const dimension in secretData) {
          res.push(await benchmarkingProtocol(jiff_instance, secretData[dimension], delegated));
        }

        jiff_instance.disconnect(true, true);
        resolve(res);
      }
    });
  });
}

export { Benchmarking, MPCClient, SINE, Zp, _static as mpc };
