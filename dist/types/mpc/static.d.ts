interface ConnectProps extends JIFFClientOptions {
    computationId: string;
    hostname: string;
    bignum?: unknown;
}
/**
 * Creates a new JIFF client using the SINE SDK defaults
 *
 * @param param0 Connection properties
 * @returns JIFFClient instance with {param0} props applied
 */
export declare function connect({ computationId, hostname, bignum, ...opts }: ConnectProps): JIFFClient;
/**
 * result of a {share_dataset_secrets} operation
 *
 */
export interface ShareSecretsResult {
    /** secret data shared by the "dataset node" */
    datasetSecrets: SecretShare[];
    /** secret data shared by the 2nd node submitting data to be compared against the dataset */
    referenceSecrets: SecretShare[];
}
/**
 * secret data sharing with 2 parties participating
 *
 * The "dataset" party (i.e. the one party supplying the majority of the data) is identified by
 * the node id {dataset_node_id}. The party supplying the to-be-compared data, is identified by {other_node_id}.
 *
 * The return value is destructured data for implementation simplicity and understandability.
 *
 * @param jiff_instance the JIFF instance to be used for low-level comms
 * @param secrets the secret data to be secret-shared with other nodes
 * @param dataset_node_id id of the node supplying the dataset
 * @param other_node_id id of the node supplying the reference data which is compared against the dataset node's data
 * @returns a ShareSecretsResult instance
 */
export declare function share_dataset_secrets(jiff_instance: JIFFClient, secrets: number[], dataset_node_id: number, other_node_id: number): Promise<ShareSecretsResult>;
/**
 * Performs dot product of 2 sectors
 *
 * @param lhs left hand vector
 * @param rhs right hand vector
 * @returns dot product of `lhs * rhs`
 */
export declare function dotproduct(lhs: SecretShare[], rhs: SecretShare[]): SecretShare;
export declare function sort(secrets_in: SecretShare[]): SecretShare[];
export declare function ranking(secrets_sorted: SecretShare[], secrets: SecretShare[]): SecretShare[];
export declare function ranking_const(my_secret: SecretShare, secrets_sorted: SecretShare[]): SecretShare;
export {};
