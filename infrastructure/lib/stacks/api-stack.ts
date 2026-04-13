import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { resourceName } from "../config/naming";

interface ApiStackProps extends cdk.StackProps {
  envName: string;
  otpSenderEmail?: string;
  auth: {
    userPool: cognito.UserPool;
    userPoolId: string;
    userPoolClientId: string;
  };
  data: {
    usersTable: dynamodb.Table;
    eventsTable: dynamodb.Table;
    registrationsTable: dynamodb.Table;
    attendanceTable: dynamodb.Table;
    seatCounterTable: dynamodb.Table;
    messagesTable: dynamodb.Table;
    otpTable: dynamodb.Table;
    wsConnectionsTable: dynamodb.Table;
  };
  storage: {
    mediaBucket: s3.Bucket;
  };
  notifications: {
    eventBus: events.EventBus;
  };
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const backendLambdaRoot = path.resolve(__dirname, "../../../backend/lambda");
    const lambdaEnvironment = {
      APP_ENV: props.envName,
      MEDIA_BUCKET_NAME: props.storage.mediaBucket.bucketName,
      USERS_TABLE: props.data.usersTable.tableName,
      EVENTS_TABLE: props.data.eventsTable.tableName,
      REGISTRATIONS_TABLE: props.data.registrationsTable.tableName,
      ATTENDANCE_TABLE: props.data.attendanceTable.tableName,
      SEAT_COUNTER_TABLE: props.data.seatCounterTable.tableName,
      MESSAGES_TABLE: props.data.messagesTable.tableName,
      OTP_TABLE: props.data.otpTable.tableName,
      WS_CONNECTIONS_TABLE: props.data.wsConnectionsTable.tableName,
      OTP_SENDER_EMAIL: props.otpSenderEmail ?? "no-reply@example.com",
      USER_POOL_ID: props.auth.userPoolId,
      USER_POOL_CLIENT_ID: props.auth.userPoolClientId,
      WS_MANAGEMENT_ENDPOINT: ""
    };

    const eventsHandler = this.createHandler("EventsHandler", "functions/events-handler/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const usersHandler = this.createHandler("UsersHandler", "functions/users-handler/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const registrationsHandler = this.createHandler("RegistrationsHandler", "functions/registrations-handler/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const attendanceHandler = this.createHandler("AttendanceHandler", "functions/attendance-handler/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const analyticsHandler = this.createHandler("AnalyticsHandler", "functions/analytics-handler/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const mediaHandler = this.createHandler("MediaPresignerHandler", "functions/media-presigner/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const notificationsHandler = this.createHandler("NotificationsHandler", "functions/notifications-handler/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const publicAuthHandler = this.createHandler("PublicAuthHandler", "functions/public-auth-handler/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const wsConnectHandler = this.createHandler("WsConnectHandler", "functions/ws-connect/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const wsDisconnectHandler = this.createHandler("WsDisconnectHandler", "functions/ws-disconnect/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);
    const wsDefaultHandler = this.createHandler("WsDefaultHandler", "functions/ws-default/src/index.handler", backendLambdaRoot, lambdaEnvironment, props.envName);

    props.data.usersTable.grantReadWriteData(eventsHandler);
    props.data.usersTable.grantReadWriteData(usersHandler);
    props.data.usersTable.grantReadWriteData(registrationsHandler);
    props.data.usersTable.grantReadWriteData(attendanceHandler);
    props.data.usersTable.grantReadWriteData(analyticsHandler);
    props.data.eventsTable.grantReadWriteData(eventsHandler);
    props.data.eventsTable.grantReadWriteData(registrationsHandler);
    props.data.eventsTable.grantReadWriteData(analyticsHandler);
    props.data.registrationsTable.grantReadWriteData(eventsHandler);
    props.data.registrationsTable.grantReadWriteData(registrationsHandler);
    props.data.registrationsTable.grantReadWriteData(attendanceHandler);
    props.data.registrationsTable.grantReadWriteData(analyticsHandler);
    props.data.attendanceTable.grantReadWriteData(registrationsHandler);
    props.data.attendanceTable.grantReadWriteData(attendanceHandler);
    props.data.attendanceTable.grantReadWriteData(analyticsHandler);
    props.data.seatCounterTable.grantReadWriteData(eventsHandler);
    props.data.seatCounterTable.grantReadWriteData(registrationsHandler);
    props.data.messagesTable.grantReadWriteData(usersHandler);
    props.data.usersTable.grantReadWriteData(publicAuthHandler);
    props.data.otpTable.grantReadWriteData(publicAuthHandler);
    props.data.wsConnectionsTable.grantReadWriteData(eventsHandler);
    props.data.wsConnectionsTable.grantReadWriteData(registrationsHandler);
    props.data.wsConnectionsTable.grantReadWriteData(attendanceHandler);
    props.data.wsConnectionsTable.grantReadWriteData(usersHandler);
    props.data.wsConnectionsTable.grantReadWriteData(wsConnectHandler);
    props.data.wsConnectionsTable.grantReadWriteData(wsDisconnectHandler);
    props.data.wsConnectionsTable.grantReadWriteData(wsDefaultHandler);
    props.storage.mediaBucket.grantReadWrite(mediaHandler);
    props.storage.mediaBucket.grantReadWrite(eventsHandler);
    publicAuthHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:InitiateAuth",
          "cognito-idp:ForgotPassword",
          "cognito-idp:ConfirmForgotPassword",
          "ses:SendEmail",
          "ses:SendRawEmail"
        ],
        resources: ["*"]
      })
    );
    usersHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup"
        ],
        resources: ["*"]
      })
    );

    new events.Rule(this, "NotificationsRule", {
      eventBus: props.notifications.eventBus,
      eventPattern: {
        source: ["ems.notifications"]
      },
      targets: [new targets.LambdaFunction(notificationsHandler)]
    });

    const api = new apigateway.RestApi(this, "EmsApi", {
      restApiName: resourceName(props.envName, "api"),
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["*"]
      }
    });

    const gatewayResponseHeaders = {
      "Access-Control-Allow-Origin": "'*'",
      "Access-Control-Allow-Headers": "'*'",
      "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'"
    };

    api.addGatewayResponse("Default4xxGatewayResponse", {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: gatewayResponseHeaders
    });

    api.addGatewayResponse("Default5xxGatewayResponse", {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: gatewayResponseHeaders
    });

    api.addGatewayResponse("UnauthorizedGatewayResponse", {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: gatewayResponseHeaders
    });

    api.addGatewayResponse("AccessDeniedGatewayResponse", {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: gatewayResponseHeaders
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [props.auth.userPool]
    });

    const methodOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    };

    const eventsResource = api.root.addResource("events");
    eventsResource.addMethod("GET", new apigateway.LambdaIntegration(eventsHandler), methodOptions);
    eventsResource.addMethod("POST", new apigateway.LambdaIntegration(eventsHandler), methodOptions);
    const eventById = eventsResource.addResource("{id}");
    eventById.addMethod("GET", new apigateway.LambdaIntegration(eventsHandler), methodOptions);
    eventById.addMethod("PUT", new apigateway.LambdaIntegration(eventsHandler), methodOptions);
    eventById.addResource("registrations").addMethod("GET", new apigateway.LambdaIntegration(eventsHandler), methodOptions);
    eventById.addResource("staff").addResource("join").addMethod("PUT", new apigateway.LambdaIntegration(eventsHandler), methodOptions);
    eventById.addResource("approve").addMethod("PUT", new apigateway.LambdaIntegration(eventsHandler), methodOptions);
    eventById.addResource("reject").addMethod("PUT", new apigateway.LambdaIntegration(eventsHandler), methodOptions);

    const registrationsResource = api.root.addResource("registrations");
    registrationsResource.addMethod("POST", new apigateway.LambdaIntegration(registrationsHandler), methodOptions);
    registrationsResource.addResource("me").addMethod("GET", new apigateway.LambdaIntegration(registrationsHandler), methodOptions);
    registrationsResource.addResource("{id}").addMethod("DELETE", new apigateway.LambdaIntegration(registrationsHandler), methodOptions);

    const attendanceResource = api.root.addResource("attendance");
    attendanceResource.addMethod("GET", new apigateway.LambdaIntegration(attendanceHandler), methodOptions);
    attendanceResource.addMethod("POST", new apigateway.LambdaIntegration(attendanceHandler), methodOptions);
    attendanceResource.addResource("me").addMethod("GET", new apigateway.LambdaIntegration(attendanceHandler), methodOptions);

    const usersResource = api.root.addResource("users");
    usersResource.addMethod("GET", new apigateway.LambdaIntegration(usersHandler), methodOptions);
    usersResource.addResource("{id}").addResource("approval").addMethod("PUT", new apigateway.LambdaIntegration(usersHandler), methodOptions);
    const messagesResource = usersResource.addResource("messages");
    messagesResource.addMethod("GET", new apigateway.LambdaIntegration(usersHandler), methodOptions);
    messagesResource.addMethod("POST", new apigateway.LambdaIntegration(usersHandler), methodOptions);
    const meResource = usersResource.addResource("me");
    meResource.addMethod("GET", new apigateway.LambdaIntegration(usersHandler), methodOptions);
    meResource.addMethod("PUT", new apigateway.LambdaIntegration(usersHandler), methodOptions);

    const analyticsOverview = api.root.addResource("analytics").addResource("overview");
    analyticsOverview.addMethod("GET", new apigateway.LambdaIntegration(analyticsHandler), methodOptions);

    const mediaPresign = api.root.addResource("media").addResource("presign");
    mediaPresign.addMethod("POST", new apigateway.LambdaIntegration(mediaHandler), methodOptions);

    const authResource = api.root.addResource("auth");
    authResource.addResource("request-otp").addMethod("POST", new apigateway.LambdaIntegration(publicAuthHandler));
    authResource.addResource("verify-otp").addMethod("POST", new apigateway.LambdaIntegration(publicAuthHandler));
    authResource.addResource("signup").addMethod("POST", new apigateway.LambdaIntegration(publicAuthHandler));
    authResource.addResource("signin").addMethod("POST", new apigateway.LambdaIntegration(publicAuthHandler));
    const passwordResetResource = authResource.addResource("password-reset");
    passwordResetResource.addResource("request").addMethod("POST", new apigateway.LambdaIntegration(publicAuthHandler));
    passwordResetResource.addResource("confirm").addMethod("POST", new apigateway.LambdaIntegration(publicAuthHandler));

    const wsApi = new apigatewayv2.WebSocketApi(this, "EmsWebSocketApi", {
      apiName: resourceName(props.envName, "ws-api"),
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration("WsConnectIntegration", wsConnectHandler)
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration("WsDisconnectIntegration", wsDisconnectHandler)
      },
      defaultRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration("WsDefaultIntegration", wsDefaultHandler)
      }
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, "EmsWsStage", {
      webSocketApi: wsApi,
      stageName: "prod",
      autoDeploy: true
    });

    const wsManagementEndpoint = `https://${wsApi.apiId}.execute-api.${this.region}.${this.urlSuffix}/${wsStage.stageName}`;
    [
      eventsHandler,
      usersHandler,
      registrationsHandler,
      attendanceHandler,
      analyticsHandler,
      mediaHandler,
      notificationsHandler,
      publicAuthHandler,
      wsConnectHandler,
      wsDisconnectHandler,
      wsDefaultHandler
    ].forEach((handler) => {
      handler.addEnvironment("WS_MANAGEMENT_ENDPOINT", wsManagementEndpoint);
      handler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["execute-api:ManageConnections"],
          resources: [
            `arn:${this.partition}:execute-api:${this.region}:${this.account}:${wsApi.apiId}/${wsStage.stageName}/POST/@connections/*`
          ]
        })
      );
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url
    });

    new cdk.CfnOutput(this, "RealtimeWsUrl", {
      value: `wss://${wsApi.apiId}.execute-api.${this.region}.${this.urlSuffix}/${wsStage.stageName}`
    });
  }

  private createHandler(
    id: string,
    handlerPath: string,
    assetPath: string,
    environment: Record<string, string>,
    envName: string
  ) {
    return new lambda.Function(this, id, {
      functionName: resourceName(envName, id.replace(/Handler$/, "").toLowerCase()),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: handlerPath,
      code: lambda.Code.fromAsset(assetPath),
      timeout: cdk.Duration.seconds(15),
      environment
    });
  }
}
