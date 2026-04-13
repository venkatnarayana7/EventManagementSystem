import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "node:path";
import { Construct } from "constructs";
import { resourceName } from "../config/naming";

interface AuthStackProps extends cdk.StackProps {
  envName: string;
  otpSenderEmail?: string;
  data: {
    usersTable: dynamodb.Table;
    otpTable: dynamodb.Table;
  };
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: resourceName(props.envName, "user-pool"),
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        fullname: { required: true, mutable: true },
        email: { required: true, mutable: false }
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
        department: new cognito.StringAttribute({ mutable: true }),
        rollNo: new cognito.StringAttribute({ mutable: true }),
        empId: new cognito.StringAttribute({ mutable: true })
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true
      },
      mfa: cognito.Mfa.OPTIONAL
    });

    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: resourceName(props.envName, "web-client"),
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      generateSecret: false,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1)
    });

    ["Admins", "Teachers", "Students"].forEach((groupName) => {
      new cognito.CfnUserPoolGroup(this, `${groupName}Group`, {
        groupName,
        userPoolId: this.userPool.userPoolId
      });
    });

    const backendLambdaRoot = path.resolve(__dirname, "../../../backend/lambda");
    const postConfirmationHandler = new lambda.Function(this, "PostConfirmationHandler", {
      functionName: resourceName(props.envName, "post-confirmation"),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "functions/auth-post-confirmation/src/index.handler",
      code: lambda.Code.fromAsset(backendLambdaRoot),
      timeout: cdk.Duration.seconds(15),
      environment: {
        APP_ENV: props.envName,
        MEDIA_BUCKET_NAME: "unused",
        USERS_TABLE: props.data.usersTable.tableName,
        EVENTS_TABLE: "unused",
        REGISTRATIONS_TABLE: "unused",
        ATTENDANCE_TABLE: "unused",
        SEAT_COUNTER_TABLE: "unused",
        OTP_TABLE: props.data.otpTable.tableName,
        OTP_SENDER_EMAIL: props.otpSenderEmail ?? "no-reply@example.com",
        USER_POOL_ID: "unused",
        USER_POOL_CLIENT_ID: "unused"
      }
    });

    props.data.usersTable.grantReadWriteData(postConfirmationHandler);
    props.data.otpTable.grantReadWriteData(postConfirmationHandler);
    postConfirmationHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminAddUserToGroup"],
        resources: ["*"]
      })
    );

    this.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationHandler);

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId
    });
  }
}
