import { DeleteCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoClient, wsManagementClient } from "./aws";
import { env } from "./env";

export interface RealtimeConnectionRecord {
  connection_id: string;
  portal: string;
  user_id: string;
  subscribed_event_id: string;
  connected_at: string;
  ttl: number;
}

type BroadcastTarget =
  | { type: "all" }
  | { type: "portal"; portal: string }
  | { type: "user"; userId: string }
  | { type: "event"; eventId: string };

async function deleteConnection(connectionId: string) {
  await dynamoClient.send(
    new DeleteCommand({
      TableName: env.wsConnectionsTable,
      Key: { connection_id: connectionId }
    })
  );
}

async function scanAllConnections() {
  const items: RealtimeConnectionRecord[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new ScanCommand({
        TableName: env.wsConnectionsTable,
        ExclusiveStartKey: lastEvaluatedKey
      })
    );

    items.push(...((response.Items as RealtimeConnectionRecord[] | undefined) ?? []));
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function listTargetConnections(target: BroadcastTarget) {
  if (target.type === "portal") {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: env.wsConnectionsTable,
        IndexName: "PortalIndex",
        KeyConditionExpression: "portal = :portal",
        ExpressionAttributeValues: {
          ":portal": target.portal
        }
      })
    );
    return (response.Items as RealtimeConnectionRecord[] | undefined) ?? [];
  }

  if (target.type === "user") {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: env.wsConnectionsTable,
        IndexName: "UserIndex",
        KeyConditionExpression: "user_id = :userId",
        ExpressionAttributeValues: {
          ":userId": target.userId
        }
      })
    );
    return (response.Items as RealtimeConnectionRecord[] | undefined) ?? [];
  }

  if (target.type === "event") {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: env.wsConnectionsTable,
        IndexName: "EventIndex",
        KeyConditionExpression: "subscribed_event_id = :eventId",
        ExpressionAttributeValues: {
          ":eventId": target.eventId
        }
      })
    );
    return (response.Items as RealtimeConnectionRecord[] | undefined) ?? [];
  }

  return scanAllConnections();
}

export async function registerRealtimeConnection(input: {
  connectionId: string;
  portal: string;
  userId: string;
  eventId?: string | null;
}) {
  const now = Date.now();
  await dynamoClient.send(
    new PutCommand({
      TableName: env.wsConnectionsTable,
      Item: {
        connection_id: input.connectionId,
        portal: input.portal || "unknown",
        user_id: input.userId || "anonymous",
        subscribed_event_id: input.eventId || "global",
        connected_at: new Date(now).toISOString(),
        ttl: Math.floor(now / 1000) + 7200
      } satisfies RealtimeConnectionRecord
    })
  );
}

export async function unregisterRealtimeConnection(connectionId: string) {
  await deleteConnection(connectionId);
}

export async function broadcastRealtime(
  messageType: string,
  payload: Record<string, unknown>,
  target: BroadcastTarget = { type: "all" }
) {
  const connections = await listTargetConnections(target);
  if (!connections.length) {
    return;
  }

  const message = JSON.stringify({
    type: messageType,
    data: payload,
    timestamp: Date.now()
  });

  await Promise.all(
    connections.map(async function (connection) {
      try {
        await wsManagementClient.send(
          new PostToConnectionCommand({
            ConnectionId: connection.connection_id,
            Data: message
          })
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;
        const name =
          typeof error === "object" && error && "name" in error
            ? String((error as { name?: string }).name)
            : "";

        if (statusCode === 410 || /gone/i.test(name)) {
          await deleteConnection(connection.connection_id);
          return;
        }

        console.error("[EMS Realtime Broadcast Error]", {
          messageType,
          connectionId: connection.connection_id,
          error
        });
      }
    })
  );
}
