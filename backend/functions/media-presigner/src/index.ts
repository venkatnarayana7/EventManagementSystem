import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../../../shared/src/aws";
import { ensureRole, getAuthContext, optionsResponse } from "../../../shared/src/auth";
import { env } from "../../../shared/src/env";
import { handleError, parseJson } from "../../../shared/src/http";
import { json } from "../../../shared/src/response";
import { presignRequestSchema } from "../../../shared/src/validation";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return optionsResponse();
    }

    if (event.httpMethod !== "POST" || event.path !== "/media/presign") {
      return json(404, { message: "Route not found" });
    }

    const auth = getAuthContext(event);
    ensureRole(auth.role, ["admin", "teacher"]);
    const data = presignRequestSchema.parse(parseJson(event.body));

    const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const key = `events/${data.eventId}/${Date.now()}-${sanitizedFilename}`;
    const command = new PutObjectCommand({
      Bucket: env.mediaBucketName,
      Key: key,
      ContentType: data.contentType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return json(200, {
      uploadUrl,
      key,
      publicUrl: `https://${env.mediaBucketName}.s3.${env.awsRegion}.amazonaws.com/${key}`
    });
  } catch (error) {
    return handleError(error);
  }
}

