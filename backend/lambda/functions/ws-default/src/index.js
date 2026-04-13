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
        const payload = event.body ? JSON.parse(event.body) : {};
        if (String(payload.action || "") === "subscribe") {
            await (0, realtime_1.registerRealtimeConnection)({
                connectionId: event.requestContext.connectionId,
                portal: String(payload.portal || "unknown"),
                userId: String(payload.user_id || "anonymous"),
                eventId: String(payload.event_id || "global")
            });
        }
        return response(200, { message: "OK" });
    }
    catch (error) {
        console.error("[EMS WS Default Error]", error);
        return response(500, { message: "WS route failed" });
    }
}
