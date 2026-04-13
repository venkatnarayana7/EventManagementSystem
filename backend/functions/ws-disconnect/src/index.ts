import type { APIGatewayProxyResult, APIGatewayEventWebsocketRequestContextV2 } from "aws-lambda";
import { unregisterRealtimeConnection } from "../../../shared/src/realtime";

interface WebSocketEvent {
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
    await unregisterRealtimeConnection(event.requestContext.connectionId);
    return response(200, { message: "Disconnected" });
  } catch (error) {
    console.error("[EMS WS Disconnect Error]", error);
    return response(500, { message: "Disconnect failed" });
  }
}
