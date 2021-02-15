interface ConnectProps extends JIFFClientOptions {
    computationId: string;
    hostname: string;
}
export declare function connect({ computationId, hostname, ...opts }: ConnectProps): JIFFClient;
interface ShareSecretsResult {
    datasetSecrets: SecretShare[];
    referenceSecret: SecretShare;
}
export declare function share_dataset_secrets(jiff_instance: JIFFClient, input_transform: number[], unit_transform: number[], secrets: number[], dataset_node_id: number, other_node_id: number): Promise<ShareSecretsResult>;
export declare function sort(secrets_in: SecretShare[]): SecretShare[];
export declare function ranking(secrets_sorted: SecretShare[], secrets: SecretShare[]): SecretShare[];
export declare function ranking_const(my_secret: SecretShare, secrets_sorted: SecretShare[]): SecretShare;
export {};
