import JIFFClient from 'jiff-mpc/lib/jiff-client.js';

const ZP = 16777729;

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
    return fetch(`${this.opts.baseUrl}/api/v1/benchmarking/dataset/${datasetId}/new_session`, {
      method: "POST",
      body: JSON.stringify(data)
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
async function share_dataset_secrets(jiff_instance, transform, secrets, dataset_node_id, other_node_id) {
  const [allTransforms, dataset] = await Promise.all([jiff_instance.share_array(transform), jiff_instance.share_array(secrets)]);
  const datasetSecrets = dataset[dataset_node_id];
  const transformSecrets = allTransforms[dataset_node_id];
  const otherSecrets = allTransforms[other_node_id];

  if (!otherSecrets || !transformSecrets || otherSecrets.length != transformSecrets.length || transformSecrets.length == 0) {
    throw new Error("Input data invariant(s) failed");
  } // perform dot-product


  const referenceSecret = transformSecrets.reduce((prev, scalar, idx) => scalar.mult(otherSecrets[idx]).add(prev), 0);
  return {
    datasetSecrets,
    referenceSecret
  };
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

var index = /*#__PURE__*/Object.freeze({
  __proto__: null,
  connect: connect,
  share_dataset_secrets: share_dataset_secrets,
  sort: sort,
  ranking: ranking,
  ranking_const: ranking_const
});

export { Benchmarking, SINE, index as mpc };
