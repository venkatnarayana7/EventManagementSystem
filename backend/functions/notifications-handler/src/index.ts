import type { EventBridgeEvent } from "aws-lambda";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "../../../shared/src/aws";

interface NotificationDetail {
  subject: string;
  body: string;
  recipients: string[];
  sourceEmail: string;
}

export async function handler(event: EventBridgeEvent<string, NotificationDetail>) {
  const detail = event.detail;

  if (!detail?.recipients?.length) {
    return { delivered: 0 };
  }

  await Promise.all(
    detail.recipients.map((recipient) =>
      sesClient.send(
        new SendEmailCommand({
          Source: detail.sourceEmail,
          Destination: { ToAddresses: [recipient] },
          Message: {
            Subject: { Data: detail.subject },
            Body: {
              Text: { Data: detail.body }
            }
          }
        })
      )
    )
  );

  return { delivered: detail.recipients.length };
}

