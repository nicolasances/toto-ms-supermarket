
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { SecretsManager as AWSSecretsManager, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Logger } from '../logger/TotoLogger';
import { AWSConfiguration, AzureConfiguration, GCPConfiguration, SupportedHyperscalers, TotoEnvironment } from '..';

/**
 * This class is a utility class to extract secrets from different clouds. 
 * It supports:
 * - GCP Secret Manager
 * - AWS Secrets Manager
 */
export class SecretsManager {

    private provider: SupportedHyperscalers;
    private hyperscalerConfiguration: GCPConfiguration | AWSConfiguration | AzureConfiguration;

    constructor(hyperscaler: TotoEnvironment) {
        this.provider = hyperscaler.hyperscaler;
        this.hyperscalerConfiguration = hyperscaler.hyperscalerConfiguration;
    }

    getSecret(secretName: string): Promise<string> {

        const logger = Logger.getInstance();

        try {
            
            if (this.provider == "aws") return this.getSecretFromAWS(secretName);
            else return this.getSecretFromGCP(secretName);

        } catch (error) {
            
            logger.compute("INIT", `Error retrieving secret ${secretName} from ${this.provider} Secret Manager: ${error}`, "error");

            throw error;
        }
    }

    /**
     * This function retrieves a secret from AWS Secrets Manager. 
     * Credentials are assumed to be provided by the environment (e.g. EC2 role, ECS role, etc)
     * 
     * @param environment the environment where the code is running (e.g. dev, test)
     * @param secretName the name of the secret in AWS Secrets Manager.
     */
    private getSecretFromAWS = async (secretName: string): Promise<string> => {

        const logger = Logger.getInstance();

        const environment = (this.hyperscalerConfiguration as AWSConfiguration).environment;
    
        const fullSecretName = `${environment}/${secretName}`;
    
        logger.compute("INIT", `Retrieving secret ${fullSecretName} from AWS Secrets Manager`);
    
        const client = new AWSSecretsManager({ region: process.env.AWS_REGION || 'eu-north-1' });
    
        const command = new GetSecretValueCommand({ SecretId: fullSecretName });
    
        const response = await client.send(command);
    
        if (!response || !response.SecretString) throw new Error(`No secret found for name ${fullSecretName}`);
    
        return response.SecretString;
    }
    
    /**
     * This function retrieves a secret from GCP Secret Manager. 
     * Credentials are assumed to be provided by the environment (e.g. GCE, GKE, Cloud Run, etc)
     * 
     * @param environment the environment where the code is running (e.g. dev, test). In GCP that is the GCP project ID!
     * @param secretName the name of the secret in GCP Secret Manager
     */
    private getSecretFromGCP = async (secretName: string): Promise<string> => {

        const logger = Logger.getInstance();

        const gcpPID = (this.hyperscalerConfiguration as GCPConfiguration).gcpProjectId;

        logger.compute("INIT", `Retrieving secret ${secretName} from GCP Secret Manager in project ${gcpPID}`);
    
        const client = new SecretManagerServiceClient();
    
        const [version] = await client.accessSecretVersion({ name: `projects/${gcpPID}/secrets/${secretName}/versions/latest` });
    
        if (!version || !version.payload || !version.payload.data) throw new Error(`No secret found for name ${secretName}`);
    
        return version.payload.data.toString();
    }   
}
