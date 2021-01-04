'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
    return this.fetch(url).then(r => r.json())
    /*.catch((error) => ({
    success: false,
    message: `Failed to parse server response: ${error}`,
    }))*/
    .then(res => res.success ? Promise.resolve(res) : Promise.reject(res));
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

exports.Benchmarking = Benchmarking;
exports.SINE = SINE;
