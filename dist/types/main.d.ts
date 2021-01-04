import { Benchmarking } from "./benchmarking";
export interface SINEOpts {
    baseDomain?: string;
}
export declare class SINE {
    private readonly opts;
    readonly benchmarking: Benchmarking;
    constructor({ baseDomain }: SINEOpts);
}
