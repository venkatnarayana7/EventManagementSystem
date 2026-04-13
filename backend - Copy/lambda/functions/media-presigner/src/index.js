"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const aws_1 = require("../../../shared/src/aws");
const auth_1 = require("../../../shared/src/auth");
const env_1 = require("../../../shared/src/env");
const http_1 = require("../../../shared/src/http");
const response_1 = require("../../../shared/src/response");
const validation_1 = require("../../../shared/src/validation");
async function handler(event) {
    try {
        if (event.httpMethod === "OPTIONS") {
            return (0, auth_1.optionsResponse)();
        }
        if (event.httpMethod !== "POST" || event.path !== "/media/presign") {
            return (0, response_1.json)(404, { message: "Route not found" });
        }
        const auth = (0, auth_1.getAuthContext)(event);
        (0, auth_1.ensureRole)(auth.role, ["admin", "teacher"]);
        const data = validation_1.presignRequestSchema.parse((0, http_1.parseJson)(event.body));
        const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
        const key = `events/${data.eventId}/${Date.now()}-${sanitizedFilename}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: env_1.env.mediaBucketName,
            Key: key,
            ContentType: data.contentType
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(aws_1.s3Client, command, { expiresIn: 300 });
        return (0, response_1.json)(200, {
            uploadUrl,
            key,
            publicUrl: `https://${env_1.env.mediaBucketName}.s3.${env_1.env.awsRegion}.amazonaws.com/${key}`
        });
    }
    catch (error) {
        return (0, http_1.handleError)(error);
    }
}
