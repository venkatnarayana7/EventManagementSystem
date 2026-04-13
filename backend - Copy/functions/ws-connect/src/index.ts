import type { APIGatewayProxyResult, APIGatewayEventWebsocketRequestContextV2 } from "aws-lambda";
import { registerRealtimeConnection } from "../../../shared/src/realtime";

interface WebSocketEvent {
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext: APIGatewayEventWebsocketRequestContextV2;
}

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(body)
  };
}

export async function handler(event: WebSocketEvent): Promise<APIGatewayProxyResult> {
  try {
    await registerRealtimeConnection({
      connectionId: event.requestContext.connectionId,
      portal: String(event.queryStringParameters?.portal || "unknown"),
      userId: String(event.queryStringParameters?.user_id || "anonymous"),
      eventId: String(event.queryStringParameters?.event_id || "global")
    });

    return response(200, { message: "Connected" });
  } catch (error) {
    console.error("[EMS WS Connect Error]", error);
    return response(500, { message: "Connection failed" });
  }
}
