declare module "jiff-mpc/lib/jiff-client.js";
declare module "jiff-mpc/lib/ext/jiff-client-bignumber.js";

declare type JIFFClientOptions = {
  Zp?: number | string;
  party_id: number;
  party_count: number;
  crypto_provider?: boolean;
  autoConnect?: boolean;
  onError?: (jiff_instance: JIFFClient, error: Error) => void;
  onConnect: (cl: JIFFClient) => void;
};

declare class SecretShare {
  add(n: BigNumber | SecretShare): SecretShare;
  sadd(n: BigNumber | SecretShare): SecretShare;
  sub(s: SecretShare | number): SecretShare;
  smult(s: SecretShare): SecretShare;
  sdiv(s: SecretShare): SecretShare;

  gt(n: BigNumber | SecretShare): SecretShare;
  sgt(s: SecretShare): SecretShare;
  if_else(t: BigNumber | SecretShare, f: number | SecretShare): SecretShare;
  seq(s: SecretShare): SecretShare;
}

declare class JIFFClient {
  constructor(
    hostname: string,
    computation_id: string,
    options: JIFFClientOptions
  );

  party_count: number;

  share(
    secret: BigNumber,
    threshold?: number,
    receivers_list?: number[],
    senders_list?: number[]
  ): { [party_id: string]: SecretShare };
  open(s: SecretShare, parties?: number[], op_id?: string): Promise<BigNumber>;
  share_array(
    secrets: BigNumber[],
    length?: number,
    threshold?: number,
    receivers_list?: number[],
    senders_list?: number[],
    Zp?: number,
    op_id?: string
  ): Promise<{ [party_id: string]: SecretShare[] }>;

  reshare(
    s?: SecretShare,
    threshold?: number,
    receivers_list?: number[],
    senders_list?: number[],
    Zp?: number,
    op_id?: string
  ): SecretShare;
  open_array(shares: SecretShare[]): Promise<BigNumber[]>;

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
