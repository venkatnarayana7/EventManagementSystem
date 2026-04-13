"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsManagementClient = exports.eventBridgeClient = exports.sesClient = exports.dynamoClient = exports.cognitoClient = exports.s3Client = void 0;
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const client_s3_1 = require("@aws-sdk/client-s3");
const client_ses_1 = require("@aws-sdk/client-ses");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const env_1 = require("./env");
const region = env_1.env.awsRegion;
exports.s3Client = new client_s3_1.S3Client({ region });
exports.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region });
exports.dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({ region }));
exports.sesClient = new client_ses_1.SESClient({ region });
exports.eventBridgeClient = new client_eventbridge_1.EventBridgeClient({ region });
exports.wsManagementClient = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({
    region,
    endpoint: env_1.env.wsManagementEndpoint
});
