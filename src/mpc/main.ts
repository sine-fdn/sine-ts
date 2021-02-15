import JIFFClient from "jiff-mpc/lib/jiff-client.js";

const DEFAULT_JIFF_OPTIONS: Partial<JIFFClientOptions> = {
  crypto_provider: true,
  onError: function (_, error: Error) {
    console.error("ERROR ", error);
  },
};

interface ConnectProps extends JIFFClientOptions {
  computationId: string;
  hostname: string;
}

export function connect({
  computationId,
  hostname,
  ...opts
}: ConnectProps): JIFFClient {
  return new JIFFClient(hostname, computationId, {
    ...DEFAULT_JIFF_OPTIONS,
    ...opts,
  });
}

interface ShareSecretsResult {
  datasetSecrets: SecretShare[];
  referenceSecret: SecretShare;
}

export async function share_dataset_secrets(
  jiff_instance: JIFFClient,
  input_transform: number[],
  unit_transform: number[],
  secrets: number[],
  dataset_node_id: number,
  other_node_id: number
): Promise<ShareSecretsResult> {
  const [allTransforms, unitTransforms, dataset] = await Promise.all([
    jiff_instance.share_array(input_transform),
    jiff_instance.share_array(unit_transform),
    jiff_instance.share_array(secrets),
  ]);

  const transformSecrets = allTransforms[dataset_node_id];
  const unitTransformSecrets = unitTransforms[dataset_node_id];
  const inputSecrets = dataset[other_node_id];
  const datasetSecrets = dataset[dataset_node_id];

  if (
    !inputSecrets ||
    !transformSecrets ||
    inputSecrets.length != transformSecrets.length ||
    (unitTransformSecrets.length > 0 &&
      inputSecrets.length !== unitTransformSecrets.length) ||
    transformSecrets.length == 0
  ) {
    console.log("oooh");
    throw new Error("Input data invariant(s) failed");
  }

  // perform dot-product on input transforms x input
  const input = dotproduct(transformSecrets, inputSecrets);
  const referenceSecret =
    unitTransformSecrets.length === 0
      ? input
      : input.sdiv(dotproduct(unitTransformSecrets, inputSecrets));

  return {
    datasetSecrets,
    referenceSecret,
  };
}

function dotproduct(lhs: SecretShare[], rhs: SecretShare[]): SecretShare {
  return lhs.reduce<SecretShare | number>(
    (prev, scalar, idx) => scalar.smult(rhs[idx]).add(prev),
    0
  ) as SecretShare;
}

export function sort(secrets_in: SecretShare[]): SecretShare[] {
  function oddEvenSort(a: SecretShare[], lo: number, n: number) {
    if (n > 1) {
      const m = Math.floor(n / 2);
      oddEvenSort(a, lo, m);
      oddEvenSort(a, lo + m, m);
      oddEvenMerge(a, lo, n, 1);
    }
  }

  // lo: lower bound of indices, n: number of elements, r: step
  function oddEvenMerge(a: SecretShare[], lo: number, n: number, r: number) {
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

  function compareExchange(a: SecretShare[], i: number, j: number) {
    if (j >= a.length || i >= a.length) {
      return;
    }

    const x = a[i];
    const y = a[j];

    const cmp = x.gt(y);
    a[i] = cmp.if_else(x, y);
    a[j] = cmp.if_else(y, x);
  }

  const secrets = secrets_in.map((s) => s.add(0));
  oddEvenSort(secrets, 0, secrets.length);
  return secrets;
}

export function ranking(
  secrets_sorted: SecretShare[],
  secrets: SecretShare[]
): SecretShare[] {
  const ranks: (number | SecretShare)[] = Array.from(
    { length: secrets.length },
    () => 0
  );

  for (let i = 0; i < secrets_sorted.length; i++) {
    for (let j = 0; j < secrets.length; j++) {
      const cmp = secrets_sorted[i].seq(secrets[j]);
      ranks[j] = cmp.if_else(i + 1, ranks[j]);
    }
  }

  return ranks as SecretShare[]; //TODO
}

export function ranking_const(
  my_secret: SecretShare,
  secrets_sorted: SecretShare[]
): SecretShare {
  // construct a "0" w/o resorting to a jiff_client
  let result = my_secret.sub(my_secret);

  for (let i = 0; i < secrets_sorted.length; ++i) {
    const cmp = my_secret.sgt(secrets_sorted[i]);
    result = result.add(cmp);
  }

  return result;
}
