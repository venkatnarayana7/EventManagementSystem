import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { resourceName } from "../config/naming";

interface DatabaseStackProps extends cdk.StackProps {
  envName: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly registrationsTable: dynamodb.Table;
  public readonly attendanceTable: dynamodb.Table;
  public readonly seatCounterTable: dynamodb.Table;
  public readonly messagesTable: dynamodb.Table;
  public readonly otpTable: dynamodb.Table;
  public readonly wsConnectionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    this.usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: resourceName(props.envName, "users"),
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });

    this.eventsTable = new dynamodb.Table(this, "EventsTable", {
      tableName: resourceName(props.envName, "events"),
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });

    this.registrationsTable = new dynamodb.Table(this, "RegistrationsTable", {
      tableName: resourceName(props.envName, "registrations"),
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });
    this.registrationsTable.addGlobalSecondaryIndex({
      indexName: "StudentIdIndex",
      partitionKey: { name: "student_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "registered_at", type: dynamodb.AttributeType.STRING }
    });
    this.registrationsTable.addGlobalSecondaryIndex({
      indexName: "EventIdIndex",
      partitionKey: { name: "event_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "registered_at", type: dynamodb.AttributeType.STRING }
    });

    this.attendanceTable = new dynamodb.Table(this, "AttendanceTable", {
      tableName: resourceName(props.envName, "attendance"),
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });
    this.attendanceTable.addGlobalSecondaryIndex({
      indexName: "EventIdIndex",
      partitionKey: { name: "event_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "marked_at", type: dynamodb.AttributeType.STRING }
    });

    this.seatCounterTable = new dynamodb.Table(this, "SeatCounterTable", {
      tableName: resourceName(props.envName, "seat-counter"),
      partitionKey: { name: "event_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });

    this.messagesTable = new dynamodb.Table(this, "MessagesTable", {
      tableName: resourceName(props.envName, "messages"),
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });
    this.messagesTable.addGlobalSecondaryIndex({
      indexName: "RecipientIndex",
      partitionKey: { name: "recipient_user_id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "created_at", type: dynamodb.AttributeType.STRING }
    });

    this.otpTable = new dynamodb.Table(this, "OtpTable", {
      tableName: resourceName(props.envName, "auth-otp"),
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expires_at_epoch",
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });

    this.wsConnectionsTable = new dynamodb.Table(this, "WsConnectionsTable", {
      tableName: resourceName(props.envName, "ws-connections"),
      partitionKey: { name: "connection_id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true
      }
    });
    this.wsConnectionsTable.addGlobalSecondaryIndex({
      indexName: "PortalIndex",
      partitionKey: { name: "portal", type: dynamodb.AttributeType.STRING }
    });
    this.wsConnectionsTable.addGlobalSecondaryIndex({
      indexName: "UserIndex",
      partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING }
    });
    this.wsConnectionsTable.addGlobalSecondaryIndex({
      indexName: "EventIndex",
      partitionKey: { name: "subscribed_event_id", type: dynamodb.AttributeType.STRING }
    });

    new cdk.CfnOutput(this, "UsersTableName", {
      value: this.usersTable.tableName
    });

    new cdk.CfnOutput(this, "EventsTableName", {
      value: this.eventsTable.tableName
    });

    new cdk.CfnOutput(this, "RegistrationsTableName", {
      value: this.registrationsTable.tableName
    });

    new cdk.CfnOutput(this, "AttendanceTableName", {
      value: this.attendanceTable.tableName
    });

    new cdk.CfnOutput(this, "SeatCounterTableName", {
      value: this.seatCounterTable.tableName
    });

    new cdk.CfnOutput(this, "MessagesTableName", {
      value: this.messagesTable.tableName
    });

    new cdk.CfnOutput(this, "OtpTableName", {
      value: this.otpTable.tableName
    });

    new cdk.CfnOutput(this, "WsConnectionsTableName", {
      value: this.wsConnectionsTable.tableName
    });
  }
}
