export type SupportedHyperscalers = "aws" | "gcp" | "azure";

export interface TotoEnvironment {
    hyperscaler: SupportedHyperscalers;
    hyperscalerConfiguration: GCPConfiguration | AWSConfiguration | AzureConfiguration;
}

export interface GCPConfiguration {
    gcpProjectId: string;
}

export interface AWSConfiguration {
    environment: "dev" | "test" | "prod";
    awsRegion: string;
}
export interface AzureConfiguration {
    azureRegion: string;
}