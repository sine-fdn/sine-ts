import { Benchmarking } from "./benchmarking";

export interface SINEOpts {
  baseDomain?: string;
}

export class SINE {
  private readonly opts: SINEOpts;

  public readonly benchmarking: Benchmarking;

  constructor({ baseDomain = "sine.foundation" }: SINEOpts) {
    this.opts = {
      baseDomain,
    };
    this.benchmarking = new Benchmarking({
      baseUrl: `https://benchmarking.${this.opts.baseDomain}`,
    });
  }
}
