#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DatabaseStack } from "../lib/stacks/database-stack";
import { AuthStack } from "../lib/stacks/auth-stack";
import { StorageStack } from "../lib/stacks/storage-stack";
import { NotificationsStack } from "../lib/stacks/notifications-stack";
import { ApiStack } from "../lib/stacks/api-stack";

const app = new cdk.App();
const envName = app.node.tryGetContext("env") ?? process.env.EMS_ENV ?? "dev";
const stackEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "ap-south-1"
};

const databaseStack = new DatabaseStack(app, "DatabaseStack", {
  env: stackEnv,
  envName
});

const authStack = new AuthStack(app, "AuthStack", {
  env: stackEnv,
  envName,
  otpSenderEmail: process.env.EMS_OTP_SENDER_EMAIL,
  data: {
    usersTable: databaseStack.usersTable,
    otpTable: databaseStack.otpTable
  }
});

const storageStack = new StorageStack(app, "StorageStack", {
  env: stackEnv,
  envName
});

const notificationsStack = new NotificationsStack(app, "NotificationsStack", {
  env: stackEnv,
  envName,
  sesDomain: process.env.EMS_SES_DOMAIN
});

new ApiStack(app, "ApiStack", {
  env: stackEnv,
  envName,
  auth: {
    userPool: authStack.userPool,
    userPoolId: authStack.userPool.userPoolId,
    userPoolClientId: authStack.userPoolClient.userPoolClientId
  },
  otpSenderEmail: process.env.EMS_OTP_SENDER_EMAIL,
  data: {
    usersTable: databaseStack.usersTable,
    eventsTable: databaseStack.eventsTable,
    registrationsTable: databaseStack.registrationsTable,
    attendanceTable: databaseStack.attendanceTable,
    seatCounterTable: databaseStack.seatCounterTable,
    messagesTable: databaseStack.messagesTable,
    otpTable: databaseStack.otpTable,
    wsConnectionsTable: databaseStack.wsConnectionsTable
  },
  storage: {
    mediaBucket: storageStack.mediaBucket
  },
  notifications: {
    eventBus: notificationsStack.eventBus
  }
});
