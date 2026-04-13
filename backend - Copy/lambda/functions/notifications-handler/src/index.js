"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_ses_1 = require("@aws-sdk/client-ses");
const aws_1 = require("../../../shared/src/aws");
async function handler(event) {
    const detail = event.detail;
    if (!detail?.recipients?.length) {
        return { delivered: 0 };
    }
    await Promise.all(detail.recipients.map((recipient) => aws_1.sesClient.send(new client_ses_1.SendEmailCommand({
        Source: detail.sourceEmail,
        Destination: { ToAddresses: [recipient] },
        Message: {
            Subject: { Data: detail.subject },
            Body: {
                Text: { Data: detail.body }
            }
        }
    }))));
    return { delivered: detail.recipients.length };
}
