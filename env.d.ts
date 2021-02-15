declare module "jiff-mpc/lib/jiff-client.js";

declare type JIFFClientOptions = {
  Zp?: number;
  party_id: number;
  party_count: number;
  crypto_provider?: boolean;
  onError?: (jiff_instance: JIFFClient, error: Error) => void;
  onConnect: (cl: JIFFClient) => void;
};

declare class SecretShare {
  add(n: number | SecretShare): SecretShare;
  sadd(n: number | SecretShare): SecretShare;
  sub(s: SecretShare | number): SecretShare;
  smult(s: SecretShare): SecretShare;
  sdiv(s: SecretShare): SecretShare;

  gt(n: number | SecretShare): SecretShare;
  sgt(s: SecretShare): SecretShare;
  if_else(t: number | SecretShare, f: number | SecretShare): SecretShare;
  seq(s: SecretShare): SecretShare;
}

declare class JIFFClient {
  constructor(
    hostname: string,
    computation_id: string,
    options: JIFFClientOptions
  );

  party_count: number;

  share(secret: number): { [party_id: string]: SecretShare };
  open(s: SecretShare): Promise<number>;
  share_array(
    secrets: number[],
    length?: number
  ): { [party_id: string]: SecretShare[] };
  open_array(shares: SecretShare[]): Promise<number[]>;

  disconnect(safe?: boolean, free?: boolean): void;

  preprocessing(
    dependent_op: string,
    count: number = 1,
    protocols: Record<string, unknown> | undefined = undefined,
    threshold: number | undefined = undefined,
    receivers_list: number[] | undefined = undefined,
    compute_list: number[] | undefined = undefined,
    Zp: number | undefined = undefined,
    id_list: number | undefined = undefined,
    params: Record<string, unknown> | undefined = undefined
  );
  executePreprocessing(fn: () => unknown);
}
