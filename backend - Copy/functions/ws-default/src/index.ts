import type { APIGatewayProxyResult, APIGatewayEventWebsocketRequestContextV2 } from "aws-lambda";
import { registerRealtimeConnection } from "../../../shared/src/realtime";

interface WebSocketEvent {
  body?: string | null;
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
    const payload = event.body ? JSON.parse(event.body) as Record<string, unknown> : {};
    if (String(payload.action || "") === "subscribe") {
      await registerRealtimeConnection({
        connectionId: event.requestContext.connectionId,
        portal: String(payload.portal || "unknown"),
        userId: String(payload.user_id || "anonymous"),
        eventId: String(payload.event_id || "global")
      });
    }

    return response(200, { message: "OK" });
  } catch (error) {
    console.error("[EMS WS Default Error]", error);
    return response(500, { message: "WS route failed" });
  }
}
