import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import { resourceName } from "../config/naming";

interface NotificationsStackProps extends cdk.StackProps {
  envName: string;
  sesDomain?: string;
}

export class NotificationsStack extends cdk.Stack {
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: NotificationsStackProps) {
    super(scope, id, props);

    this.eventBus = new events.EventBus(this, "NotificationsBus", {
      eventBusName: resourceName(props.envName, "notifications")
    });

    new sns.Topic(this, "BroadcastTopic", {
      topicName: resourceName(props.envName, "broadcast")
    });

    if (props.sesDomain) {
      new cdk.CfnOutput(this, "SesDomainToVerify", {
        value: props.sesDomain
      });
    }
  }
}
