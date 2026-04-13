"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const realtime_1 = require("../../../shared/src/realtime");
function response(statusCode, body) {
    return {
        statusCode,
        body: JSON.stringify(body)
    };
}
async function handler(event) {
    try {
        await (0, realtime_1.registerRealtimeConnection)({
            connectionId: event.requestContext.connectionId,
            portal: String(event.queryStringParameters?.portal || "unknown"),
            userId: String(event.queryStringParameters?.user_id || "anonymous"),
            eventId: String(event.queryStringParameters?.event_id || "global")
        });
        return response(200, { message: "Connected" });
    }
    catch (error) {
        console.error("[EMS WS Connect Error]", error);
        return response(500, { message: "Connection failed" });
    }
}
