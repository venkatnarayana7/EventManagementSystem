"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRealtimeConnection = registerRealtimeConnection;
exports.unregisterRealtimeConnection = unregisterRealtimeConnection;
exports.broadcastRealtime = broadcastRealtime;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const aws_1 = require("./aws");
const env_1 = require("./env");
async function deleteConnection(connectionId) {
    await aws_1.dynamoClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: env_1.env.wsConnectionsTable,
        Key: { connection_id: connectionId }
    }));
}
async function scanAllConnections() {
    const items = [];
    let lastEvaluatedKey;
    do {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: env_1.env.wsConnectionsTable,
            ExclusiveStartKey: lastEvaluatedKey
        }));
        items.push(...(response.Items ?? []));
        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items;
}
async function listTargetConnections(target) {
    if (target.type === "portal") {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: env_1.env.wsConnectionsTable,
            IndexName: "PortalIndex",
            KeyConditionExpression: "portal = :portal",
            ExpressionAttributeValues: {
                ":portal": target.portal
            }
        }));
        return response.Items ?? [];
    }
    if (target.type === "user") {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: env_1.env.wsConnectionsTable,
            IndexName: "UserIndex",
            KeyConditionExpression: "user_id = :userId",
            ExpressionAttributeValues: {
                ":userId": target.userId
            }
        }));
        return response.Items ?? [];
    }
    if (target.type === "event") {
        const response = await aws_1.dynamoClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: env_1.env.wsConnectionsTable,
            IndexName: "EventIndex",
            KeyConditionExpression: "subscribed_event_id = :eventId",
            ExpressionAttributeValues: {
                ":eventId": target.eventId
            }
        }));
        return response.Items ?? [];
    }
    return scanAllConnections();
}
async function registerRealtimeConnection(input) {
    const now = Date.now();
    await aws_1.dynamoClient.send(new lib_dynamodb_1.PutCommand({
        TableName: env_1.env.wsConnectionsTable,
        Item: {
            connection_id: input.connectionId,
            portal: input.portal || "unknown",
            user_id: input.userId || "anonymous",
            subscribed_event_id: input.eventId || "global",
            connected_at: new Date(now).toISOString(),
            ttl: Math.floor(now / 1000) + 7200
        }
    }));
}
async function unregisterRealtimeConnection(connectionId) {
    await deleteConnection(connectionId);
}
async function broadcastRealtime(messageType, payload, target = { type: "all" }) {
    const connections = await listTargetConnections(target);
    if (!connections.length) {
        return;
    }
    const message = JSON.stringify({
        type: messageType,
        data: payload,
        timestamp: Date.now()
    });
    await Promise.all(connections.map(async function (connection) {
        try {
            await aws_1.wsManagementClient.send(new client_apigatewaymanagementapi_1.PostToConnectionCommand({
                ConnectionId: connection.connection_id,
                Data: message
            }));
        }
        catch (error) {
            const statusCode = typeof error === "object" && error && "statusCode" in error
                ? Number(error.statusCode)
                : undefined;
            const name = typeof error === "object" && error && "name" in error
                ? String(error.name)
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
    }));
}
