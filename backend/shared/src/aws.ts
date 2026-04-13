import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { S3Client } from "@aws-sdk/client-s3";
import { SESClient } from "@aws-sdk/client-ses";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "./env";

const region = env.awsRegion;

export const s3Client = new S3Client({ region });
export const cognitoClient = new CognitoIdentityProviderClient({ region });
export const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
export const sesClient = new SESClient({ region });
export const eventBridgeClient = new EventBridgeClient({ region });
export const wsManagementClient = new ApiGatewayManagementApiClient({
  region,
  endpoint: env.wsManagementEndpoint
});
